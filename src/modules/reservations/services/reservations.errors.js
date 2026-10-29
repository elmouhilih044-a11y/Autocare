const { AppError } = require('../../../shared/errors')
const invalidInput = (message) => new AppError('VALIDATION_ERROR', 400, message)
const seatNotInPlan = () => new AppError('SEAT_NOT_IN_PLAN', 400, "Ce siège n'existe pas dans le plan du départ.")
const bookingNotFound = () => new AppError('RESOURCE_NOT_FOUND', 404, 'Réservation introuvable.')
const seatUnavailable = () => new AppError('SEAT_UNAVAILABLE', 409, 'Ce siège est déjà réservé.')
const alreadyBooked = () => new AppError('ALREADY_BOOKED', 409, 'Vous avez déjà une réservation sur ce départ.')
const departureNotBookable = () => new AppError('DEPARTURE_NOT_BOOKABLE', 409, "Ce départ n'est plus ouvert à la réservation.")
const bookingNotCancellable = () => new AppError('BOOKING_NOT_CANCELLABLE', 409, 'Cette réservation ne peut plus être annulée.')
module.exports = { invalidInput, seatNotInPlan, bookingNotFound, seatUnavailable, alreadyBooked, departureNotBookable, bookingNotCancellable }