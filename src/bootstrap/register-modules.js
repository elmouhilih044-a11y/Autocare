const authModule = require('../modules/auth/register');
const catalogueModule = require('../modules/catalogue/register');

function registerModules(container) {
  authModule.register(container);
  catalogueModule.register(container);
}

module.exports = { registerModules };
