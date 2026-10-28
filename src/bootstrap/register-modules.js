const catalogueModule = require('../modules/catalogue/register');

function registerModules(container) {
  catalogueModule.register(container);
}

module.exports = { registerModules };
