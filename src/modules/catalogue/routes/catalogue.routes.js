const { Router } = require('express');

function createCatalogueRouter({ catalogueController, authenticate, requireRole }) {
  const router = Router();

  // ----------------------------------------------------
  // 1. Public Reads
  // ----------------------------------------------------
  router.get('/cities', catalogueController.getCities);
  router.get('/cities/:id', catalogueController.getCityById);
  router.get('/stops', catalogueController.getStops);
  router.get('/stops/:id', catalogueController.getStopById);
  router.get('/lines', catalogueController.getLines);
  router.get('/lines/:id', catalogueController.getLineById);
  router.get('/departures', catalogueController.getDepartures);
  router.get('/departures/:id', catalogueController.getDepartureById);

  // ----------------------------------------------------
  // 2. Coaches (Admin only)
  // ----------------------------------------------------
  router.get('/coaches', authenticate, requireRole(['admin']), catalogueController.getCoaches);
  router.get('/coaches/:id', authenticate, requireRole(['admin']), catalogueController.getCoachById);
  router.post('/coaches', authenticate, requireRole(['admin']), catalogueController.createCoach);
  router.patch('/coaches/:id', authenticate, requireRole(['admin']), catalogueController.updateCoach);
  router.delete('/coaches/:id', authenticate, requireRole(['admin']), catalogueController.archiveCoach);

  // ----------------------------------------------------
  // 3. Lines Management (Admin only)
  // ----------------------------------------------------
  router.post('/lines', authenticate, requireRole(['admin']), catalogueController.createLine);
  router.patch('/lines/:id', authenticate, requireRole(['admin']), catalogueController.updateLine);
  router.delete('/lines/:id', authenticate, requireRole(['admin']), catalogueController.archiveLine);
  router.patch('/lines/:lineId/coaches/:coachId', authenticate, requireRole(['admin']), catalogueController.updateLineCoach);
  router.delete('/lines/:lineId/coaches/:coachId', authenticate, requireRole(['admin']), catalogueController.removeLineCoach);

  // ----------------------------------------------------
  // 4. Departures & State Transitions
  // ----------------------------------------------------
  router.post('/departures', authenticate, requireRole(['admin']), catalogueController.createDeparture);
  router.post('/departures/:id/start-boarding', authenticate, requireRole(['agent', 'admin']), catalogueController.startBoarding);
  router.post('/departures/:id/depart', authenticate, requireRole(['agent', 'admin']), catalogueController.depart);
  router.post('/departures/:id/cancel', authenticate, requireRole(['admin']), catalogueController.cancelDeparture);

  return router;
}

module.exports = createCatalogueRouter;
module.exports.createCatalogueRouter = createCatalogueRouter;
