const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { USER_ROLES, GENDER, PROVIDER, OTP_TYPES } = require('../config/constants');

const otpSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(OTP_TYPES),
    required: true
  },
  expiresIn: {
    type: Date,
    required: true
  }
}, { _id: false });

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

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: function() {
      return this.provider === PROVIDER.SYSTEM;
    },
    minlength: [8, 'Password must be at least 8 characters long']
  },
  provider: {
    type: String,
    enum: Object.values(PROVIDER),
    default: PROVIDER.SYSTEM
  },
  gender: {
    type: String,
    enum: Object.values(GENDER),
    required: [true, 'Gender is required']
  },
  DOB: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        // Check if date is in the past
        const currentDate = new Date();
        if (value >= currentDate) {
          return false;
        }

        // Check if age is greater than 18
        const ageDiff = currentDate.getFullYear() - value.getFullYear();
        const monthDiff = currentDate.getMonth() - value.getMonth();
        const dayDiff = currentDate.getDate() - value.getDate();

        if (ageDiff > 18) {
          return true;
        }
        if (ageDiff === 18 && monthDiff > 0) {
          return true;
        }
        if (ageDiff === 18 && monthDiff === 0 && dayDiff >= 0) {
          return true;
        }
        return false;
      },
      message: 'User must be at least 18 years old and DOB must be a past date'
    }
  },
  mobileNumber: {
    type: String,
    trim: true,
    set: function(value) {
    // Store encrypted value
    if (value) {
      this._plainMobileNumber = value;
      return encryptData(value);
    }
    return value;
  },
  get: function(value) {
    // Return decrypted value
    if (value) {
      try {
        return decryptData(value);
      } catch (error) {
        console.error('Error decrypting mobile number:', error.message);
        return value; // Return as-is if decryption fails
      }
    }
    return value;
  }
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  bannedAt: {
    type: Date,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  changeCredentialTime: {
    type: Date,
    default: Date.now
  },
  profilePic: {
    type: fileSchema,
    default: null
  },
  coverPic: {
    type: fileSchema,
    default: null
  },
  OTP: {
    type: [otpSchema],
    default: []
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Virtual field for username (firstName + lastName)
userSchema.virtual('username').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash the password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const encryptData = (text) => {
  if (!text) return null;
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-encryption-key-should-be-32-chars', 'utf-8');
  const iv = Buffer.from(process.env.ENCRYPTION_IV || 'your-iv-should-be-16-characters', 'utf-8');
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptData = (encryptedText) => {
  if (!encryptedText) return null;
   const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(encryptedText)) {
    return encryptedText; // Return as is if it's not in hex format
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-encryption-key-should-be-32-chars', 'utf-8');
    const iv = Buffer.from(process.env.ENCRYPTION_IV || 'your-iv-should-be-16-characters', 'utf-8');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    // Return the original text if decryption fails
    return encryptedText;
  }
};
// Method to check if password matches
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add query middleware to exclude deleted and banned users by default
userSchema.pre(/^find/, function(next) {
  // this refers to the current query
  this.find({ 
    deletedAt: null,
    bannedAt: null
  });
  next();
});

// Add hooks to delete related documents when a user is deleted
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const userId = this._id;
    
    // Delete related applications
    await mongoose.model('Application').deleteMany({ userId });
    
    // Delete chats where user is sender or receiver
    await mongoose.model('Chat').deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });
    
    // Update company HRs array to remove this user
    await mongoose.model('Company').updateMany(
      { HRs: userId },
      { $pull: { HRs: userId } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;