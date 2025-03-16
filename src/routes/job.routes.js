const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable mergeParams

// Import controllers
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  closeJob,
  getCompanyJobs,
  deleteJob,
  getMyJobs,
  getJobApplications
} = require('../controllers/job.controller');

// Import middlewares
const { verifyToken, restrictTo } = require('../middlewares/auth.middleware');
const { validate, validateParam } = require('../middlewares/validation.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

// Import validators
const {
  createJobSchema,
  updateJobSchema,
  jobFilterSchema
} = require('../validators/job.validator');

// All routes require authentication
router.use(verifyToken);

// Get all jobs with filtering
router.get('/', validate(jobFilterSchema), getAllJobs);

// Get jobs created by the current user
router.get('/my-jobs', getMyJobs);

// Get jobs for a specific company
router.get('/company/:companyId', validateParam('companyId'), getCompanyJobs);

// Merged routes (when accessed via /companies/:companyId/jobs)
router.get('/', (req, res, next) => {
  // If there's a companyId in the params, use getCompanyJobs, otherwise use getAllJobs
  if (req.params.companyId) {
    return getCompanyJobs(req, res, next);
  }
  return getAllJobs(req, res, next);
});

// Create job
router.post('/', validate(createJobSchema), createJob);

// Job specific routes
router.route('/:id')
  .get(validateParam('id'), getJobById)
  .patch(validateParam('id'), validate(updateJobSchema), updateJob)
  .delete(validateParam('id'), deleteJob);

// Close job
router.patch('/:id/close', validateParam('id'), closeJob);

module.exports = router;