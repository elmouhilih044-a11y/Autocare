const { BOOKING_STATUS } = require('./models/booking.constants');
// ASSUMPTION: M4 will provide this error class in shared/errors.js. Confirm its name and signature.
const { AppError } = require('../../shared/errors');

function createReservationsApi({ bookingRepository }) {
  return {
    // For M3's seat view: only seat numbers, no names, no ticket codes
    getOccupiedSeatNumbers(departureId, { session } = {}) {
      return bookingRepository.findOccupiedSeatNumbers(departureId, { session });
    },

    // For Boarding: CONFIRMED -> BOARDED, inside the session received
    async consumeTicket({ ticketCode, departureId, now }, { session } = {}) {
      const booking = await bookingRepository.findByTicketCode(ticketCode, { session });

      if (!booking) {
        throw new AppError('TICKET_NOT_FOUND', 404, 'Billet inconnu.');
      }
      if (String(booking.departureId) !== String(departureId)) {
        throw new AppError('WRONG_DEPARTURE', 409, 'Ce billet concerne un autre depart.');
      }
      if (booking.status !== BOOKING_STATUS.CONFIRMED) {
        throw new AppError('TICKET_NOT_VALID', 409, 'Ce billet est annule ou deja utilise.');
      }

      // Atomic conditional update: if a concurrent scan won, this returns null
      const boarded = await bookingRepository.markBoardedIfConfirmed(booking._id, now, { session });
      if (!boarded) {
        throw new AppError('TICKET_NOT_VALID', 409, 'Ce billet est annule ou deja utilise.');
      }
      return boarded;
    },

    // For M3: departure cancellation
    cancelConfirmedByDeparture(departureId, { session } = {}) {
      return bookingRepository.cancelAllConfirmedByDeparture(departureId, { session });
    },
  };
}

module.exports = { createReservationsApi };