
const authModule = require('../modules/auth/register');
const catalogueModule = require('../modules/catalogue/register');
const reservationsModule = require('../modules/reservations/register');

function registerModules(container) {
  authModule.register(container);
  catalogueModule.register(container);
  reservationsModule.register(container);
}

module.exports = { registerModules };
