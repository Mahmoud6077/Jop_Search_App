// User constants
const USER_ROLES = {
  USER: 'User',
  ADMIN: 'Admin'
};

const GENDER = {
  MALE: 'Male',
  FEMALE: 'Female'
};

const PROVIDER = {
  GOOGLE: 'google',
  SYSTEM: 'system'
};

const OTP_TYPES = {
  CONFIRM_EMAIL: 'confirmEmail',
  FORGET_PASSWORD: 'forgetPassword'
};

// Job constants
const JOB_LOCATION = {
  ONSITE: 'onsite',
  REMOTE: 'remotely',
  HYBRID: 'hybrid'
};

const WORKING_TIME = {
  PART_TIME: 'part-time',
  FULL_TIME: 'full-time'
};

const SENIORITY_LEVEL = {
  FRESH: 'fresh',
  JUNIOR: 'Junior',
  MID_LEVEL: 'Mid-Level',
  SENIOR: 'Senior',
  TEAM_LEAD: 'Team-Lead',
  CTO: 'CTO'
};

// Application constants
const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  VIEWED: 'viewed',
  IN_CONSIDERATION: 'in consideration',
  REJECTED: 'rejected'
};

// Regex patterns
const REGEX_PATTERNS = {
  EMAIL: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  PHONE: /^\+?[0-9]{10,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// File upload related constants
const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/pdf'],
  ALL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
};

const FILE_SIZE_LIMITS = {
  PROFILE_PIC: 2 * 1024 * 1024, // 2MB
  COVER_PIC: 5 * 1024 * 1024,   // 5MB
  CV: 10 * 1024 * 1024,         // 10MB
  LEGAL_DOC: 20 * 1024 * 1024   // 20MB
};

// Export all constants
module.exports = {
  USER_ROLES,
  GENDER,
  PROVIDER,
  OTP_TYPES,
  JOB_LOCATION,
  WORKING_TIME,
  SENIORITY_LEVEL,
  APPLICATION_STATUS,
  REGEX_PATTERNS,
  FILE_TYPES,
  FILE_SIZE_LIMITS
};