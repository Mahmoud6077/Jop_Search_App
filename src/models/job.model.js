const mongoose = require('mongoose');
const { JOB_LOCATION, WORKING_TIME, SENIORITY_LEVEL } = require('../config/constants');

const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [3, 'Job title must be at least 3 characters long']
  },
  jobLocation: {
    type: String,
    enum: Object.values(JOB_LOCATION),
    required: [true, 'Job location is required']
  },
  workingTime: {
    type: String,
    enum: Object.values(WORKING_TIME),
    required: [true, 'Working time is required']
  },
  seniorityLevel: {
    type: String,
    enum: Object.values(SENIORITY_LEVEL),
    required: [true, 'Seniority level is required']
  },
  jobDescription: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [50, 'Job description must be at least 50 characters long']
  },
  technicalSkills: [{
    type: String,
    required: [true, 'At least one technical skill is required']
  }],
  softSkills: [{
    type: String,
    required: [true, 'At least one soft skill is required']
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'HR ID is required for job creation']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closed: {
    type: Boolean,
    default: false
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required']
  }
}, { 
  timestamps: true 
});

// Populate company and HR details when querying
jobSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'companyId',
    select: 'companyName industry Logo approvedByAdmin'
  })
  .populate({
    path: 'addedBy',
    select: 'firstName lastName email profilePic'
  })
  .populate({
    path: 'updatedBy',
    select: 'firstName lastName email profilePic'
  });
  
  next();
});

// Add hooks to delete related applications when a job is deleted
jobSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const jobId = this._id;
    
    // Delete all applications for this job
    await mongoose.model('Application').deleteMany({ jobId });
    
    next();
  } catch (error) {
    next(error);
  }
});

// virtual for applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId'
});

// Create the Job model
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;