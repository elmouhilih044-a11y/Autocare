const { Router } = require('express');

function createCatalogueRouter({ catalogueController, authenticate, requireRole }) {
  const router = Router();

  // ----------------------------------------------------
  // 1. القراءات العامة (Public Reads)
  // ----------------------------------------------------
  router.get('/cities', catalogueController.getCities);
  router.get('/stops', catalogueController.getStops);
  router.get('/lines', catalogueController.getLines);
  router.get('/departures', catalogueController.getDepartures);
  router.get('/departures/:id', catalogueController.getDepartureById);

  // ----------------------------------------------------
  // 2. إدارة الحافلات (Coaches - خاصة بالمدير Admin فقط)
  // ----------------------------------------------------
  router.get('/coaches', authenticate, requireRole(['admin']), catalogueController.getCoaches);
  router.post('/coaches', authenticate, requireRole(['admin']), catalogueController.createCoach);
  router.delete('/coaches/:id', authenticate, requireRole(['admin']), catalogueController.archiveCoach);

  // ----------------------------------------------------
  // 3. إدارة الخطوط (Lines - خاصة بالمدير Admin)
  // ----------------------------------------------------
  router.post('/lines', authenticate, requireRole(['admin']), catalogueController.createLine);
  router.patch('/lines/:lineId/coaches/:coachId', authenticate, requireRole(['admin']), catalogueController.updateLineCoach);
  router.delete('/lines/:lineId/coaches/:coachId', authenticate, requireRole(['admin']), catalogueController.removeLineCoach);

  // ----------------------------------------------------
  // 4. إدارة الرحلات وحالاتها (Departures & Transitions)
  // ----------------------------------------------------
  // إنشاء رحلة جديدة (Admin)
  router.post('/departures', authenticate, requireRole(['admin']), catalogueController.createDeparture);
  
  // بدء صعود الركاب (Agent)
  router.post('/departures/:id/start-boarding', authenticate, requireRole(['agent']), catalogueController.startBoarding);
  
  // انطلاق الحافلة (Agent)
  router.post('/departures/:id/depart', authenticate, requireRole(['agent']), catalogueController.depart);
  
  // إلغاء الرحلة (Admin)
  router.post('/departures/:id/cancel', authenticate, requireRole(['admin']), catalogueController.cancelDeparture);

  return router;
}

exports.createCatalogueRouter = createCatalogueRouter;