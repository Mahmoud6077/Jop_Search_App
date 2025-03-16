const { AppError } = require('../middlewares/error.middleware');

// Handle errors in async functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Format error responses
const formatError = (err) => {
  // Custom error formatting logic
  const formattedError = {
    message: err.message,
    status: err.status || 'error',
    statusCode: err.statusCode || 500
  };

  if (process.env.NODE_ENV === 'development') {
    formattedError.stack = err.stack;
  }

  return formattedError;
};

// Handle specific error types
const handleDatabaseError = (err) => {
  // Handle MongoDB/Mongoose errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return new AppError(`Validation Error: ${messages.join(', ')}`, 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`Duplicate field value: ${field}. Please use another value.`, 400);
  }

  return err;
};

module.exports = {
  asyncHandler,
  formatError,
  handleDatabaseError
};