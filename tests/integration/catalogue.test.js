const request = require('supertest');
const createApp = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Line = require('../../src/modules/catalogue/models/line.model');
const Coach = require('../../src/modules/catalogue/models/coach.model');
const Departure = require('../../src/modules/catalogue/models/departure.model');
const City = require('../../src/modules/catalogue/models/city.model');
const Stop = require('../../src/modules/catalogue/models/stop.model');

describe('Catalogue Module (Integration Tests)', () => {
  let app;

  const adminAuth = { Authorization: 'Bearer admin' };
  const agentAuth = { Authorization: 'Bearer agent' };
  const passengerAuth = { Authorization: 'Bearer passenger' };

  // Future dates
  const futureDeparture = new Date(Date.now() + 86400000).toISOString();
  const futureArrival = new Date(Date.now() + 93600000).toISOString();

  beforeAll(async () => {
    await connectTestDB();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  // ---------------------------------------------------------------------------
  // 1. CRUD Lines & Coaches
  // ---------------------------------------------------------------------------
  describe('CRUD Lines & Coaches', () => {
    it('POST /lines should require Admin role (403 for passenger, 201 for admin)', async () => {
      // Passenger forbidden
      const forbiddenRes = await request(app)
        .post('/api/v1/lines')
        .set(passengerAuth)
        .send({
          code: 'LINE-TEST',
          label: 'Casablanca to Rabat',
        });
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.code).toBe('FORBIDDEN');

      // Admin allowed
      const adminRes = await request(app)
        .post('/api/v1/lines')
        .set(adminAuth)
        .send({
          code: '  line-test  ',
          label: 'Casablanca to Rabat',
        });
      expect(adminRes.status).toBe(201);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.code).toBe('LINE-TEST'); // Normalized to uppercase & trimmed
      expect(adminRes.body.data.isArchived).toBe(false);
    });

    it('POST /lines should return 409 Conflict on duplicate line code', async () => {
      await request(app)
        .post('/api/v1/lines')
        .set(adminAuth)
        .send({ code: 'LINE-DUP', label: 'Route 1' });

      const dupRes = await request(app)
        .post('/api/v1/lines')
        .set(adminAuth)
        .send({ code: '  line-dup  ', label: 'Route 2' });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe('DUPLICATE_CODE');
    });

    it('PATCH /lines/:id should update line and validate empty body / archived', async () => {
      const line = await Line.create({ code: 'LINE-UP', label: 'Initial' });

      // Empty patch -> 400
      const emptyRes = await request(app)
        .patch(`/api/v1/lines/${line._id}`)
        .set(adminAuth)
        .send({});
      expect(emptyRes.status).toBe(400);

      // Valid patch -> 200
      const patchRes = await request(app)
        .patch(`/api/v1/lines/${line._id}`)
        .set(adminAuth)
        .send({ label: 'Updated Label' });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.label).toBe('Updated Label');
    });

    it('DELETE /lines/:id should soft delete line (204 No Content, isArchived: true)', async () => {
      const line = await Line.create({
        code: 'LINE-DEL',
        label: 'To be archived',
      });

      const res = await request(app)
        .delete(`/api/v1/lines/${line._id}`)
        .set(adminAuth);

      expect(res.status).toBe(204);

      const updatedLine = await Line.findById(line._id);
      expect(updatedLine.isArchived).toBe(true);
    });

    it('POST /coaches should create coach and handle normalization & duplicates', async () => {
      // Create coach as Admin
      const res = await request(app)
        .post('/api/v1/coaches')
        .set(adminAuth)
        .send({
          registration: '  12345-a-6  ',
          seatNumbers: [1, 2, 3, 4, 5],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.registration).toBe('12345-A-6');
      expect(res.body.data.isArchived).toBe(false);

      // Duplicate registration returns 409
      const dupRes = await request(app)
        .post('/api/v1/coaches')
        .set(adminAuth)
        .send({
          registration: '12345-a-6',
          seatNumbers: [1, 2],
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe('DUPLICATE_REGISTRATION');
    });

    it('PATCH /coaches/:id should update coach', async () => {
      const coach = await Coach.create({ registration: 'C-UP', seatNumbers: [1, 2] });

      const patchRes = await request(app)
        .patch(`/api/v1/coaches/${coach._id}`)
        .set(adminAuth)
        .send({ seatNumbers: [1, 2, 3, 4] });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.seatNumbers).toEqual([1, 2, 3, 4]);
    });

    it('DELETE /coaches/:id should soft delete coach (204 No Content, isArchived: true)', async () => {
      const coach = await Coach.create({
        registration: 'COACH-DEL',
        seatNumbers: [1, 2],
      });

      const res = await request(app)
        .delete(`/api/v1/coaches/${coach._id}`)
        .set(adminAuth);

      expect(res.status).toBe(204);

      const updatedCoach = await Coach.findById(coach._id);
      expect(updatedCoach.isArchived).toBe(true);
    });

    it('GET /lines and GET /coaches should return paginated data', async () => {
      await Line.create([
        { code: 'L1', label: 'Route 1' },
        { code: 'L2', label: 'Route 2' },
      ]);

      const linesRes = await request(app).get('/api/v1/lines?page=1&limit=10');
      expect(linesRes.status).toBe(200);
      expect(linesRes.body.data.length).toBe(2);
      expect(linesRes.body.pagination.total).toBe(2);

      await Coach.create({ registration: 'C1', seatNumbers: [1, 2] });
      const coachesRes = await request(app)
        .get('/api/v1/coaches?page=1&limit=10')
        .set(adminAuth);
      expect(coachesRes.status).toBe(200);
      expect(coachesRes.body.data.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Departure Creation & Snapshot Immutability
  // ---------------------------------------------------------------------------
  describe('Departure Creation & Snapshot Immutability', () => {
    it('POST /departures creates departure with frozen snapshots and status OPEN', async () => {
      const city = await City.create({ name: 'Casablanca' });
      const stop = await Stop.create({ name: 'Gare Casa-Port', cityId: city._id });

      const line = await Line.create({
        code: 'LINE-EXP',
        label: 'Casablanca - Tanger Express',
        stopIds: [stop._id],
      });

      const coach = await Coach.create({
        registration: '54321-B-2',
        seatNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
      });

      const res = await request(app)
        .post('/api/v1/departures')
        .set(adminAuth)
        .send({
          lineId: line._id,
          coachId: coach._id,
          departureAt: futureDeparture,
          arrivalAt: futureArrival,
          fareCents: 18000,
        });

      expect(res.status).toBe(201);
      const dep = res.body.data;
      expect(dep.status).toBe('OPEN');
      expect(dep.revision).toBe(0);
      expect(dep.fareCents).toBe(18000);

      // Verify frozen snapshots
      expect(dep.lineSnapshot.code).toBe('LINE-EXP');
      expect(dep.lineSnapshot.label).toBe('Casablanca - Tanger Express');
      expect(dep.coachSnapshot.registration).toBe('54321-B-2');
      expect(dep.coachSnapshot.seatPlan).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(dep.seatPlan).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('POST /departures should reject archived Line or Coach with 409', async () => {
      const activeLine = await Line.create({ code: 'L-ACT', label: 'Active' });
      const archivedLine = await Line.create({ code: 'L-ARC', label: 'Archived', isArchived: true });

      const activeCoach = await Coach.create({ registration: 'C-ACT', seatNumbers: [1, 2] });
      const archivedCoach = await Coach.create({
        registration: 'C-ARC',
        seatNumbers: [1, 2],
        isArchived: true,
      });

      // Try with archived line
      const resArchivedLine = await request(app)
        .post('/api/v1/departures')
        .set(adminAuth)
        .send({
          lineId: archivedLine._id,
          coachId: activeCoach._id,
          departureAt: futureDeparture,
          arrivalAt: futureArrival,
          fareCents: 10000,
        });
      expect(resArchivedLine.status).toBe(409);
      expect(resArchivedLine.body.code).toBe('LINE_ARCHIVED');

      // Try with archived coach
      const resArchivedCoach = await request(app)
        .post('/api/v1/departures')
        .set(adminAuth)
        .send({
          lineId: activeLine._id,
          coachId: archivedCoach._id,
          departureAt: futureDeparture,
          arrivalAt: futureArrival,
          fareCents: 10000,
        });
      expect(resArchivedCoach.status).toBe(409);
      expect(resArchivedCoach.body.code).toBe('COACH_ARCHIVED');
    });

    it('Snapshot Immutability: modifying or archiving the line/coach does NOT affect departure snapshots', async () => {
      const line = await Line.create({
        code: 'LINE-IMMUTABLE',
        label: 'Original Label',
      });

      const coach = await Coach.create({
        registration: 'REG-IMMUTABLE',
        seatNumbers: [1, 2, 3, 4],
      });

      // 1. Create Departure
      const createRes = await request(app)
        .post('/api/v1/departures')
        .set(adminAuth)
        .send({
          lineId: line._id,
          coachId: coach._id,
          departureAt: futureDeparture,
          arrivalAt: futureArrival,
          fareCents: 15000,
        });
      expect(createRes.status).toBe(201);
      const depId = createRes.body.data._id;

      // 2. Modify original Line (change label and archive it)
      await Line.findByIdAndUpdate(line._id, {
        label: 'Completely Changed Label',
        code: 'LINE-CHANGED',
        isArchived: true,
      });

      // 3. Modify original Coach (change seats and archive it)
      await Coach.findByIdAndUpdate(coach._id, {
        registration: 'REG-CHANGED',
        seatNumbers: [99, 100],
        isArchived: true,
      });

      // 4. Fetch the departure again and assert snapshots are UNCHANGED
      const fetchRes = await request(app).get(`/api/v1/departures/${depId}`);
      expect(fetchRes.status).toBe(200);

      const fetchedDep = fetchRes.body.data;
      expect(fetchedDep.lineSnapshot.code).toBe('LINE-IMMUTABLE');
      expect(fetchedDep.lineSnapshot.label).toBe('Original Label');
      expect(fetchedDep.coachSnapshot.registration).toBe('REG-IMMUTABLE');
      expect(fetchedDep.coachSnapshot.seatPlan).toEqual([1, 2, 3, 4]);
      expect(fetchedDep.seatPlan).toEqual([1, 2, 3, 4]);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. State Machine Transitions & Concurrency Guard
  // ---------------------------------------------------------------------------
  describe('State Machine Transitions & Guard', () => {
    let departureId;

    beforeEach(async () => {
      const line = await Line.create({ code: 'LINE-SM', label: 'State Machine Line' });
      const coach = await Coach.create({ registration: 'COACH-SM', seatNumbers: [1, 2, 3] });
      const departure = await Departure.create({
        lineId: line._id,
        coachId: coach._id,
        lineSnapshot: { code: line.code, label: line.label, stops: [], stopIds: [] },
        coachSnapshot: { registration: coach.registration, seatPlan: [1, 2, 3] },
        seatPlan: [1, 2, 3],
        departureAt: new Date(Date.now() + 3600000),
        arrivalAt: new Date(Date.now() + 7200000),
        fareCents: 12000,
        status: 'OPEN',
        revision: 0,
      });
      departureId = departure._id.toString();
    });

    it('valid transitions: OPEN -> BOARDING (start-boarding) -> DEPARTED (depart)', async () => {
      // 1. OPEN -> BOARDING (/start-boarding, Agent/Admin)
      const boardingRes = await request(app)
        .post(`/api/v1/departures/${departureId}/start-boarding`)
        .set(agentAuth);

      expect(boardingRes.status).toBe(200);
      expect(boardingRes.body.data.status).toBe('BOARDING');
      expect(boardingRes.body.data.revision).toBe(1);

      // Verify DB state
      const depAfterBoarding = await Departure.findById(departureId);
      expect(depAfterBoarding.status).toBe('BOARDING');
      expect(depAfterBoarding.revision).toBe(1);

      // 2. BOARDING -> DEPARTED (/depart, Agent/Admin)
      const departRes = await request(app)
        .post(`/api/v1/departures/${departureId}/depart`)
        .set(agentAuth);

      expect(departRes.status).toBe(200);
      expect(departRes.body.data.status).toBe('DEPARTED');
      expect(departRes.body.data.revision).toBe(2);

      // Verify DB state
      const depAfterDepart = await Departure.findById(departureId);
      expect(depAfterDepart.status).toBe('DEPARTED');
      expect(depAfterDepart.revision).toBe(2);
    });

    it('invalid transitions should return 409 Conflict', async () => {
      // 1. Cannot skip to DEPARTED directly from OPEN
      const invalidDepartRes = await request(app)
        .post(`/api/v1/departures/${departureId}/depart`)
        .set(agentAuth);
      expect(invalidDepartRes.status).toBe(409);
      expect(invalidDepartRes.body.code).toBe('INVALID_DEPARTURE_TRANSITION');

      // 2. Start boarding
      await request(app)
        .post(`/api/v1/departures/${departureId}/start-boarding`)
        .set(agentAuth);

      // 3. Cannot start boarding again when already BOARDING
      const duplicateBoardingRes = await request(app)
        .post(`/api/v1/departures/${departureId}/start-boarding`)
        .set(agentAuth);
      expect(duplicateBoardingRes.status).toBe(409);
      expect(duplicateBoardingRes.body.code).toBe('INVALID_DEPARTURE_TRANSITION');

      // 4. Depart
      await request(app)
        .post(`/api/v1/departures/${departureId}/depart`)
        .set(agentAuth);

      // 5. Cannot cancel or re-board an already DEPARTED departure
      const cancelDepartedRes = await request(app)
        .post(`/api/v1/departures/${departureId}/cancel`)
        .set(adminAuth);
      expect(cancelDepartedRes.status).toBe(409);
      expect(cancelDepartedRes.body.code).toBe('INVALID_DEPARTURE_TRANSITION');

      const reBoardRes = await request(app)
        .post(`/api/v1/departures/${departureId}/start-boarding`)
        .set(agentAuth);
      expect(reBoardRes.status).toBe(409);
    });

    it('cancellation: OPEN -> CANCELLED via /cancel (Admin only)', async () => {
      // Passenger cannot cancel
      const forbiddenRes = await request(app)
        .post(`/api/v1/departures/${departureId}/cancel`)
        .set(passengerAuth);
      expect(forbiddenRes.status).toBe(403);

      // Admin can cancel
      const cancelRes = await request(app)
        .post(`/api/v1/departures/${departureId}/cancel`)
        .set(adminAuth);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
      expect(cancelRes.body.data.revision).toBe(1);

      // Cannot transition from CANCELLED to BOARDING
      const boardingRes = await request(app)
        .post(`/api/v1/departures/${departureId}/start-boarding`)
        .set(agentAuth);
      expect(boardingRes.status).toBe(409);
      expect(boardingRes.body.code).toBe('INVALID_DEPARTURE_TRANSITION');
    });
  });
});
