
const { createContainer: createAwilixContainer, asValue } = require('awilix');
const { registerModules } = require('./register-modules');
const { systemClock } = require('../shared/clock');
const env = require('../config/env');

function createContainer(overrides = {}) {
  const container = createAwilixContainer();

  container.register({
    clock: asValue(overrides.clock || systemClock),
    jwtSecret: asValue(overrides.jwtSecret || env.jwtSecret),
    jwtExpiresIn: asValue(overrides.jwtExpiresIn || env.jwtExpiresIn),
  });

  registerModules(container);

  return container;
}

const container = createContainer();

module.exports = container;
module.exports.createContainer = createContainer;
