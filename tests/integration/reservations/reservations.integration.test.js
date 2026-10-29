const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')
const container = require('../../../src/bootstrap/container')
const { Booking } = require('../../../src/modules/reservations/models/booking.model')
const Departure = require('../../../src/modules/catalogue/models/departure.model')
jest.setTimeout(120000)
let replSet
let reservationsService
let catalogueApi
const newUser = (fullName) => ({ id: new mongoose.Types.ObjectId().toString(), fullName })
const createDeparture = (overrides = {}) => Departure.create({
  lineId: new mongoose.Types.ObjectId(),
  coachId: new mongoose.Types.ObjectId(),
  lineSnapshot: { code: 'YSF-SAF', label: 'Youssoufia - Safi', stops: [], stopIds: [] },
  coachSnapshot: { registration: 'BUS-001', seatPlan: [1, 2, 3, 4] },
  seatPlan: [1, 2, 3, 4],
  departureAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  arrivalAt: new Date(Date.now() + 26 * 60 * 60 * 1000),
  fareCents: 5000,
  ...overrides
})
const occupiedCount = (departureId, seatNumber) => Booking.countDocuments({ departureId, seatNumber, occupiesSeat: true })
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(replSet.getUri())
  await Booking.init()
  await Departure.init()
  reservationsService = container.resolve('reservationsService')
  catalogueApi = container.resolve('catalogueApi')
})
afterAll(async () => {
  await mongoose.disconnect()
  await replSet.stop()
})
beforeEach(async () => {
  await Booking.deleteMany({})
  await Departure.deleteMany({})
})
describe('Réservation du même siège en parallèle', () => {
  it('deux voyageurs : une réussite et un 409, une seule occupation', async () => {
    const departure = await createDeparture()
    const results = await Promise.allSettled([
      reservationsService.createBooking(newUser('Sara Amrani'), departure.id, 2),
      reservationsService.createBooking(newUser('Omar Alaoui'), departure.id, 2)
    ])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ code: 'SEAT_UNAVAILABLE', statusCode: 409 })
    expect(await occupiedCount(departure._id, 2)).toBe(1)
    expect(await Booking.countDocuments({ departureId: departure._id })).toBe(1)
  })
  it('cinq voyageurs : une réussite et quatre refus', async () => {
    const departure = await createDeparture()
    const users = ['A', 'B', 'C', 'D', 'E'].map((name) => newUser(name))
    const results = await Promise.allSettled(users.map((user) => reservationsService.createBooking(user, departure.id, 3)))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    results.filter((r) => r.status === 'rejected').forEach((r) => {
      expect(r.reason).toMatchObject({ code: 'SEAT_UNAVAILABLE', statusCode: 409 })
    })
    expect(await occupiedCount(departure._id, 3)).toBe(1)
  })
  it('le même voyageur ne peut pas réserver deux sièges sur un départ', async () => {
    const departure = await createDeparture()
    const user = newUser('Sara Amrani')
    await reservationsService.createBooking(user, departure.id, 1)
    await expect(reservationsService.createBooking(user, departure.id, 2)).rejects.toMatchObject({ code: 'ALREADY_BOOKED', statusCode: 409 })
    expect(await Booking.countDocuments({ departureId: departure._id })).toBe(1)
  })
})
describe('Départ non réservable', () => {
  it.each(['BOARDING', 'DEPARTED', 'CANCELLED'])('refuse un départ %s', async (status) => {
    const departure = await createDeparture({ status })
    await expect(reservationsService.createBooking(newUser('Sara'), departure.id, 2)).rejects.toMatchObject({ code: 'DEPARTURE_NOT_BOOKABLE', statusCode: 409 })
    expect(await Booking.countDocuments({})).toBe(0)
  })
  it('refuse un départ dont l\'heure est passée', async () => {
    const departure = await createDeparture({ departureAt: new Date(Date.now() - 60 * 1000), arrivalAt: new Date(Date.now() + 60 * 60 * 1000) })
    await expect(reservationsService.createBooking(newUser('Sara'), departure.id, 2)).rejects.toMatchObject({ code: 'DEPARTURE_NOT_BOOKABLE', statusCode: 409 })
    expect(await Booking.countDocuments({})).toBe(0)
  })
  it('refuse un siège absent du plan', async () => {
    const departure = await createDeparture()
    await expect(reservationsService.createBooking(newUser('Sara'), departure.id, 9)).rejects.toMatchObject({ code: 'SEAT_NOT_IN_PLAN', statusCode: 400 })
  })
  it('renvoie 404 pour un départ inconnu', async () => {
    await expect(reservationsService.createBooking(newUser('Sara'), new mongoose.Types.ObjectId().toString(), 2)).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND', statusCode: 404 })
  })
})
describe('Annulation individuelle', () => {
  it('conserve la réservation en CANCELLED et libère le siège', async () => {
    const departure = await createDeparture()
    const sara = newUser('Sara Amrani')
    const booked = await reservationsService.createBooking(sara, departure.id, 2)
    const cancelled = await reservationsService.cancelBooking(sara, booked.id.toString())
    expect(cancelled).toMatchObject({ status: 'CANCELLED', cancelReason: 'CUSTOMER', ticketCode: booked.ticketCode })
    const stored = await Booking.findById(booked.id)
    expect(stored.occupiesSeat).toBe(false)
    expect(await occupiedCount(departure._id, 2)).toBe(0)
    const rebooked = await reservationsService.createBooking(newUser('Omar Alaoui'), departure.id, 2)
    expect(rebooked.ticketCode).not.toBe(booked.ticketCode)
    expect(await Booking.countDocuments({ departureId: departure._id })).toBe(2)
  })
  it('permet au même voyageur de réserver à nouveau avec un nouveau billet', async () => {
    const departure = await createDeparture()
    const sara = newUser('Sara Amrani')
    const first = await reservationsService.createBooking(sara, departure.id, 2)
    await reservationsService.cancelBooking(sara, first.id.toString())
    const second = await reservationsService.createBooking(sara, departure.id, 2)
    expect(second.id.toString()).not.toBe(first.id.toString())
    expect(second.ticketCode).not.toBe(first.ticketCode)
  })
  it("renvoie 404 pour la réservation d'un autre voyageur", async () => {
    const departure = await createDeparture()
    const booked = await reservationsService.createBooking(newUser('Sara'), departure.id, 2)
    await expect(reservationsService.cancelBooking(newUser('Omar'), booked.id.toString())).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND', statusCode: 404 })
    expect((await Booking.findById(booked.id)).status).toBe('CONFIRMED')
  })
  it('refuse une seconde annulation', async () => {
    const departure = await createDeparture()
    const sara = newUser('Sara')
    const booked = await reservationsService.createBooking(sara, departure.id, 2)
    await reservationsService.cancelBooking(sara, booked.id.toString())
    await expect(reservationsService.cancelBooking(sara, booked.id.toString())).rejects.toMatchObject({ code: 'BOOKING_NOT_CANCELLABLE', statusCode: 409 })
  })
  it("refuse l'annulation après l'ouverture de l'embarquement", async () => {
    const departure = await createDeparture()
    const sara = newUser('Sara')
    const booked = await reservationsService.createBooking(sara, departure.id, 2)
    await catalogueApi.startBoarding(departure.id)
    await expect(reservationsService.cancelBooking(sara, booked.id.toString())).rejects.toMatchObject({ code: 'BOOKING_NOT_CANCELLABLE', statusCode: 409 })
    expect((await Booking.findById(booked.id)).status).toBe('CONFIRMED')
  })
})
describe('Réservation et ouverture de l\'embarquement en parallèle', () => {
  it('la réservation réussit avant la fermeture ou est refusée après, jamais de 500', async () => {
    for (let i = 0; i < 15; i++) {
      const departure = await createDeparture()
      const results = await Promise.allSettled([
        reservationsService.createBooking(newUser('Sara'), departure.id, 2),
        catalogueApi.startBoarding(departure.id)
      ])
      const [booking, boarding] = results
      expect(boarding.status).toBe('fulfilled')
      expect((await Departure.findById(departure._id)).status).toBe('BOARDING')
      const stored = await Booking.countDocuments({ departureId: departure._id })
      if (booking.status === 'fulfilled') {
        expect(stored).toBe(1)
      } else {
        expect(booking.reason).toMatchObject({ code: 'DEPARTURE_NOT_BOOKABLE', statusCode: 409 })
        expect(stored).toBe(0)
      }
    }
  })
  it('l\'annulation et l\'ouverture de l\'embarquement en parallèle restent cohérentes', async () => {
    for (let i = 0; i < 10; i++) {
      const departure = await createDeparture()
      const sara = newUser('Sara')
      const booked = await reservationsService.createBooking(sara, departure.id, 2)
      const [cancel, boarding] = await Promise.allSettled([
        reservationsService.cancelBooking(sara, booked.id.toString()),
        catalogueApi.startBoarding(departure.id)
      ])
      expect(boarding.status).toBe('fulfilled')
      const stored = await Booking.findById(booked.id)
      if (cancel.status === 'fulfilled') {
        expect(stored.status).toBe('CANCELLED')
      } else {
        expect(cancel.reason).toMatchObject({ code: 'BOOKING_NOT_CANCELLABLE', statusCode: 409 })
        expect(stored.status).toBe('CONFIRMED')
      }
    }
  })
})