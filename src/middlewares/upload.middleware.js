const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { AppError } = require('./error.middleware');
const { FILE_TYPES, FILE_SIZE_LIMITS } = require('../config/constants');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir); // Using the same uploadDir variable here
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400), false);
    }
  };
};

// Create upload middleware for different file types
const createUploadMiddleware = (fieldName, fileTypes, maxSize) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSize
    },
    fileFilter: fileFilter(fileTypes)
  }).single(fieldName);
};

// Middleware for handling multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Please upload a smaller file.', 400));
    }
    return next(new AppError(`Multer error: ${err.message}`, 400));
  }
  
  next(err);
};

// Upload middleware for user profile picture
const uploadProfilePic = (req, res, next) => {
  const upload = createUploadMiddleware('profilePic', FILE_TYPES.IMAGE, FILE_SIZE_LIMITS.PROFILE_PIC);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

// Upload middleware for user cover picture
const uploadCoverPic = (req, res, next) => {
  const upload = createUploadMiddleware('coverPic', FILE_TYPES.IMAGE, FILE_SIZE_LIMITS.COVER_PIC);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

// Upload middleware for company logo
const uploadCompanyLogo = (req, res, next) => {
  const upload = createUploadMiddleware('logo', FILE_TYPES.IMAGE, FILE_SIZE_LIMITS.PROFILE_PIC);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

// Upload middleware for company cover picture
const uploadCompanyCover = (req, res, next) => {
  const upload = createUploadMiddleware('coverPic', FILE_TYPES.IMAGE, FILE_SIZE_LIMITS.COVER_PIC);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

// Upload middleware for legal attachment
const uploadLegalAttachment = (req, res, next) => {
  const upload = createUploadMiddleware('legalAttachment', FILE_TYPES.ALL, FILE_SIZE_LIMITS.LEGAL_DOC);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

// Upload middleware for user CV
const uploadUserCV = (req, res, next) => {
  const upload = createUploadMiddleware('userCV', FILE_TYPES.DOCUMENT, FILE_SIZE_LIMITS.CV);
  
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
};

module.exports = {
  uploadProfilePic,
  uploadCoverPic,
  uploadCompanyLogo,
  uploadCompanyCover,
  uploadLegalAttachment,
  uploadUserCV
};