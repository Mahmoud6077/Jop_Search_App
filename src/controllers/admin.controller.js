const User = require('../models/user.model');
const Company = require('../models/company.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');

// Ban a user
const banUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Find user
  const user = await User.findById(id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if user is already banned
  if (user.bannedAt) {
    return next(new AppError('User is already banned', 400));
  }
  
  // Ban user
  user.bannedAt = Date.now();
  user.updatedBy = req.user._id;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'User banned successfully',
    data: {
      user
    }
  });
});

// Unban a user
const unbanUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Use updateOne directly to bypass all hooks
  const result = await User.updateOne(
    { _id: id },
    { $set: { bannedAt: null, updatedBy: req.user._id } }
  );
  
  if (result.matchedCount === 0) {
    return next(new AppError('User not found', 404));
  }
  
  if (result.modifiedCount === 0) {
    return next(new AppError('User is not banned or update failed', 400));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully'
  });
});

// Ban a company
const banCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Find company
  const company = await Company.findById(id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if company is already banned
  if (company.bannedAt) {
    return next(new AppError('Company is already banned', 400));
  }
  
  // Ban company
  company.bannedAt = Date.now();
  await company.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Company banned successfully',
    data: {
      company
    }
  });
});

// Unban a company
const unbanCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Use updateOne directly to bypass all hooks
  const result = await Company.updateOne(
    { _id: id },
    { $set: { bannedAt: null } }
  );
  
  if (result.matchedCount === 0) {
    return next(new AppError('Company not found', 404));
  }
  
  if (result.modifiedCount === 0) {
    return next(new AppError('Company is not banned or update failed', 400));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Company unbanned successfully'
  });
});

// Approve company
const approveCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Find company
  const company = await Company.findById(id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check if company is already approved
  if (company.approvedByAdmin) {
    return next(new AppError('Company is already approved', 400));
  }
  
  // Approve company
  company.approvedByAdmin = true;
  await company.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Company approved successfully',
    data: {
      company
    }
  });
});

module.exports = {
  banUser,
  unbanUser,
  banCompany,
  unbanCompany,
  approveCompany
};