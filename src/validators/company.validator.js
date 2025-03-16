const Joi = require('joi');
const mongoose = require('mongoose');

// Custom error messages
const messages = {
  'string.base': '{#label} should be a text',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} should have at least {#limit} characters',
  'string.max': '{#label} should have at most {#limit} characters',
  'string.email': '{#label} should be a valid email',
  'string.pattern.base': '{#label} format is invalid',
  'any.required': '{#label} is required',
  'array.base': '{#label} should be an array',
  'array.min': '{#label} should contain at least {#limit} items',
  'object.base': '{#label} should be an object',
  'boolean.base': '{#label} should be a boolean'
};

// ObjectId validation helper
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('string.objectId');
  }
  return value;
}).messages({
  'string.objectId': '{#label} must be a valid MongoDB ObjectId'
});

// Company creation schema
const createCompanySchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).required().messages(messages),
  description: Joi.string().trim().min(20).required().messages(messages),
  industry: Joi.string().trim().required().messages(messages),
  address: Joi.string().trim().required().messages(messages),
  numberOfEmployees: Joi.string().pattern(/^\d+-\d+ employee(s)?$/).required().messages({
    ...messages,
    'string.pattern.base': 'Number of employees must be in the format "11-20 employee" or "11-20 employees"'
  }),
  companyEmail: Joi.string().email().required().messages(messages)
});

// Company update schema
const updateCompanySchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).messages(messages),
  description: Joi.string().trim().min(20).messages(messages),
  industry: Joi.string().trim().messages(messages),
  address: Joi.string().trim().messages(messages),
  numberOfEmployees: Joi.string().pattern(/^\d+-\d+ employee(s)?$/).messages({
    ...messages,
    'string.pattern.base': 'Number of employees must be in the format "11-20 employee" or "11-20 employees"'
  }),
  companyEmail: Joi.string().email().messages(messages)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// Add HR to company schema
const addHRSchema = Joi.object({
  userId: objectId.required().messages(messages)
});

// Remove HR from company schema
const removeHRSchema = Joi.object({
  userId: objectId.required().messages(messages)
});

// Admin approve company schema
const approveCompanySchema = Joi.object({
  approvedByAdmin: Joi.boolean().required().messages(messages)
});

module.exports = {
  createCompanySchema,
  updateCompanySchema,
  addHRSchema,
  removeHRSchema,
  approveCompanySchema
};