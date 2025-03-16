const Application = require('../models/application.model');
const Job = require('../models/job.model');
const Company = require('../models/company.model');
const User = require('../models/user.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');
const { uploadFile, deleteFile } = require('../utils/cloudinary');
const { sendApplicationConfirmationEmail, sendApplicationStatusEmail, sendNewApplicationNotificationEmail } = require('../utils/email');

// Apply for a job
const applyForJob = catchAsync(async (req, res, next) => {
  const { jobId, notes } = req.body;
  
  // Check if job exists
  // const job = await Job.findById(jobId).populate('companyId');
  const job = await Job.findById(jobId).populate({
  path: 'companyId',
  select: 'companyName industry Logo approvedByAdmin' // Add approvedByAdmin here
  });
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // Check if job is closed
  if (job.closed) {
    return next(new AppError('This job is no longer accepting applications', 400));
  }
  
  // Check if company is approved
  if (!job.companyId.approvedByAdmin) {
    return next(new AppError('Cannot apply to jobs from unapproved companies', 400));
  }
  
  // Check if user has already applied for this job
  const existingApplication = await Application.findOne({
    jobId,
    userId: req.user._id
  });
  
  if (existingApplication) {
    return next(new AppError('You have already applied for this job', 400));
  }
  
  // Check if CV was uploaded
  if (!req.file) {
    return next(new AppError('CV is required for job application', 400));
  }
  
  // Upload CV to cloudinary
  const userCV = await uploadFile(req.file.path, 'user-cvs');
  
  // Create application
  const application = await Application.create({
    jobId,
    userId: req.user._id,
    userCV,
    notes,
    status: 'pending'
  });
  
  // Send confirmation email to applicant
  await sendApplicationConfirmationEmail(req.user, job, job.companyId);
  
  // Notify HRs about the new application via Socket.io
  const io = req.app.get('io');
  if (io) {
    // Emit to company room
    io.to(`company_${job.companyId._id}`).emit('newApplication', {
      applicationId: application._id,
      jobTitle: job.jobTitle,
      applicant: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      timestamp: new Date()
    });
    
    console.log(`Socket event emitted to company_${job.companyId._id}`);
  }
  
  // Send notification to the job creator first
  const jobCreator = await User.findById(job.addedBy);
  if (jobCreator) {
    await sendNewApplicationNotificationEmail(jobCreator, req.user, job);
  }
  
  // Send notification to other HRs (limit to 5 to avoid sending too many emails)
  for (let i = 0; i < Math.min(hrs.length, 5); i++) {
    if (!hrs[i]._id.equals(job.addedBy)) {
      await sendNewApplicationNotificationEmail(hrs[i], req.user, job);
    }
  }
  
  res.status(201).json({
    status: 'success',
    message: 'Application submitted successfully',
    data: {
      application
    }
  });
});

// Get all applications for a specific job (for HRs and admins)
const getJobApplications = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  
  // Check if job exists
  const job = await Job.findById(jobId);
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // Check if user is authorized (admin, job creator, or company HR)
  const isCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to view applications for this job', 403));
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = { jobId };
  
  // Apply status filter if provided
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Sort options
  let sortOption = { createdAt: -1 }; // Default newest first
  if (req.query.sort === 'oldest') {
    sortOption = { createdAt: 1 };
  }
  
  // Count total documents for pagination
  const total = await Application.countDocuments(query);
  
  // Get applications
  const applications = await Application.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      applications
    }
  });
});

// Helper function to check if a user is an HR for a specific company
const isJobCompanyHR = async (userId, companyId) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    return false;
  }
  
  return company.createdBy.equals(userId) || company.HRs.some(hr => hr.equals(userId));
};

// Get all applications for a specific company (for HRs and admins)
const getCompanyApplications = catchAsync(async (req, res, next) => {
  const { companyId } = req.params;
  
  // Check if company exists
  const company = await Company.findById(companyId);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if user is authorized (admin, company owner, or HR)
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to view applications for this company', 403));
  }
  
  // Find all jobs for this company
  const jobs = await Job.find({ companyId });
  const jobIds = jobs.map(job => job._id);
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = { jobId: { $in: jobIds } };
  
  // Apply status filter if provided
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Apply job filter if provided
  if (req.query.jobId && jobIds.includes(req.query.jobId)) {
    query.jobId = req.query.jobId;
  }
  
  // Count total documents for pagination
  const total = await Application.countDocuments(query);
  
  // Get applications
  const applications = await Application.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      applications
    }
  });
});

// Get user's applications (for current user)
const getUserApplications = catchAsync(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = { userId: req.user._id };
  
  // Apply status filter if provided
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Apply job filter if provided
  if (req.query.jobId) {
    query.jobId = req.query.jobId;
  }
  
  // Sort options
  let sortOption = { createdAt: -1 }; // Default newest first
  if (req.query.sort === 'oldest') {
    sortOption = { createdAt: 1 };
  }
  
  // Count total documents for pagination
  const total = await Application.countDocuments(query);
  
  // Get applications
  const applications = await Application.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      applications
    }
  });
});

// Get application by ID
const getApplicationById = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.id);
  
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  
  // Check authorization
  const isApplicant = application.userId._id.equals(req.user._id);
  const job = await Job.findById(application.jobId._id);
  
  if (!job) {
    return next(new AppError('Associated job not found', 404));
  }
  
  const isJobCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isApplicant && !isJobCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to view this application', 403));
  }
  
  // If HR is viewing the application and status is pending, update to viewed
  if ((isJobCreator || isHR) && application.status === 'pending') {
    application.status = 'viewed';
    application.reviewedBy = req.user._id;
    application.reviewedAt = Date.now();
    await application.save();
    
    // Send status update email to applicant
    const applicant = await User.findById(application.userId._id);
    const company = await Company.findById(job.companyId._id);
    
    if (applicant && company) {
      await sendApplicationStatusEmail(applicant, job, company, 'viewed');
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// Update application status (for HRs and admins)
const updateApplicationStatus = catchAsync(async (req, res, next) => {
  const { status, notes } = req.body;
  
  // Find application
  const application = await Application.findById(req.params.id);
  
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  
  // Find job
  const job = await Job.findById(application.jobId);
  
  if (!job) {
    return next(new AppError('Associated job not found', 404));
  }
  
  // Check authorization
  const isJobCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isJobCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to update this application', 403));
  }
  
  // Update application
  application.status = status;
  application.reviewedBy = req.user._id;
  application.reviewedAt = Date.now();
  
  if (notes) {
    application.notes = notes;
  }
  
  await application.save();
  
  // Send status update email to applicant
  const applicant = await User.findById(application.userId);
  const company = await Company.findById(job.companyId);
  
  if (applicant && company) {
    await sendApplicationStatusEmail(applicant, job, company, status);
  }

  // Notify the applicant via Socket.io
  const io = req.app.get('io');
  if (io) {
    // Emit to user's personal room if they're connected
    io.to(`user_${application.userId}`).emit('applicationStatusUpdate', {
      applicationId: application._id,
      jobTitle: job.jobTitle,
      status,
      company: company.companyName,
      timestamp: new Date()
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: `Application status updated to ${status}`,
    data: {
      application
    }
  });
});

// Delete application (for user to withdraw application or admin)
const deleteApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.id);
  
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  
  // Check authorization
  const isApplicant = application.userId._id.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isApplicant && !isAdmin) {
    return next(new AppError('You are not authorized to delete this application', 403));
  }
  
  // Delete CV from cloudinary
  if (application.userCV && application.userCV.public_id) {
    await deleteFile(application.userCV.public_id);
  }
  
  // Delete application
  await application.deleteOne();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  applyForJob,
  getJobApplications,
  getCompanyApplications,
  getUserApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication
};