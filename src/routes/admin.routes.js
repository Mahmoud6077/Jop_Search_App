const express = require('express');
const router = express.Router();

// Import controllers
const {
  banUser,
  unbanUser,
  banCompany,
  unbanCompany,
  approveCompany
} = require('../controllers/admin.controller');

// Import middlewares
const { verifyToken, restrictTo } = require('../middlewares/auth.middleware');
const { validateParam } = require('../middlewares/validation.middleware');

// All routes require authentication and admin role
router.use(verifyToken, restrictTo('Admin'));

// User management routes
router.patch('/users/:id/ban', validateParam('id'), banUser);
router.patch('/users/:id/unban', validateParam('id'), unbanUser);

// Company management routes
router.patch('/companies/:id/ban', validateParam('id'), banCompany);
router.patch('/companies/:id/unban', validateParam('id'), unbanCompany);
router.patch('/companies/:id/approve', validateParam('id'), approveCompany);

module.exports = router;