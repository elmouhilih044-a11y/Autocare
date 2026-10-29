const { ReservationsService } = require('../../../src/modules/reservations/services/reservations.service')
const { AppError } = require('../../../src/shared/errors')
const session = { id: 'session-1' }
const now = new Date('2027-03-15T08:00:00Z')
const user = { id: 'user-1', fullName: 'Sara Amrani' }
const openDeparture = () => ({ _id: 'dep-1', status: 'OPEN', departureAt: new Date('2027-03-15T09:00:00Z'), fareCents: 5000, seatPlan: [1, 2, 3, 4] })
const confirmedBooking = () => ({ _id: 'book-1', departureId: 'dep-1', passengerId: 'user-1', seatNumber: 2, status: 'CONFIRMED', ticketCode: 'code-1' })
function setup() {
  const bookingRepository = {
    hasActiveBooking: jest.fn().mockResolvedValue(false),
    isSeatOccupied: jest.fn().mockResolvedValue(false),
    create: jest.fn(async (data) => ({ _id: 'book-1', ...data, status: 'CONFIRMED', cancelReason: null, boardedAt: null })),
    findOwnedById: jest.fn().mockResolvedValue(confirmedBooking()),
    cancelIfConfirmed: jest.fn(async () => ({ ...confirmedBooking(), status: 'CANCELLED', cancelReason: 'CUSTOMER' }))
  }
  const catalogueApi = {
    getDeparture: jest.fn().mockResolvedValue(openDeparture()),
    guardDeparture: jest.fn().mockResolvedValue({})
  }
  const ticketCodeGenerator = { generate: () => 'code-1' }
  const clock = { now: () => now }
  const transactionRunner = jest.fn((work) => work(session))
  const service = new ReservationsService({ bookingRepository, catalogueApi, ticketCodeGenerator, clock, transactionRunner })
  return { service, bookingRepository, catalogueApi, transactionRunner }
}
const refusal = (code, statusCode) => expect.objectContaining({ code, statusCode })
describe('ReservationsService.createBooking', () => {
  it('réserve un siège : prix et nom copiés côté serveur, code généré', async () => {
    const { service, bookingRepository, catalogueApi, transactionRunner } = setup()
    const view = await service.createBooking(user, 'dep-1', 2)
    expect(transactionRunner).toHaveBeenCalledTimes(1)
    expect(catalogueApi.getDeparture).toHaveBeenCalledWith('dep-1', { session })
    expect(catalogueApi.guardDeparture).toHaveBeenCalledWith('dep-1', { session })
    expect(bookingRepository.create).toHaveBeenCalledWith({
      passengerId: 'user-1', departureId: 'dep-1', seatNumber: 2, passengerName: 'Sara Amrani', priceCents: 5000, ticketCode: 'code-1'
    }, { session })
    expect(view).toMatchObject({ seatNumber: 2, passengerName: 'Sara Amrani', priceCents: 5000, status: 'CONFIRMED', ticketCode: 'code-1' })
  })
  it('propage le 404 d\'un départ inconnu', async () => {
    const { service, catalogueApi, bookingRepository } = setup()
    catalogueApi.getDeparture.mockRejectedValue(new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found'))
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('RESOURCE_NOT_FOUND', 404))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it.each(['BOARDING', 'DEPARTED', 'CANCELLED'])('refuse un départ %s', async (status) => {
    const { service, catalogueApi, bookingRepository } = setup()
    catalogueApi.getDeparture.mockResolvedValue({ ...openDeparture(), status })
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('DEPARTURE_NOT_BOOKABLE', 409))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it("refuse quand l'heure prévue est atteinte", async () => {
    const { service, catalogueApi, bookingRepository } = setup()
    catalogueApi.getDeparture.mockResolvedValue({ ...openDeparture(), departureAt: now })
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('DEPARTURE_NOT_BOOKABLE', 409))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it('refuse un siège absent du plan', async () => {
    const { service, bookingRepository } = setup()
    await expect(service.createBooking(user, 'dep-1', 9)).rejects.toEqual(refusal('SEAT_NOT_IN_PLAN', 400))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it('refuse un voyageur déjà réservé sur ce départ', async () => {
    const { service, bookingRepository } = setup()
    bookingRepository.hasActiveBooking.mockResolvedValue(true)
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('ALREADY_BOOKED', 409))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it('refuse un siège occupé', async () => {
    const { service, bookingRepository } = setup()
    bookingRepository.isSeatOccupied.mockResolvedValue(true)
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('SEAT_UNAVAILABLE', 409))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it("ne réserve pas si la garde du départ échoue", async () => {
    const { service, catalogueApi, bookingRepository } = setup()
    catalogueApi.guardDeparture.mockRejectedValue(new AppError('DEPARTURE_NOT_BOOKABLE', 409, 'x'))
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('DEPARTURE_NOT_BOOKABLE', 409))
    expect(bookingRepository.create).not.toHaveBeenCalled()
  })
  it('transforme un doublon de siège en 409 SEAT_UNAVAILABLE', async () => {
    const { service, bookingRepository } = setup()
    bookingRepository.create.mockRejectedValue(Object.assign(new Error('E11000'), { duplicate: 'SEAT' }))
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('SEAT_UNAVAILABLE', 409))
  })
  it('transforme un doublon de voyageur en 409 ALREADY_BOOKED', async () => {
    const { service, bookingRepository } = setup()
    bookingRepository.create.mockRejectedValue(Object.assign(new Error('E11000'), { duplicate: 'PASSENGER' }))
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toEqual(refusal('ALREADY_BOOKED', 409))
  })
  it('laisse passer les autres erreurs', async () => {
    const { service, bookingRepository } = setup()
    const error = new Error('panne')
    bookingRepository.create.mockRejectedValue(error)
    await expect(service.createBooking(user, 'dep-1', 2)).rejects.toBe(error)
  })
})
describe('ReservationsService.cancelBooking', () => {
  it('annule : cause CUSTOMER, départ gardé dans la session', async () => {
    const { service, bookingRepository, catalogueApi } = setup()
    const view = await service.cancelBooking(user, 'book-1')
    expect(bookingRepository.findOwnedById).toHaveBeenCalledWith('book-1', 'user-1', { session })
    expect(catalogueApi.guardDeparture).toHaveBeenCalledWith('dep-1', { session })
    expect(bookingRepository.cancelIfConfirmed).toHaveBeenCalledWith('book-1', 'CUSTOMER', { session })
    expect(view).toMatchObject({ status: 'CANCELLED', cancelReason: 'CUSTOMER' })
  })
  it("renvoie 404 pour la réservation d'un autre voyageur", async () => {
    const { service, bookingRepository, catalogueApi } = setup()
    bookingRepository.findOwnedById.mockResolvedValue(null)
    await expect(service.cancelBooking(user, 'book-1')).rejects.toEqual(refusal('RESOURCE_NOT_FOUND', 404))
    expect(catalogueApi.guardDeparture).not.toHaveBeenCalled()
  })
  it.each(['CANCELLED', 'BOARDED'])('refuse une réservation %s', async (status) => {
    const { service, bookingRepository } = setup()
    bookingRepository.findOwnedById.mockResolvedValue({ ...confirmedBooking(), status })
    await expect(service.cancelBooking(user, 'book-1')).rejects.toEqual(refusal('BOOKING_NOT_CANCELLABLE', 409))
    expect(bookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
  })
  it("refuse quand le départ n'est plus OPEN", async () => {
    const { service, catalogueApi, bookingRepository } = setup()
    catalogueApi.guardDeparture.mockRejectedValue(new AppError('DEPARTURE_NOT_BOOKABLE', 409, 'x'))
    await expect(service.cancelBooking(user, 'book-1')).rejects.toEqual(refusal('BOOKING_NOT_CANCELLABLE', 409))
    expect(bookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
  })
  it('laisse passer les autres erreurs de la garde', async () => {
    const { service, catalogueApi } = setup()
    catalogueApi.guardDeparture.mockRejectedValue(new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found'))
    await expect(service.cancelBooking(user, 'book-1')).rejects.toEqual(refusal('RESOURCE_NOT_FOUND', 404))
  })
  it("refuse quand l'état a changé entre la lecture et l'écriture", async () => {
    const { service, bookingRepository } = setup()
    bookingRepository.cancelIfConfirmed.mockResolvedValue(null)
    await expect(service.cancelBooking(user, 'book-1')).rejects.toEqual(refusal('BOOKING_NOT_CANCELLABLE', 409))
  })
})