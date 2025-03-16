const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  confirmEmail,
  resendConfirmationEmail,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPicture,
  getAllUsers,
  getUserById,
  updateUser,
  banUser,
  unbanUser,
  deleteUser,
  getUserProfile,
  deleteProfilePicture,
  deleteCoverPicture
} = require('../controllers/user.controller');

// Import middlewares
const { verifyToken, restrictTo } = require('../middlewares/auth.middleware');
const { validate, validateParam } = require('../middlewares/validation.middleware');
const { uploadProfilePic, uploadCoverPic } = require('../middlewares/upload.middleware');
const { authLimiter, sensitiveOpLimiter } = require('../middlewares/rateLimit.middleware');
const userController = require('../controllers/user.controller');

// Import validators
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  adminUpdateUserSchema
} = require('../validators/user.validator');

// Public routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/confirm-email', sensitiveOpLimiter, validate(verifyEmailSchema), confirmEmail);
router.post('/resend-confirmation', sensitiveOpLimiter, validate(forgotPasswordSchema), resendConfirmationEmail);router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', sensitiveOpLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', sensitiveOpLimiter, validate(resetPasswordSchema), resetPassword);

// Google auth routes
router.post('/google/signup', authLimiter, userController.googleSignUp);
router.post('/google/login', authLimiter, userController.googleLogin);

// Refresh token route
router.post('/refresh-token', userController.refreshToken);

// Protected routes
router.use(verifyToken);

// User profile routes
router.get('/profile', getProfile);
router.patch('/profile', validate(updateProfileSchema), updateProfile);
router.patch('/change-password', validate(changePasswordSchema), changePassword);
router.post('/profile-picture', uploadProfilePic, uploadProfilePicture);
router.post('/cover-picture', uploadCoverPic, uploadCoverPicture);
// Get profile data for another user
router.get('/profile/:userId', validateParam('userId'), getUserProfile);
// Delete profile picture
router.delete('/profile-picture', verifyToken, deleteProfilePicture);
// Delete cover picture
router.delete('/cover-picture', verifyToken, deleteCoverPicture);

// Admin routes
router.use(restrictTo('Admin'));

router.route('/admin/users')
  .get(getAllUsers);

router.route('/admin/users/:id')
  .get(validateParam('id'), getUserById)
  .patch(validateParam('id'), validate(adminUpdateUserSchema), updateUser)
  .delete(validateParam('id'), deleteUser);

router.patch('/admin/users/:id/ban', validateParam('id'), banUser);
router.patch('/admin/users/:id/unban', validateParam('id'), unbanUser);

module.exports = router;