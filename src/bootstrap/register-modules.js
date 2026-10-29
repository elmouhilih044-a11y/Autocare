const catalogueModule = require('../modules/catalogue/register');
const reservationsModule = require('../modules/reservations/register');
const { asFunction } = require('awilix');
const { createCancelDepartureUseCase } = require('../application/cancel-departure');

function registerModules(container) {
  catalogueModule.register(container);
  reservationsModule.register(container);

  container.register({
    cancelDepartureUseCase: asFunction(createCancelDepartureUseCase).singleton(),
  });
}

module.exports = { registerModules };
