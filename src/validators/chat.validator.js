const Joi = require('joi');
const mongoose = require('mongoose');

// Custom error messages
const messages = {
  'string.base': '{#label} should be a text',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} should have at least {#limit} characters',
  'string.max': '{#label} should have at most {#limit} characters',
  'any.required': '{#label} is required',
  'number.base': '{#label} should be a number',
  'number.min': '{#label} should be at least {#limit}'
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

// Create or get chat schema
const createChatSchema = Joi.object({
  receiverId: objectId.required().messages(messages)
});

// Send message schema
const sendMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required().messages(messages)
});

// Get chat history schema
const getChatHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages(messages),
  limit: Joi.number().integer().min(1).max(100).default(50).messages(messages)
});

// Get chat list schema (all chats for a user)
const getChatListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages(messages),
  limit: Joi.number().integer().min(1).max(50).default(20).messages(messages)
});

module.exports = {
  createChatSchema,
  sendMessageSchema,
  getChatHistorySchema,
  getChatListSchema
};