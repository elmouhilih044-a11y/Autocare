const { createContainer, asClass, asFunction, asValue } = require('awilix');

const CatalogueRepository = require('../modules/catalogue/repositories/catalogue.repository');
const CatalogueService = require('../modules/catalogue/services/catalogue.service');
const CatalogueController = require('../modules/catalogue/controllers/catalogue.controller');
const createCatalogueRouter = require('../modules/catalogue/routes/catalogue.routes');
const { createCatalogueApi } = require('../modules/catalogue');
const { withTransaction } = require('../shared/transaction'); 
const reservationsModule = require('../modules/reservations/register'); 

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    req.user = { id: 'test-user-id', role: token };
    return next();
  }
  if (req.headers['x-role']) {
    req.user = { id: 'test-user-id', role: req.headers['x-role'] };
    return next();
  }
  req.user = { id: 'default-admin-id', role: 'admin' };
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

  authenticate: asValue(authenticate),
  requireRole: asValue(requireRole),
  clock: asValue(clock),
  transactionRunner: asValue(withTransaction), 
});

reservationsModule.register(container); 

module.exports = container;