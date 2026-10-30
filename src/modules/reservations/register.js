const { createReservationsApi } = require('./index');
const { asClass, asFunction, asValue } = require('awilix')
const { Booking } = require('./models/booking.model')
const { BookingRepository } = require('./repositories/booking.repository')
const { TicketCodeGenerator } = require('./services/ticket-code-generator')
const { ReservationsService } = require('./services/reservations.service')
const { ReservationsController } = require('./controllers/reservations.controller')
const createReservationsRouter = require('./routes/reservations.routes')
function register(container) {
  container.register({
    reservationsApi: asFunction(createReservationsApi).singleton(),
    bookingModel: asValue(Booking),
    bookingRepository: asClass(BookingRepository).singleton(),
    ticketCodeGenerator: asClass(TicketCodeGenerator).singleton(),
    reservationsService: asClass(ReservationsService).singleton(),
    reservationsController: asClass(ReservationsController).singleton(),
    reservationsRouter: asFunction(createReservationsRouter).singleton()
  })
}
module.exports = { register }