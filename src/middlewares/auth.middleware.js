const jwt = require('jsonwebtoken');
const { AppError, catchAsync } = require('./error.middleware');
const User = require('../models/user.model');

// Verify JWT token and add user to request
const verifyToken = catchAsync(async (req, res, next) => {
  // Get token from authorization header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // Check if user changed password after token was issued
  if (user.changeCredentialTime && decoded.iat) {
    const changedTimestamp = parseInt(user.changeCredentialTime.getTime() / 1000, 10);
    
    if (decoded.iat < changedTimestamp) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }
  }

  // Check if user is confirmed
  if (!user.isConfirmed) {
    return next(new AppError('Please confirm your email to access this resource.', 403));
  }

  // Grant access to protected route
  req.user = user;
  next();
});

// Restrict access to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

// Check if user is HR or company owner for specific company
const isCompanyHR = catchAsync(async (req, res, next) => {
  const { companyId } = req.params;
  const userId = req.user._id;

  // Find company and check if user is HR or company owner
  const Company = require('../models/company.model');
  const company = await Company.findById(companyId);

  if (!company) {
    return next(new AppError('Company not found.', 404));
  }

  // Check if user is admin
  if (req.user.role === 'Admin') {
    return next();
  }

  // Check if user is company owner or HR
  const isOwner = company.createdBy.equals(userId);
  const isHR = company.HRs.some(hr => hr.equals(userId));

  if (!isOwner && !isHR) {
    return next(new AppError('You are not authorized to perform this action for this company.', 403));
  }

  // Add company to request for later use
  req.company = company;
  next();
});

// Ensure the requesting user owns the resource
const isResourceOwner = (Model, paramName = 'id', findBy = '_id') => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramName];
    const userId = req.user._id;

    // Find the resource
    const resource = await Model.findOne({ [findBy]: resourceId });

    if (!resource) {
      return next(new AppError('Resource not found.', 404));
    }

    // Check if user is admin
    if (req.user.role === 'Admin') {
      req.resource = resource;
      return next();
    }

    // Check if resource has createdBy or addedBy field
    const owner = resource.createdBy || resource.addedBy || resource.userId;
    
    if (!owner || !owner.equals(userId)) {
      return next(new AppError('You are not authorized to perform this action.', 403));
    }

    // Add resource to request for later use
    req.resource = resource;
    next();
  });
};

module.exports = {
  verifyToken,
  restrictTo,
  isCompanyHR,
  isResourceOwner
};