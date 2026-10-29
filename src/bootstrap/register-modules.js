const catalogueModule = require('../modules/catalogue/register');
const boardingModule = require('../modules/boarding/register');

function registerModules(container) {
  catalogueModule.register(container);
  boardingModule.register(container);
}

module.exports = { registerModules };