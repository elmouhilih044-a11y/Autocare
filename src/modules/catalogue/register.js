const { asClass, asFunction } = require('awilix');
const { CatalogueRepository } = require('./repositories/catalogue.repository');
const { CatalogueService } = require('./services/catalogue.service');
const { CatalogueController } = require('./controllers/catalogue.controller');
const { createCatalogueApi } = require('./index');
const { createCatalogueRouter } = require('./routes/catalogue.routes');

function register(container) {
  container.register({
    catalogueRepository: asClass(CatalogueRepository).singleton(),
    catalogueService: asClass(CatalogueService).singleton(),
    catalogueController: asClass(CatalogueController).singleton(),
    catalogueApi: asFunction(createCatalogueApi).singleton(),
    catalogueRouter: asFunction(createCatalogueRouter).singleton(),
  });
}

module.exports = { register };