const jwt = require('jsonwebtoken');
const { AppError } = require('../../../shared/errors');

function createAuthenticate({ jwtSecret }) {
  return function authenticate(req, res, next) {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 401, 'Missing or invalid authorization header');
      }

      const token = header.slice('Bearer '.length).trim();
      if (!token) {
        throw new AppError('UNAUTHORIZED', 401, 'Missing or invalid authorization header');
      }

      const payload = jwt.verify(token, jwtSecret);
      req.user = {
        id: payload.sub,
        role: payload.role,
        email: payload.email,
      };
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
    }
  };
}

module.exports = { createAuthenticate };
