
const { createContainer: createAwilixContainer, asValue } = require('awilix');
const { registerModules } = require('./register-modules');
const { systemClock } = require('../shared/clock');
const env = require('../config/env');
const { withTransaction } = require('../shared/transaction');

function createContainer(overrides = {}) {
  const container = createAwilixContainer();

  container.register({
    clock: asValue(overrides.clock || systemClock),
    jwtSecret: asValue(overrides.jwtSecret || env.jwtSecret),
    jwtExpiresIn: asValue(overrides.jwtExpiresIn || env.jwtExpiresIn),
  });

  registerModules(container);
  container.register({
  transactionRunner: asValue(withTransaction),
});

  return container;
}

const container = createContainer();

module.exports = container;
module.exports.createContainer = createContainer;
