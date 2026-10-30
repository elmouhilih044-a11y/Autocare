const { Router } = require('express');

function createBoardingRouter({ boardingController, authenticate, requireRole }) {
  const router = Router();

  // Agent only. Admin is excluded on purpose: the brief says admin has no implicit right to board.
  router.post(
    '/departures/:id/boarding-records',
    authenticate,
    requireRole(['agent']),
    boardingController.checkTicket
  );

  return router;
}

module.exports = createBoardingRouter;
module.exports.createBoardingRouter = createBoardingRouter;