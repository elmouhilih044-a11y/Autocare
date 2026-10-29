const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../../src/app');
const container = require('../../src/bootstrap/container');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Line = require('../../src/modules/catalogue/models/line.model');
const Coach = require('../../src/modules/catalogue/models/coach.model');
const Departure = require('../../src/modules/catalogue/models/departure.model');
const { Booking } = require('../../src/modules/reservations/models/booking.model');

jest.setTimeout(120000);

describe('M3 — annulation de départ, billets, droits réservations', () => {
  let app;
  let reservationsApi;

  const saraId = new mongoose.Types.ObjectId().toString();
  const omarId = new mongoose.Types.ObjectId().toString();

  const adminAuth = { Authorization: 'Bearer admin' };
  const agentAuth = { Authorization: 'Bearer agent' };
  const saraAuth = {
    Authorization: `Bearer passenger:${saraId}`,
    'x-user-name': 'Sara Amrani',
  };
  const omarAuth = {
    Authorization: `Bearer passenger:${omarId}`,
    'x-user-name': 'Omar Alaoui',
  };

  async function seedOpenDeparture() {
    const line = await Line.create({
      code: 'M3-LINE',
      label: 'Casa - Rabat',
      stopIds: [],
    });
    const coach = await Coach.create({
      registration: 'BUS-M3',
      seatNumbers: [1, 2, 3, 4],
    });
    const departure = await Departure.create({
      lineId: line._id,
      coachId: coach._id,
      lineSnapshot: { code: line.code, label: line.label, stops: [], stopIds: [] },
      coachSnapshot: { registration: coach.registration, seatPlan: [...coach.seatNumbers] },
      seatPlan: [...coach.seatNumbers],
      departureAt: new Date(Date.now() + 86400000),
      arrivalAt: new Date(Date.now() + 93600000),
      fareCents: 4500,
      status: 'OPEN',
    });
    return departure;
  }

  beforeAll(async () => {
    await connectTestDB();
    await Booking.init();
    app = createApp();
    reservationsApi = container.resolve('reservationsApi');
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('POST /departures/:id/cancel (admin) annule le départ et les réservations confirmées', async () => {
    const departure = await seedOpenDeparture();

    const bookSara = await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(saraAuth)
      .send({ seatNumber: 1 });
    expect(bookSara.status).toBe(201);

    const bookOmar = await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(omarAuth)
      .send({ seatNumber: 2 });
    expect(bookOmar.status).toBe(201);

    const forbidden = await request(app)
      .post(`/api/v1/departures/${departure._id}/cancel`)
      .set(agentAuth);
    expect(forbidden.status).toBe(403);

    const cancelRes = await request(app)
      .post(`/api/v1/departures/${departure._id}/cancel`)
      .set(adminAuth);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.cancelledBookings).toBe(2);

    const bookings = await Booking.find({ departureId: departure._id });
    expect(bookings).toHaveLength(2);
    bookings.forEach((b) => {
      expect(b.status).toBe('CANCELLED');
      expect(b.occupiesSeat).toBe(false);
      expect(b.cancelReason).toBe('DEPARTURE');
    });
  });

  it('après annulation du départ, aucun billet n’est utilisable', async () => {
    const departure = await seedOpenDeparture();

    const bookRes = await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(saraAuth)
      .send({ seatNumber: 3 });
    expect(bookRes.status).toBe(201);
    const ticketCode = bookRes.body.data.ticketCode;

    await request(app)
      .post(`/api/v1/departures/${departure._id}/cancel`)
      .set(adminAuth)
      .expect(200);

    await expect(
      reservationsApi.consumeTicket({
        ticketCode,
        departureId: departure._id.toString(),
        now: new Date(),
      })
    ).rejects.toMatchObject({ code: 'TICKET_NOT_VALID', statusCode: 409 });
  });

  it('un voyageur ne voit pas les réservations d’un autre', async () => {
    const departure = await seedOpenDeparture();

    await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(saraAuth)
      .send({ seatNumber: 1 })
      .expect(201);

    await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(omarAuth)
      .send({ seatNumber: 2 })
      .expect(201);

    const saraList = await request(app).get('/api/v1/bookings').set(saraAuth);
    expect(saraList.status).toBe(200);
    expect(saraList.body.data).toHaveLength(1);
    expect(saraList.body.data[0].passengerName).toBe('Sara Amrani');

    const omarList = await request(app).get('/api/v1/bookings').set(omarAuth);
    expect(omarList.status).toBe(200);
    expect(omarList.body.data).toHaveLength(1);
    expect(omarList.body.data[0].passengerName).toBe('Omar Alaoui');

    const adminList = await request(app).get('/api/v1/bookings').set(adminAuth);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(2);

    const agentList = await request(app).get('/api/v1/bookings').set(agentAuth);
    expect(agentList.status).toBe(403);
  });

  it('GET /departures/:id/seats affiche libre ou occupé', async () => {
    const departure = await seedOpenDeparture();

    await request(app)
      .post(`/api/v1/departures/${departure._id}/bookings`)
      .set(saraAuth)
      .send({ seatNumber: 2 })
      .expect(201);

    const seatsRes = await request(app).get(`/api/v1/departures/${departure._id}/seats`);
    expect(seatsRes.status).toBe(200);
    expect(seatsRes.body.data.seats).toEqual([
      { number: 1, status: 'FREE' },
      { number: 2, status: 'OCCUPIED' },
      { number: 3, status: 'FREE' },
      { number: 4, status: 'FREE' },
    ]);
  });
});
