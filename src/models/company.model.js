const mongoose = require('mongoose');

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

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters long']
  },
  description: {
    type: String,
    required: [true, 'Company description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters long']
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  numberOfEmployees: {
    type: String,
    required: [true, 'Number of employees is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Check if the format is like "11-20 employee" or similar
        return /^\d+-\d+ employee(s)?$/.test(value);
      },
      message: 'Number of employees must be in the format "11-20 employee"'
    }
  },
  companyEmail: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
      'Please provide a valid email address'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Company creator is required']
  },
  Logo: {
    type: fileSchema,
    default: null
  },
  coverPic: {
    type: fileSchema,
    default: null
  },
  HRs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bannedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  legalAttachment: {
    type: fileSchema,
    required: [true, 'Legal attachment is required']
  },
  approvedByAdmin: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Add query middleware to exclude deleted and banned companies by default
companySchema.pre(/^find/, function(next) {
  this.find({
    deletedAt: null,
    bannedAt: null
  });
  next();
});

// Add hooks to delete related documents when a company is deleted
companySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const companyId = this._id;
    
    // Delete all job opportunities related to this company
    await mongoose.model('Job').deleteMany({ companyId });
    
    // Find job IDs associated with this company to delete applications
    const jobs = await mongoose.model('Job').find({ companyId }, '_id');
    const jobIds = jobs.map(job => job._id);
    
    if (jobIds.length > 0) {
      // Delete all applications for jobs of this company
      await mongoose.model('Application').deleteMany({ jobId: { $in: jobIds } });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

companySchema.virtual('jobs', {
  ref: 'Job',
  localField: '_id',
  foreignField: 'companyId'
});

// Create the Company model
const Company = mongoose.model('Company', companySchema);

module.exports = Company;