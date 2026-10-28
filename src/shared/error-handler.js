function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_CONFLICT',
      message: 'Duplicate key error: resource already exists',
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID',
      message: `Invalid format for field: ${err.path}`,
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.message,
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
