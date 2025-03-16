const express = require('express');
const router = express.Router();

// Import controllers
const {
  applyForJob,
  getJobApplications,
  getCompanyApplications,
  getUserApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication
} = require('../controllers/application.controller');

// Import middlewares
const { verifyToken, restrictTo } = require('../middlewares/auth.middleware');
const { validate, validateParam } = require('../middlewares/validation.middleware');
const { uploadUserCV } = require('../middlewares/upload.middleware');

// Import validators
const {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationFilterSchema,
  userApplicationFilterSchema
} = require('../validators/application.validator');

// All routes require authentication
router.use(verifyToken);

// Apply for a job
router.post('/', uploadUserCV, validate(createApplicationSchema), applyForJob);

// Get user's applications
router.get('/my-applications', validate(userApplicationFilterSchema), getUserApplications);

// Get applications for a specific job (HR and admin only)
router.get('/job/:jobId', validateParam('jobId'), validate(applicationFilterSchema), getJobApplications);

// Get applications for a specific company (HR and admin only)
router.get('/company/:companyId', validateParam('companyId'), validate(applicationFilterSchema), getCompanyApplications);

// Application specific routes
router.route('/:id')
  .get(validateParam('id'), getApplicationById)
  .patch(validateParam('id'), validate(updateApplicationStatusSchema), updateApplicationStatus)
  .delete(validateParam('id'), deleteApplication);

module.exports = router;