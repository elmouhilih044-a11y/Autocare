const { Router } = require('express');

function createReservationsRouter({ reservationsController, authenticate, requireRole }) {
  const router = Router();

  // Consultation des réservations (voyageur / admin ; agent refusé)
  router.get(
    '/bookings',
    authenticate,
    requireRole(['passenger', 'admin']),
    reservationsController.listBookings
  );

  // Affichage des sièges d'un départ (libre / occupé)
  router.get('/departures/:id/seats', reservationsController.getDepartureSeats);

  // Parcours principal : réserver / annuler une réservation
  router.post(
    '/departures/:id/bookings',
    authenticate,
    requireRole(['passenger']),
    reservationsController.createBooking
  );
  router.post(
    '/bookings/:id/cancel',
    authenticate,
    requireRole(['passenger']),
    reservationsController.cancelBooking
  );

  return router;
}

module.exports = createReservationsRouter;
module.exports.createReservationsRouter = createReservationsRouter;
