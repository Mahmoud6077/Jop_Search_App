const rateLimit = require('express-rate-limit');
const { AppError } = require('./error.middleware');

// Basic rate limiter for all routes
const globalLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes by default
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // 100 requests per window by default
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Limiter for sensitive operations (password reset, email confirmation, etc.)
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many sensitive operations attempted, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// API rate limiter to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: 'API rate limit exceeded, please slow down your requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  sensitiveOpLimiter,
  apiLimiter
};