const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

const ROLE_IDS = {
  admin: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  agent: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  passenger: 'cccccccccccccccccccccccc',
};

function signToken({ role = 'passenger', id, email } = {}) {
  const sub = id || ROLE_IDS[role] || ROLE_IDS.passenger;
  return jwt.sign(
    {
      sub,
      role,
      email: email || `${role}@strada.test`,
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

function authHeader(role, overrides = {}) {
  return { Authorization: `Bearer ${signToken({ role, ...overrides })}` };
}

module.exports = { signToken, authHeader, ROLE_IDS };
