const { asClass, asFunction, asValue } = require('awilix');
const UserRepository = require('./repositories/user.repository');
const AuthService = require('./services/auth.service');
const AuthController = require('./controllers/auth.controller');
const createAuthRouter = require('./routes/auth.routes');
const { createAuthenticate } = require('./middleware/authenticate');
const { requireRole } = require('./middleware/require-role');

function register(container) {
  container.register({
    userRepository: asClass(UserRepository).singleton(),
    authService: asClass(AuthService).singleton(),
    authController: asClass(AuthController).singleton(),
    authRouter: asFunction(createAuthRouter).singleton(),
    authenticate: asFunction(createAuthenticate).singleton(),
    requireRole: asValue(requireRole),
  });
}

module.exports = { register };
