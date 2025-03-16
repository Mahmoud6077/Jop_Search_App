const Joi = require('joi');
const mongoose = require('mongoose');
const { JOB_LOCATION, WORKING_TIME, SENIORITY_LEVEL } = require('../config/constants');

// Custom error messages
const messages = {
  'string.base': '{#label} should be a text',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} should have at least {#limit} characters',
  'string.max': '{#label} should have at most {#limit} characters',
  'any.required': '{#label} is required',
  'any.only': '{#label} should be one of {#valids}',
  'array.base': '{#label} should be an array',
  'array.min': '{#label} should contain at least {#limit} items',
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

// Job creation schema
const createJobSchema = Joi.object({
  jobTitle: Joi.string().trim().min(3).max(100).required().messages(messages),
  jobLocation: Joi.string().valid(...Object.values(JOB_LOCATION)).required().messages(messages),
  workingTime: Joi.string().valid(...Object.values(WORKING_TIME)).required().messages(messages),
  seniorityLevel: Joi.string().valid(...Object.values(SENIORITY_LEVEL)).required().messages(messages),
  jobDescription: Joi.string().trim().min(50).required().messages(messages),
  technicalSkills: Joi.array().items(Joi.string().trim()).min(1).required().messages(messages),
  softSkills: Joi.array().items(Joi.string().trim()).min(1).required().messages(messages),
  companyId: objectId.required().messages(messages)
});

// Job update schema
const updateJobSchema = Joi.object({
  jobTitle: Joi.string().trim().min(3).max(100).messages(messages),
  jobLocation: Joi.string().valid(...Object.values(JOB_LOCATION)).messages(messages),
  workingTime: Joi.string().valid(...Object.values(WORKING_TIME)).messages(messages),
  seniorityLevel: Joi.string().valid(...Object.values(SENIORITY_LEVEL)).messages(messages),
  jobDescription: Joi.string().trim().min(50).messages(messages),
  technicalSkills: Joi.array().items(Joi.string().trim()).min(1).messages(messages),
  softSkills: Joi.array().items(Joi.string().trim()).min(1).messages(messages),
  closed: Joi.boolean().messages(messages)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// Job search/filter schema
const jobFilterSchema = Joi.object({
  jobTitle: Joi.string().trim().messages(messages),
  jobLocation: Joi.string().valid(...Object.values(JOB_LOCATION)).messages(messages),
  workingTime: Joi.string().valid(...Object.values(WORKING_TIME)).messages(messages),
  seniorityLevel: Joi.string().valid(...Object.values(SENIORITY_LEVEL)).messages(messages),
  technicalSkills: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ).messages(messages),
  softSkills: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ).messages(messages),
  companyId: objectId.messages(messages),
  closed: Joi.boolean().messages(messages),
  page: Joi.number().integer().min(1).default(1).messages(messages),
  limit: Joi.number().integer().min(1).max(100).default(10).messages(messages),
  sort: Joi.string().valid('newest', 'oldest').default('newest').messages(messages)
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobFilterSchema
};