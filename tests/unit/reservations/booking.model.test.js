const mongoose = require('mongoose')
const { Booking } = require('../../../src/modules/reservations/models/booking.model')
const validData = () => ({
  passengerId: new mongoose.Types.ObjectId(),
  departureId: new mongoose.Types.ObjectId(),
  seatNumber: 2,
  passengerName: 'Sara Amrani',
  priceCents: 5000,
  ticketCode: 'b77e0d92-2d6c-44a3-b280-60924ab08596'
})
const invalidFields = async (data) => {
  try {
    await new Booking(data).validate()
    return []
  } catch (err) {
    return Object.keys(err.errors)
  }
}
describe('Booking : index', () => {
  const indexes = Booking.schema.indexes()
  const find = (fields) => indexes.find(([keys]) => JSON.stringify(keys) === JSON.stringify(fields))
  it('ticketCode est unique', () => {
    expect(find({ ticketCode: 1 })[1].unique).toBe(true)
  })
  it('un seul siège occupé par départ', () => {
    const options = find({ departureId: 1, seatNumber: 1 })[1]
    expect(options.unique).toBe(true)
    expect(options.partialFilterExpression).toEqual({ occupiesSeat: true })
  })
  it('une seule réservation active par voyageur et par départ', () => {
    const options = find({ departureId: 1, passengerId: 1 })[1]
    expect(options.unique).toBe(true)
    expect(options.partialFilterExpression).toEqual({ occupiesSeat: true })
  })
})
describe('Booking : validation', () => {
  it('crée une réservation CONFIRMED qui occupe le siège', async () => {
    const booking = new Booking(validData())
    await booking.validate()
    expect(booking.status).toBe('CONFIRMED')
    expect(booking.occupiesSeat).toBe(true)
    expect(booking.cancelReason).toBeNull()
    expect(booking.boardedAt).toBeNull()
  })
  it.each([0, -1, 1.5])('rejette seatNumber = %s', async (seatNumber) => {
    expect(await invalidFields({ ...validData(), seatNumber })).toContain('seatNumber')
  })
  it.each([-1, 12.5])('rejette priceCents = %s', async (priceCents) => {
    expect(await invalidFields({ ...validData(), priceCents })).toContain('priceCents')
  })
  it("rejette un nom composé d'espaces", async () => {
    expect(await invalidFields({ ...validData(), passengerName: '   ' })).toContain('passengerName')
  })
  it('rejette un statut inconnu', async () => {
    expect(await invalidFields({ ...validData(), status: 'PENDING' })).toContain('status')
  })
  it("rejette une cause d'annulation inconnue", async () => {
    expect(await invalidFields({ ...validData(), cancelReason: 'AUTRE' })).toContain('cancelReason')
  })
})