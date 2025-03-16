const express = require('express');
const router = express.Router();
const jobRoutes = require('./job.routes')
router.use('/:companyId/jobs', jobRoutes);

// Import controllers
const {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  uploadCompanyLogo,
  uploadCompanyCover,
  addHR,
  removeHR,
  approveCompany,
  getUserCompanies,
  deleteCompany,
  deleteCompanyCover,
  deleteCompanyLogo,
  searchCompanies
} = require('../controllers/company.controller');

// Import middlewares
const { verifyToken, restrictTo, isCompanyHR } = require('../middlewares/auth.middleware');
const { validate, validateParam } = require('../middlewares/validation.middleware');
const { uploadLegalAttachment, uploadCompanyLogo: uploadLogo, uploadCompanyCover: uploadCover } = require('../middlewares/upload.middleware');

// Import validators
const {
  createCompanySchema,
  updateCompanySchema,
  addHRSchema,
  removeHRSchema,
  approveCompanySchema
} = require('../validators/company.validator');

// All routes require authentication
router.use(verifyToken);

// Get user's companies
router.get('/my-companies', getUserCompanies);

// List all companies (filtered based on user role)
router.get('/', getAllCompanies);

// Create company
router.post('/', uploadLegalAttachment, validate(createCompanySchema), createCompany);

// Search
router.get('/search', verifyToken, searchCompanies);

// Delete company logo
router.delete('/:id/logo', verifyToken, validateParam('id'), deleteCompanyLogo);

// Delete company cover
router.delete('/:id/cover', verifyToken, validateParam('id'), deleteCompanyCover);

// Company specific routes
router.route('/:id')
  .get(validateParam('id'), getCompanyById)
  .patch(validateParam('id'), validate(updateCompanySchema), updateCompany)
  .delete(validateParam('id'), deleteCompany);

// Upload company images
router.post('/:id/logo', validateParam('id'), uploadLogo, uploadCompanyLogo);
router.post('/:id/cover', validateParam('id'), uploadCover, uploadCompanyCover);

// HR management
router.post('/:id/hr', validateParam('id'), validate(addHRSchema), addHR);
router.delete('/:id/hr', validateParam('id'), validate(removeHRSchema), removeHR);

// Admin routes
router.patch('/:id/approve', validateParam('id'), restrictTo('Admin'), validate(approveCompanySchema), approveCompany);

module.exports = router;