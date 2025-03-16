const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');
const { createOTP, verifyOTP, isValidOTP, removeOTP } = require('../utils/otp');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { uploadFile, updateFile, deleteFile } = require('../utils/cloudinary');
const { OTP_TYPES } = require('../config/constants');
const { OAuth2Client } = require('google-auth-library');
const { generateAccessToken, generateRefreshToken } = require('../utils/auth.utils');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// // Generate access token (1 hour)
// const generateAccessToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: '1h'
//   });
// };

// Generate refresh token (7 days)
// const generateRefreshToken = (id) => {
//   return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
//     expiresIn: '7d'
//   });
// };

// Handle response with token
const createSendToken = (user, statusCode, res) => {
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  // Remove sensitive data
  user.password = undefined;
  user.OTP = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    accessToken,
    refreshToken,
    data: {
      user
    }
  });
};



// Register a new user
const register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, gender, DOB, mobileNumber } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }
  
  // Create new user
  const newUser = await User.create({
    firstName,
    lastName,
    email,
    password,
    gender,
    DOB,
    mobileNumber,
    provider: 'system'
  });
  
  // Generate OTP for email confirmation
  const otpData = await createOTP(OTP_TYPES.CONFIRM_EMAIL);
  
  // Save OTP to user
  newUser.OTP.push({
    code: otpData.code,
    type: OTP_TYPES.CONFIRM_EMAIL,
    expiresIn: otpData.expiresIn
  });
  
  await newUser.save();
  
  // Send confirmation email
  //await sendWelcomeEmail(newUser, otpData.plainCode);
  console.log('Verification OTP for testing:', otpData.plainCode);

  
  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please check your email for confirmation code.',
    data: {
      user: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      }
    }
  });
});

const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }
  
  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
  
  // Find user
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists', 401));
  }
  
  // Check if user changed password after token was issued
  if (user.changeCredentialTime) {
    const changedTimestamp = parseInt(user.changeCredentialTime.getTime() / 1000, 10);
    
    if (decoded.iat < changedTimestamp) {
      return next(new AppError('User recently changed credentials. Please log in again', 401));
    }
  }
  
  // Generate new access token
  const accessToken = generateAccessToken(user._id);
  
  res.status(200).json({
    status: 'success',
    accessToken
  });
});

// Confirm email with OTP
const confirmEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found, please sign up first', 404));
  }
  
  // Check if user is already confirmed
  if (user.isConfirmed) {
    return next(new AppError('Email already confirmed', 400));
  }
  
  // Validate OTP
  const otpEntry = isValidOTP(user, OTP_TYPES.CONFIRM_EMAIL);
  if (!otpEntry) {
    return next(new AppError('Invalid or expired OTP', 400));
  }
  
  // Verify OTP
  const isValid = await verifyOTP(otp, otpEntry.code);
  if (!isValid) {
    return next(new AppError('Invalid OTP', 400));
  }
  
  // Confirm user email
  user.isConfirmed = true;
  
  // Remove OTP
  await removeOTP(user, OTP_TYPES.CONFIRM_EMAIL);
  
  // Update user
  await user.save();
  
  // Send token
  createSendToken(user, 200, res);
});

// Resend confirmation email
const resendConfirmationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if email is already confirmed
  if (user.isConfirmed) {
    return next(new AppError('Email already confirmed', 400));
  }
  
  // Remove existing OTP
  await removeOTP(user, OTP_TYPES.CONFIRM_EMAIL);
  
  // Generate new OTP
  const otpData = await createOTP(OTP_TYPES.CONFIRM_EMAIL);
  
  // Save OTP to user
  user.OTP.push({
    code: otpData.code,
    type: OTP_TYPES.CONFIRM_EMAIL,
    expiresIn: otpData.expiresIn
  });
  
  await user.save();
  
  // Send confirmation email
  await sendWelcomeEmail(user, otpData.plainCode);
  
  res.status(200).json({
    status: 'success',
    message: 'Confirmation email sent successfully'
  });
});

// Login user
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  
  // Find user by email with password
  const user = await User.findOne({ email }).select('+password');
  
  // Check if user exists and password is correct
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  // Check if user is banned
  if (user.bannedAt) {
    return next(new AppError('Your account has been banned', 403));
  }
  
  // Check if user is confirmed
  if (!user.isConfirmed) {
    return next(new AppError('Please confirm your email before logging in', 403));
  }
  
  // Send token
  createSendToken(user, 200, res);
});

// Forgot password
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Remove existing OTP
  await removeOTP(user, OTP_TYPES.FORGET_PASSWORD);
  
  // Generate new OTP
  const otpData = await createOTP(OTP_TYPES.FORGET_PASSWORD);
  
  // Save OTP to user
  user.OTP.push({
    code: otpData.code,
    type: OTP_TYPES.FORGET_PASSWORD,
    expiresIn: otpData.expiresIn
  });
  
  await user.save();
  
  // Send password reset email
  await sendPasswordResetEmail(user, otpData.plainCode);
  
  res.status(200).json({
    status: 'success',
    message: 'Password reset OTP sent to your email'
  });
});

// Reset password
const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Validate OTP
  const otpEntry = isValidOTP(user, OTP_TYPES.FORGET_PASSWORD);
  if (!otpEntry) {
    return next(new AppError('Invalid or expired OTP', 400));
  }
  
  // Verify OTP
  const isValid = await verifyOTP(otp, otpEntry.code);
  if (!isValid) {
    return next(new AppError('Invalid OTP', 400));
  }
  
  // Update password
  user.password = password;
  user.changeCredentialTime = Date.now();
  
  // Remove OTP
  await removeOTP(user, OTP_TYPES.FORGET_PASSWORD);
  
  // Save user
  await user.save();
  
  // Send token
  createSendToken(user, 200, res);
});

// Change password (when logged in)
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user from database with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Check if current password is correct
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }
  
  // Update password
  user.password = newPassword;
  user.changeCredentialTime = Date.now();
  
  // Save user
  await user.save();
  
  // Send token
  createSendToken(user, 200, res);
});

// Google Sign Up
// const googleSignUp = catchAsync(async (req, res, next) => {
//   const { idToken } = req.body;
  
//   if (!idToken) {
//     return next(new AppError('Google ID token is required', 400));
//   }
  
//   // Verify Google token
//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: process.env.GOOGLE_CLIENT_ID
//   });
  
//   const payload = ticket.getPayload();
//   const { email, given_name, family_name, picture } = payload;
  
//   // Check if user exists
//   let user = await User.findOne({ email });
  
//   if (user) {
//     return next(new AppError('User already exists. Please use login with Google instead', 400));
//   }
  
//   // Create new user
//   user = await User.create({
//     firstName: given_name,
//     lastName: family_name || '',
//     email,
//     provider: 'google',
//     isConfirmed: true, // Google accounts are pre-verified
//     gender: req.body.gender || 'Male', // Default value, ideally ask the user
//     DOB: req.body.DOB || new Date('1990-01-01'), // Default value, ideally ask the user
//     profilePic: picture ? { secure_url: picture, public_id: 'google-provided' } : null
//   });
  
//   // Send token
//   createSendToken(user, 201, res);
// });
const googleSignUp = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Google signup functionality will be implemented soon'
  });
});

// Google Login
// const googleLogin = catchAsync(async (req, res, next) => {
//   const { idToken } = req.body;
  
//   if (!idToken) {
//     return next(new AppError('Google ID token is required', 400));
//   }
  
//   // Verify Google token
//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: process.env.GOOGLE_CLIENT_ID
//   });
  
//   const payload = ticket.getPayload();
//   const { email } = payload;
  
//   // Find user by email
//   const user = await User.findOne({ email });
  
//   if (!user) {
//     return next(new AppError('User not found. Please sign up first', 404));
//   }
  
//   // Check if user is banned
//   if (user.bannedAt) {
//     return next(new AppError('Your account has been banned', 403));
//   }
  
//   // Send token
//   createSendToken(user, 200, res);
// });
const googleLogin = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Google login functionality will be implemented soon'
  });
});

// Get current user profile
const getProfile = catchAsync(async (req, res, next) => {
  // User is already available in req.user from auth middleware
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

// Update user profile
const updateProfile = catchAsync(async (req, res, next) => {
  const { firstName, lastName, gender, mobileNumber, DOB } = req.body;
  
  // Create object with allowed fields
  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (gender) updateData.gender = gender;
  if (mobileNumber) updateData.mobileNumber = mobileNumber;
  if (DOB) updateData.DOB = DOB;
  
  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Upload profile picture
const uploadProfilePicture = catchAsync(async (req, res, next) => {
  // Check if file exists
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }
  
  // Upload file to cloudinary
  const result = await uploadFile(req.file.path, 'profile-pictures');
  
  // Get current user
  const user = await User.findById(req.user._id);
  
  // Delete old profile picture if exists
  if (user.profilePic && user.profilePic.public_id) {
    await deleteFile(user.profilePic.public_id);
  }
  
  // Update user with new profile picture
  user.profilePic = result;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      profilePic: result
    }
  });
});

// Upload cover picture
const uploadCoverPicture = catchAsync(async (req, res, next) => {
  // Check if file exists
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }
  
  // Upload file to cloudinary
  const result = await uploadFile(req.file.path, 'cover-pictures');
  
  // Get current user
  const user = await User.findById(req.user._id);
  
  // Delete old cover picture if exists
  if (user.coverPic && user.coverPic.public_id) {
    await deleteFile(user.coverPic.public_id);
  }
  
  // Update user with new cover picture
  user.coverPic = result;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      coverPic: result
    }
  });
});

// Admin: Get all users
const getAllUsers = catchAsync(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = {};
  
  // Apply filters if provided
  if (req.query.role) query.role = req.query.role;
  if (req.query.confirmed === 'true') query.isConfirmed = true;
  if (req.query.confirmed === 'false') query.isConfirmed = false;
  
  // Count total documents for pagination
  const total = await User.countDocuments(query);
  
  // Get users
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      docsPerPage: limit
    },
    data: {
      users
    }
  });
});

// Delete profile picture
const deleteProfilePicture = catchAsync(async (req, res, next) => {
  // Get current user
  const user = await User.findById(req.user._id);
  
  // Check if user has a profile picture
  if (!user.profilePic || !user.profilePic.public_id) {
    return next(new AppError('No profile picture to delete', 400));
  }
  
  // Delete from cloudinary
  await deleteFile(user.profilePic.public_id);
  
  // Update user
  user.profilePic = null;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Profile picture deleted successfully'
  });
});

// Delete cover picture
const deleteCoverPicture = catchAsync(async (req, res, next) => {
  // Get current user
  const user = await User.findById(req.user._id);
  
  // Check if user has a cover picture
  if (!user.coverPic || !user.coverPic.public_id) {
    return next(new AppError('No cover picture to delete', 400));
  }
  
  // Delete from cloudinary
  await deleteFile(user.coverPic.public_id);
  
  // Update user
  user.coverPic = null;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Cover picture deleted successfully'
  });
});

// Admin: Get user by ID
const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Admin: Update user
const updateUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, gender, role, isConfirmed, bannedAt } = req.body;
  
  // Create object with allowed fields
  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (gender) updateData.gender = gender;
  if (role) updateData.role = role;
  if (isConfirmed !== undefined) updateData.isConfirmed = isConfirmed;
  if (bannedAt !== undefined) updateData.bannedAt = bannedAt || null;
  
  // Add updatedBy field
  updateData.updatedBy = req.user._id;
  
  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!updatedUser) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Admin: Ban user
const banUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Update ban status
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

// Admin: Unban user
const unbanUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Update ban status
  user.bannedAt = null;
  user.updatedBy = req.user._id;
  
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully',
    data: {
      user
    }
  });
});

// Soft delete user (mark as deleted)
const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Mark user as deleted
  user.deletedAt = Date.now();
  await user.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get profile data for another user
const getUserProfile = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // Find user by ID
  const user = await User.findById(userId);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Only return specific fields (userName, mobileNumber, profilePic, coverPic)
  const userProfile = {
    userName: user.username, // virtual field (firstName + lastName)
    mobileNumber: user.mobileNumber, // will be automatically decrypted by the getter
    profilePic: user.profilePic,
    coverPic: user.coverPic
  };
  
  res.status(200).json({
    status: 'success',
    data: {
      user: userProfile
    }
  });
});

module.exports = {
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
  refreshToken,
  googleLogin,
  googleSignUp,
  getUserProfile,
  deleteCoverPicture,
  deleteProfilePicture
};