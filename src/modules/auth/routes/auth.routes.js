const { Router } = require('express');

function createAuthRouter({ authController }) {
  const router = Router();
  router.post('/auth/login', authController.login);
  return router;
}

module.exports = createAuthRouter;
module.exports.createAuthRouter = createAuthRouter;
