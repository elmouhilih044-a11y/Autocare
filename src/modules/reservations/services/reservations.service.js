const { BOOKING_STATUS, CANCEL_REASON } = require('../models/booking.constants')
const errors = require('./reservations.errors')
const { toBookingView } = require('./booking.view')
class ReservationsService {
  constructor({ bookingRepository, catalogueApi, ticketCodeGenerator, clock, transactionRunner }) {
    this.bookingRepository = bookingRepository
    this.catalogueApi = catalogueApi
    this.ticketCodeGenerator = ticketCodeGenerator
    this.clock = clock
    this.transactionRunner = transactionRunner
  }
 
  createBooking(user, departureId, seatNumber) {
    return this.transactionRunner(async (session) => {
      const departure = await this.catalogueApi.getDeparture(departureId, { session })
      if (departure.status !== 'OPEN' || departure.departureAt <= this.clock.now()) throw errors.departureNotBookable()
      if (!departure.seatPlan.includes(seatNumber)) throw errors.seatNotInPlan()
     
      await this.catalogueApi.guardDeparture(departureId, { session })
      if (await this.bookingRepository.hasActiveBooking(departureId, user.id, { session })) throw errors.alreadyBooked()
      if (await this.bookingRepository.isSeatOccupied(departureId, seatNumber, { session })) throw errors.seatUnavailable()
      try {
        const booking = await this.bookingRepository.create({
          passengerId: user.id,
          departureId,
          seatNumber,
          passengerName: user.fullName,
          priceCents: departure.fareCents,
          ticketCode: this.ticketCodeGenerator.generate()
        }, { session })
        return toBookingView(booking)
      } catch (err) {
        if (err.duplicate === 'SEAT') throw errors.seatUnavailable()
        if (err.duplicate === 'PASSENGER') throw errors.alreadyBooked()
        throw err
      }
    })
  }

  cancelBooking(user, bookingId) {
    return this.transactionRunner(async (session) => {
      const booking = await this.bookingRepository.findOwnedById(bookingId, user.id, { session })
      if (!booking) throw errors.bookingNotFound()
      if (booking.status !== BOOKING_STATUS.CONFIRMED) throw errors.bookingNotCancellable()
      await this.guardOpenDeparture(booking.departureId, session)
      const cancelled = await this.bookingRepository.cancelIfConfirmed(bookingId, CANCEL_REASON.CUSTOMER, { session })
      if (!cancelled) throw errors.bookingNotCancellable()
      return toBookingView(cancelled)
    })
  }

  async guardOpenDeparture(departureId, session) {
    try {
      await this.catalogueApi.guardDeparture(departureId, { session })
    } catch (err) {
      if (err.code === 'DEPARTURE_NOT_BOOKABLE') throw errors.bookingNotCancellable()
      throw err
    }
  }
}
module.exports = { ReservationsService }