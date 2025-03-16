const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OTP_TYPES } = require('../config/constants');

// OTP expiration time (in minutes)
const OTP_EXPIRY = {
  [OTP_TYPES.CONFIRM_EMAIL]: 60, // 60 minutes
  [OTP_TYPES.FORGET_PASSWORD]: 15 // 15 minutes
};

// Generate a random OTP code
const generateOTP = (length = 6) => {
  // Generate a random numeric code
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp.padStart(length, '0');
};

// Hash OTP for secure storage
const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

// Verify OTP
const verifyOTP = async (plainOTP, hashedOTP) => {
  return await bcrypt.compare(plainOTP, hashedOTP);
};

// Create OTP object with expiry
const createOTP = async (type) => {
  const plainOTP = generateOTP();
  const hashedOTP = await hashOTP(plainOTP);
  
  // Calculate expiry time
  const expiryMinutes = OTP_EXPIRY[type] || 15; // Default to 15 minutes
  const expiresIn = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return {
    code: hashedOTP,
    type,
    expiresIn,
    plainCode: plainOTP // This will be sent to the user but not stored
  };
};

// Check if OTP is valid and not expired
const isValidOTP = (user, type, code) => {
  // Find the OTP of the specified type
  const otpEntry = user.OTP.find(otp => otp.type === type);
  
  if (!otpEntry) {
    return false;
  }
  
  // Check if OTP is expired
  if (new Date() > otpEntry.expiresIn) {
    return false;
  }
  
  return otpEntry;
};

// Remove OTP after use
const removeOTP = async (user, type) => {
  // Remove the OTP of the specified type
  user.OTP = user.OTP.filter(otp => otp.type !== type);
  await user.save();
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  createOTP,
  isValidOTP,
  removeOTP
};