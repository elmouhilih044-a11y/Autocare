const express = require('express')
function createReservationsRouter({ reservationsController, authenticate, requireRole }) {
  const router = express.Router()
  router.post('/departures/:id/bookings', authenticate, requireRole(['passenger']), reservationsController.createBooking)
  router.post('/bookings/:id/cancel', authenticate, requireRole(['passenger']), reservationsController.cancelBooking)
  return router
}
module.exports = createReservationsRouter