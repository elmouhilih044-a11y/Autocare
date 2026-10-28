class AppError extends Error {
  constructor(code, statusCode = 500, message) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = { AppError };
