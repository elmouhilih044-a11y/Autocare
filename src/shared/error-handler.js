function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_CONFLICT',
      message: 'Duplicate key error: resource already exists',
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID',
      message: `Invalid format for field: ${err.path}`,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }

  const statusCode = err.statusCode || (typeof err.status === 'number' ? err.status : 500);
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message = err.message || 'An error occurred';

  res.status(statusCode).json({
    success: false,
    code,
    message,
  });
}

module.exports = errorHandler;
