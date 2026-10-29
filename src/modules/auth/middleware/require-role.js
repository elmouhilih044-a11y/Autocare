const { AppError } = require('../../../shared/errors');

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return function requireRoleMiddleware(req, res, next) {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(
        new AppError('FORBIDDEN', 403, `Access denied. Requires one of roles: [${allowed.join(', ')}]`)
      );
    }
    next();
  };
}

module.exports = { requireRole };
