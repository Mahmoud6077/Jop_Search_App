const Job = require('../models/job.model');
const Company = require('../models/company.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');

// Create a new job
const createJob = catchAsync(async (req, res, next) => {
  const {
    jobTitle,
    jobLocation,
    workingTime,
    seniorityLevel,
    jobDescription,
    technicalSkills,
    softSkills,
    companyId
  } = req.body;
  
  // Check if company exists
  const company = await Company.findById(companyId);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if company is approved
  if (!company.approvedByAdmin) {
    return next(new AppError('Company must be approved before posting jobs', 403));
  }
  
  // Check if user is a company HR or owner
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isOwner = company.createdBy.equals(req.user._id);
  
  if (!isHR && !isOwner && req.user.role !== 'Admin') {
    return next(new AppError('You are not authorized to create jobs for this company', 403));
  }
  
  // Create job
  const job = await Job.create({
    jobTitle,
    jobLocation,
    workingTime,
    seniorityLevel,
    jobDescription,
    technicalSkills,
    softSkills,
    addedBy: req.user._id,
    companyId
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      job
    }
  });
});

// Get all jobs with filtering and pagination
const getAllJobs = catchAsync(async (req, res, next) => {
  // Build query
  let query = { closed: false };
  
  // Apply filters if provided
  if (req.query.jobTitle) {
    query.jobTitle = { $regex: req.query.jobTitle, $options: 'i' };
  }
  
  if (req.query.jobLocation) {
    query.jobLocation = req.query.jobLocation;
  }
  
  if (req.query.workingTime) {
    query.workingTime = req.query.workingTime;
  }
  
  if (req.query.seniorityLevel) {
    query.seniorityLevel = req.query.seniorityLevel;
  }
  
  if (req.query.technicalSkills) {
    // Handle both array and single value
    const skills = Array.isArray(req.query.technicalSkills) 
      ? req.query.technicalSkills 
      : [req.query.technicalSkills];
    
    query.technicalSkills = { $in: skills };
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Sort options
  let sortOption = { createdAt: -1 }; // Default newest first
  if (req.query.sort === 'oldest') {
    sortOption = { createdAt: 1 };
  }
  
  // Count total documents for pagination
  const total = await Job.countDocuments(query);
  
  // Get jobs
  const jobs = await Job.find(query)
    .populate({
      path: 'companyId',
      select: 'companyName industry Logo'
    })
    .populate({
      path: 'addedBy',
      select: 'firstName lastName email'
    })
    .sort(sortOption)
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: jobs.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      jobs
    }
  });
});

// Helper function to check if a user is an HR for any company
const isUserHR = async (userId) => {
  const companies = await Company.find({
    $or: [
      { createdBy: userId },
      { HRs: userId }
    ]
  });
  
  return companies.length > 0;
};

// Get job by ID
const getJobById = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // If job is closed, only allow admin, job creator, or company HR to view it
  if (job.closed) {
    const isAuthorized = req.user.role === 'Admin' || 
                          job.addedBy._id.equals(req.user._id) ||
                          await isJobCompanyHR(req.user._id, job.companyId._id);
    
    if (!isAuthorized) {
      return next(new AppError('This job posting is no longer available', 403));
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      job
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

// Update job
const updateJob = catchAsync(async (req, res, next) => {
  const {
    jobTitle,
    jobLocation,
    workingTime,
    seniorityLevel,
    jobDescription,
    technicalSkills,
    softSkills,
    closed
  } = req.body;
  
  // Find job
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // Check if user is authorized to update
  const isCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to update this job', 403));
  }
  
  // Create update object
  const updateData = {};
  if (jobTitle) updateData.jobTitle = jobTitle;
  if (jobLocation) updateData.jobLocation = jobLocation;
  if (workingTime) updateData.workingTime = workingTime;
  if (seniorityLevel) updateData.seniorityLevel = seniorityLevel;
  if (jobDescription) updateData.jobDescription = jobDescription;
  if (technicalSkills) updateData.technicalSkills = technicalSkills;
  if (softSkills) updateData.softSkills = softSkills;
  if (closed !== undefined) updateData.closed = closed;
  
  // Add updatedBy field
  updateData.updatedBy = req.user._id;
  
  // Update job
  const updatedJob = await Job.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      job: updatedJob
    }
  });
});

// Close job (mark as not accepting applications anymore)
const closeJob = catchAsync(async (req, res, next) => {
  // Find job
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // Check if job is already closed
  if (job.closed) {
    return next(new AppError('Job is already closed', 400));
  }
  
  // Check if user is authorized to close
  const isCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to close this job', 403));
  }
  
  // Close job
  job.closed = true;
  job.updatedBy = req.user._id;
  await job.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Job closed successfully',
    data: {
      job
    }
  });
});

// Get company jobs
const getCompanyJobs = catchAsync(async (req, res, next) => {
  const { companyId } = req.params;
  
  // Check if company exists
  const company = await Company.findById(companyId);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if company is approved or if user is HR/admin
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isOwner = company.createdBy.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!company.approvedByAdmin && !isHR && !isOwner && !isAdmin) {
    return next(new AppError('Company is not approved yet', 403));
  }
  
  // Build query
  let query = { companyId, closed: false };
  
  // If user is HR or admin, allow viewing closed jobs too
  if (req.query.closed !== undefined && (isHR || isOwner || isAdmin)) {
    query.closed = req.query.closed === 'true';
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Count total documents for pagination
  const total = await Job.countDocuments(query);
  
  // Get jobs
  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: jobs.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      jobs
    }
  });
});

// Delete job
const deleteJob = catchAsync(async (req, res, next) => {
  // Find job
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  
  // Check if user is authorized to delete
  const isCreator = job.addedBy._id.equals(req.user._id);
  const isHR = await isJobCompanyHR(req.user._id, job.companyId._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isCreator && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to delete this job', 403));
  }
  
  // Delete job (triggers middleware to delete related applications)
  await job.deleteOne();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get HR jobs (jobs created by current user)
const getMyJobs = catchAsync(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = { addedBy: req.user._id };
  
  // Apply filters
  if (req.query.closed !== undefined) {
    query.closed = req.query.closed === 'true';
  }
  
  // Count total documents for pagination
  const total = await Job.countDocuments(query);
  
  // Get jobs
  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: jobs.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      jobs
    }
  });
});

const getJobApplications = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
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
  
  // Get applications with user data
  const applications = await Application.find(query)
    .populate({
      path: 'userId',
      select: 'firstName lastName email profilePic'
    })
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


module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  closeJob,
  getCompanyJobs,
  deleteJob,
  getMyJobs,
  getJobApplications
};