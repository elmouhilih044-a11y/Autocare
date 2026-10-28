const { BookingRepository } = require('../../../src/modules/reservations/repositories/booking.repository')
const duplicateError = (keyPattern) => Object.assign(new Error('E11000'), { code: 11000, keyPattern })
const createRepository = (create) => new BookingRepository({ bookingModel: { create } })
describe('BookingRepository.create', () => {
  it('passe la session et retourne un objet simple', async () => {
    const session = { id: 'session-1' }
    const create = jest.fn().mockResolvedValue([{ toObject: () => ({ seatNumber: 2 }) }])
    const result = await createRepository(create).create({ seatNumber: 2 }, { session })
    expect(create).toHaveBeenCalledWith([{ seatNumber: 2 }], { session })
    expect(result).toEqual({ seatNumber: 2 })
  })
  it.each([
    [{ departureId: 1, seatNumber: 1 }, 'SEAT'],
    [{ departureId: 1, passengerId: 1 }, 'PASSENGER'],
    [{ ticketCode: 1 }, 'TICKET_CODE']
  ])('marque le doublon %j comme %s', async (keyPattern, expected) => {
    const error = duplicateError(keyPattern)
    await expect(createRepository(jest.fn().mockRejectedValue(error)).create({})).rejects.toBe(error)
    expect(error.duplicate).toBe(expected)
  })
  it('ne marque pas les autres erreurs', async () => {
    const error = new Error('autre')
    await expect(createRepository(jest.fn().mockRejectedValue(error)).create({})).rejects.toBe(error)
    expect(error.duplicate).toBeNull()
  })
})