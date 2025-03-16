const Company = require('../models/company.model');
const User = require('../models/user.model');
const Job = require('../models/job.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');
const { uploadFile, updateFile, deleteFile } = require('../utils/cloudinary');

// Create a new company
const createCompany = catchAsync(async (req, res, next) => {
  const { companyName, description, industry, address, numberOfEmployees, companyEmail } = req.body;
  
  // Check if company already exists with the same name or email
  const existingCompany = await Company.findOne({
    $or: [
      { companyName: companyName },
      { companyEmail: companyEmail }
    ]
  });
  
  if (existingCompany) {
    return next(new AppError('Company with this name or email already exists', 400));
  }
  
  // Check if legal attachment was uploaded
  if (!req.file) {
    return next(new AppError('Legal attachment is required', 400));
  }
  
  // Upload legal attachment to cloudinary
  const legalAttachment = await uploadFile(req.file.path, 'legal-attachments');
  
  // Create new company
  const company = await Company.create({
    companyName,
    description,
    industry,
    address,
    numberOfEmployees,
    companyEmail,
    createdBy: req.user._id,
    legalAttachment
  });
  
  // Add creator as HR
  company.HRs.push(req.user._id);
  await company.save();
  
  res.status(201).json({
    status: 'success',
    message: 'Company created successfully and awaiting admin approval',
    data: {
      company
    }
  });
});

// Get all companies (with filtering options)
const getAllCompanies = catchAsync(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = {};
  
  // Apply filters if provided
  if (req.query.industry) {
    query.industry = { $regex: req.query.industry, $options: 'i' };
  }
  
  if (req.query.approved === 'true') {
    query.approvedByAdmin = true;
  } else if (req.query.approved === 'false') {
    query.approvedByAdmin = false;
  }
  
  // For non-admin users, only show approved companies
  if (req.user.role !== 'Admin') {
    query.approvedByAdmin = true;
  }
  
  // Count total documents for pagination
  const total = await Company.countDocuments(query);
  
  // Get companies
  const companies = await Company.find(query)
    .populate({
      path: 'createdBy',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'HRs',
      select: 'firstName lastName email'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: companies.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      companies
    }
  });
});

// Get company by ID
const getCompanyById = catchAsync(async (req, res, next) => {
  // Find company
  const company = await Company.findById(req.params.id)
    .populate({
      path: 'createdBy',
      select: 'firstName lastName email profilePic'
    })
    .populate({
      path: 'HRs',
      select: 'firstName lastName email profilePic'
    });
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  if (!company.approvedByAdmin && 
      req.user.role !== 'Admin' && 
      !company.HRs.some(hr => hr._id.equals(req.user._id)) && 
      !company.createdBy._id.equals(req.user._id)) {
    return next(new AppError('This company is not approved yet', 403));
  }

  const jobs = await Job.find({ companyId: company._id });
  
  res.status(200).json({
    status: 'success',
    data: {
      company,
      jobs
    }
  });
});

// Update company
const updateCompany = catchAsync(async (req, res, next) => {
  const { companyName, description, industry, address, numberOfEmployees, companyEmail } = req.body;
  
  // Check if user is authorized (admin, company owner, or HR)
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check authorization
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to update this company', 403));
  }
  
  // Create update object
  const updateData = {};
  if (companyName) updateData.companyName = companyName;
  if (description) updateData.description = description;
  if (industry) updateData.industry = industry;
  if (address) updateData.address = address;
  if (numberOfEmployees) updateData.numberOfEmployees = numberOfEmployees;
  if (companyEmail) updateData.companyEmail = companyEmail;
  
  // If company name or email is changed, check for duplicates
  if (companyName && companyName !== company.companyName || 
      companyEmail && companyEmail !== company.companyEmail) {
    
    const existingCompany = await Company.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { companyName: companyName || company.companyName },
        { companyEmail: companyEmail || company.companyEmail }
      ]
    });
    
    if (existingCompany) {
      return next(new AppError('Company with this name or email already exists', 400));
    }
  }
  
  // Update company
  const updatedCompany = await Company.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate({
    path: 'createdBy',
    select: 'firstName lastName email'
  }).populate({
    path: 'HRs',
    select: 'firstName lastName email'
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      company: updatedCompany
    }
  });
});

// Upload company logo
const uploadCompanyLogo = catchAsync(async (req, res, next) => {
  // Check if file exists
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }
  
  // Check if user is authorized (admin, company owner, or HR)
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check authorization
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to update this company', 403));
  }
  
  // Upload file to cloudinary
  const result = await uploadFile(req.file.path, 'company-logos');
  
  // Delete old logo if exists
  if (company.Logo && company.Logo.public_id) {
    await deleteFile(company.Logo.public_id);
  }
  
  // Update company with new logo
  company.Logo = result;
  await company.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      Logo: result
    }
  });
});

// Upload company cover picture
const uploadCompanyCover = catchAsync(async (req, res, next) => {
  // Check if file exists
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }
  
  // Check if user is authorized (admin, company owner, or HR)
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check authorization
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to update this company', 403));
  }
  
  // Upload file to cloudinary
  const result = await uploadFile(req.file.path, 'company-covers');
  
  // Delete old cover if exists
  if (company.coverPic && company.coverPic.public_id) {
    await deleteFile(company.coverPic.public_id);
  }
  
  // Update company with new cover
  company.coverPic = result;
  await company.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      coverPic: result
    }
  });
});

// Add HR to company
const addHR = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if company exists
  const company = await Company.findById(req.params.id);
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if user is already an HR
  if (company.HRs.includes(userId)) {
    return next(new AppError('User is already an HR for this company', 400));
  }
  
  // Check if the current user is authorized to add HRs
  const isOwner = company.createdBy.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('Only company owner or admin can add HRs', 403));
  }
  
  // Add user to HRs array
  company.HRs.push(userId);
  await company.save();
  
  // Populate HR details
  await company.populate({
    path: 'HRs',
    select: 'firstName lastName email profilePic'
  });
  
  res.status(200).json({
    status: 'success',
    message: 'HR added successfully',
    data: {
      company
    }
  });
});

// Remove HR from company
const removeHR = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  
  // Check if company exists
  const company = await Company.findById(req.params.id);
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if the user is an HR
  if (!company.HRs.includes(userId)) {
    return next(new AppError('User is not an HR for this company', 400));
  }
  
  // Check if the user is the company owner
  if (company.createdBy.equals(userId)) {
    return next(new AppError('Cannot remove company owner from HR list', 400));
  }
  
  // Check if the current user is authorized to remove HRs
  const isOwner = company.createdBy.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('Only company owner or admin can remove HRs', 403));
  }
  
  // Remove user from HRs array
  company.HRs = company.HRs.filter(hr => !hr.equals(userId));
  await company.save();
  
  // Populate HR details
  await company.populate({
    path: 'HRs',
    select: 'firstName lastName email profilePic'
  });
  
  res.status(200).json({
    status: 'success',
    message: 'HR removed successfully',
    data: {
      company
    }
  });
});

// Admin: Approve company
const approveCompany = catchAsync(async (req, res, next) => {
  const { approvedByAdmin } = req.body;
  
  // Only admin can approve companies
  if (req.user.role !== 'Admin') {
    return next(new AppError('Only admins can approve companies', 403));
  }
  
  // Find and update company
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    { approvedByAdmin },
    { new: true, runValidators: true }
  );
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    message: approvedByAdmin ? 'Company approved successfully' : 'Company approval revoked',
    data: {
      company
    }
  });
});

// Get user's companies (companies where user is owner or HR)
const getUserCompanies = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  
  // Find companies where user is owner or HR
  const companies = await Company.find({
    $or: [
      { createdBy: userId },
      { HRs: userId }
    ]
  }).populate({
    path: 'createdBy',
    select: 'firstName lastName email'
  }).populate({
    path: 'HRs',
    select: 'firstName lastName email'
  });
  
  res.status(200).json({
    status: 'success',
    results: companies.length,
    data: {
      companies
    }
  });
});

// Soft delete company (mark as deleted)
const deleteCompany = catchAsync(async (req, res, next) => {
  // Check if company exists
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if user is authorized to delete
  const isOwner = company.createdBy.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('Only company owner or admin can delete the company', 403));
  }
  
  // Soft delete
  company.deletedAt = Date.now();
  await company.save();
  res.status(204).json({
    status: 'success',
    data: null
  });
});

const searchCompanies = catchAsync(async (req, res, next) => {
  const { name } = req.query;
  
  if (!name) {
    return next(new AppError('Company name is required for search', 400));
  }
  
  const companies = await Company.find({
    companyName: { $regex: name, $options: 'i' }
  });
  
  res.status(200).json({
    status: 'success',
    results: companies.length,
    data: {
      companies
    }
  });
});

const deleteCompanyLogo = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to delete company logo', 403));
  }
  
  if (!company.Logo || !company.Logo.public_id) {
    return next(new AppError('Company does not have a logo', 400));
  }
  
  // Delete from cloudinary
  await deleteFile(company.Logo.public_id);
  
  // Update company
  company.Logo = null;
  await company.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Company logo deleted successfully'
  });
});
const deleteCompanyCover = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  const isOwner = company.createdBy.equals(req.user._id);
  const isHR = company.HRs.some(hr => hr.equals(req.user._id));
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwner && !isHR && !isAdmin) {
    return next(new AppError('You are not authorized to delete company cover', 403));
  }
  
  if (!company.coverPic || !company.coverPic.public_id) {
    return next(new AppError('Company does not have a cover picture', 400));
  }
  
  // Delete from cloudinary
  await deleteFile(company.coverPic.public_id);
  
  // Update company
  company.coverPic = null;
  await company.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Company cover picture deleted successfully'
  });
});

module.exports = {
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
  searchCompanies,
  deleteCompanyCover,
  deleteCompanyLogo
};