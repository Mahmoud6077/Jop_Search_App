const Joi = require('joi');
const { AppError } = require('./error.middleware');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    next();
  };
};

// Validation for ID parameters
const validateParam = (paramName, message = 'Invalid ID format') => {
  return (req, res, next) => {
    const schema = Joi.object({
      [paramName]: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    });

    const { error } = schema.validate({ [paramName]: req.params[paramName] });

    if (error) {
      return next(new AppError(message, 400));
    }

    next();
  };
};

// Validation for query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    next();
  };
};

module.exports = {
  validate,
  validateParam,
  validateQuery
};