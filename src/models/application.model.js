const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

const fileSchema = new mongoose.Schema({
  secure_url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userCV: {
    type: fileSchema,
    required: [true, 'User CV is required']
  },
  status: {
    type: String,
    enum: Object.values(APPLICATION_STATUS),
    default: APPLICATION_STATUS.PENDING
  },
  notes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

// Create compound index for jobId and userId to ensure uniqueness
applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// Populate job and user details when querying
applicationSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'jobId',
    select: 'jobTitle jobLocation workingTime seniorityLevel companyId'
  })
  .populate({
    path: 'userId',
    select: 'firstName lastName email profilePic'
  })
  .populate({
    path: 'reviewedBy',
    select: 'firstName lastName email'
  });
  
  next();
});

// Create the Application model
const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;