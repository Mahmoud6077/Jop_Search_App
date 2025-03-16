const Joi = require('joi');
const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

// Custom error messages
const messages = {
  'string.base': '{#label} should be a text',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} should have at least {#limit} characters',
  'string.max': '{#label} should have at most {#limit} characters',
  'any.required': '{#label} is required',
  'any.only': '{#label} should be one of {#valids}',
  'object.base': '{#label} should be an object'
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

// Application creation schema
const createApplicationSchema = Joi.object({
  jobId: objectId.required().messages(messages),
  notes: Joi.string().trim().max(500).messages(messages)
});

// Update application status schema
const updateApplicationStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(APPLICATION_STATUS)).required().messages(messages),
  notes: Joi.string().trim().max(500).messages(messages)
});

// Application filter schema (for HR and admin)
const applicationFilterSchema = Joi.object({
  jobId: objectId.messages(messages),
  userId: objectId.messages(messages),
  status: Joi.string().valid(...Object.values(APPLICATION_STATUS)).messages(messages),
  companyId: objectId.messages(messages),
  page: Joi.number().integer().min(1).default(1).messages(messages),
  limit: Joi.number().integer().min(1).max(100).default(10).messages(messages),
  sort: Joi.string().valid('newest', 'oldest').default('newest').messages(messages)
});

// User application filter schema (for users to view their own applications)
const userApplicationFilterSchema = Joi.object({
  jobId: objectId.messages(messages),
  status: Joi.string().valid(...Object.values(APPLICATION_STATUS)).messages(messages),
  page: Joi.number().integer().min(1).default(1).messages(messages),
  limit: Joi.number().integer().min(1).max(100).default(10).messages(messages),
  sort: Joi.string().valid('newest', 'oldest').default('newest').messages(messages)
});

module.exports = {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationFilterSchema,
  userApplicationFilterSchema
};