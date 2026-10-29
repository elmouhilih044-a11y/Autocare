const { createContainer, asClass, asFunction, asValue } = require('awilix');
const { withTransaction } = require('../shared/transaction');

const CatalogueRepository = require('../modules/catalogue/repositories/catalogue.repository');
const CatalogueService = require('../modules/catalogue/services/catalogue.service');
const CatalogueController = require('../modules/catalogue/controllers/catalogue.controller');
const createCatalogueRouter = require('../modules/catalogue/routes/catalogue.routes');
const { createCatalogueApi } = require('../modules/catalogue');
const { createCancelDepartureUseCase } = require('../application/cancel-departure');

const reservationsModule = require('../modules/reservations/register');

const DEFAULT_USER_ID = '507f1f77bcf86cd799439011';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // Formats supportés :
    // - "admin" | "agent" | "passenger"
    // - "passenger:<objectId>" pour distinguer les voyageurs dans les tests
    const [role, maybeId] = token.includes(':') ? token.split(':', 2) : [token, undefined];
    req.user = {
      id: maybeId || req.headers['x-user-id'] || DEFAULT_USER_ID,
      role,
      fullName: req.headers['x-user-name'] || 'Test User',
    };
    return next();
  }
  if (req.headers['x-role']) {
    req.user = {
      id: req.headers['x-user-id'] || DEFAULT_USER_ID,
      role: req.headers['x-role'],
      fullName: req.headers['x-user-name'] || 'Test User',
    };
    return next();
  }
  req.user = {
    id: '507f1f77bcf86cd799439099',
    role: 'admin',
    fullName: 'Default Admin',
  };
  next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles || roles.length === 0) return next();
  const userRole = req.user && req.user.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: `Access denied. Requires one of roles: [${roles.join(', ')}]`,
    });
  }
  next();
};

const clock = { now: () => new Date() };

const container = createContainer();

container.register({
  catalogueRepository: asClass(CatalogueRepository).singleton(),
  catalogueService: asClass(CatalogueService).singleton(),
  catalogueController: asClass(CatalogueController).singleton(),
  catalogueApi: asFunction(createCatalogueApi).singleton(),
  catalogueRouter: asFunction(createCatalogueRouter).singleton(),

  cancelDepartureUseCase: asFunction(createCancelDepartureUseCase).singleton(),

  authenticate: asValue(authenticate),
  requireRole: asValue(requireRole),
  clock: asValue(clock),
  transactionRunner: asValue(withTransaction),
});

reservationsModule.register(container);

module.exports = container;
