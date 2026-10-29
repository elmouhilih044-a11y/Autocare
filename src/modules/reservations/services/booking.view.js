function toBookingView(booking) {
  return {
    id: booking._id,
    departureId: booking.departureId,
    seatNumber: booking.seatNumber,
    passengerName: booking.passengerName,
    priceCents: booking.priceCents,
    status: booking.status,
    ticketCode: booking.ticketCode,
    cancelReason: booking.cancelReason,
    boardedAt: booking.boardedAt,
  };
}

module.exports = { toBookingView };
