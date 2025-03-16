const Joi = require('joi');
const { USER_ROLES, GENDER, PROVIDER, OTP_TYPES } = require('../config/constants');

// Custom error messages
const messages = {
  'string.base': '{#label} should be a text',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} should have at least {#limit} characters',
  'string.max': '{#label} should have at most {#limit} characters',
  'string.email': '{#label} should be a valid email',
  'string.pattern.base': '{#label} format is invalid',
  'any.required': '{#label} is required',
  'any.only': '{#label} should be one of {#valids}',
  'date.base': '{#label} should be a valid date',
  'date.max': '{#label} should not be in the future',
  'date.min': '{#label} should be at least 18 years ago'
};

// User registration schema
const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages(messages),
  lastName: Joi.string().trim().min(2).max(50).required().messages(messages),
  email: Joi.string().email().required().messages(messages),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ ...messages, 'any.only': 'Passwords do not match' }),
  gender: Joi.string().valid(...Object.values(GENDER)).required().messages(messages),
  DOB: Joi.date()
    .max('now')
    .custom((value, helpers) => {
      const today = new Date();
      const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      
      if (value > eighteenYearsAgo) {
        return helpers.error('date.min');
      }
      
      return value;
    })
    .required()
    .messages({
      ...messages,
      'date.min': 'You must be at least 18 years old'
    }),
  mobileNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/).messages({
    ...messages,
    'string.pattern.base': 'Mobile number must be a valid number with 10-15 digits'
  })
});

// User login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages(messages),
  password: Joi.string().required().messages(messages)
});

// Change password schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages(messages),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ ...messages, 'any.only': 'Passwords do not match' })
});

// Forgot password schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages(messages)
});

// Reset password schema
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages(messages),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ ...messages, 'any.only': 'Passwords do not match' })
});

// Update user profile schema
const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).messages(messages),
  lastName: Joi.string().trim().min(2).max(50).messages(messages),
  gender: Joi.string().valid(...Object.values(GENDER)).messages(messages),
  mobileNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/).messages({
    ...messages,
    'string.pattern.base': 'Mobile number must be a valid number with 10-15 digits'
  })
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// Email verification schema
const verifyEmailSchema = Joi.object({
  //token: Joi.string().required().messages(messages)
  email: Joi.string().email().required().messages(messages),
  otp: Joi.string().required().messages(messages)

});

// Admin update user schema (for admin actions)
const adminUpdateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).messages(messages),
  lastName: Joi.string().trim().min(2).max(50).messages(messages),
  gender: Joi.string().valid(...Object.values(GENDER)).messages(messages),
  role: Joi.string().valid(...Object.values(USER_ROLES)).messages(messages),
  isConfirmed: Joi.boolean().messages(messages),
  bannedAt: Joi.date().allow(null).messages(messages)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  adminUpdateUserSchema
};