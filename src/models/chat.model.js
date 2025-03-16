const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const chatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
    validate: {
      validator: async function(value) {
        // Check if sender is an HR or company owner
        const User = mongoose.model('User');
        const user = await User.findById(value);
        
        if (!user) return false;
        
        // Check if user is admin
        if (user.role === 'Admin') return true;
        
        // Check if user is an HR or company owner
        const Company = mongoose.model('Company');
        const isCompanyOwner = await Company.exists({ createdBy: value });
        const isHR = await Company.exists({ HRs: { $in: [value] } });
        
        return isCompanyOwner || isHR;
      },
      message: 'Sender must be an HR or company owner'
    }
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver ID is required']
  },
  messages: [messageSchema]
}, { 
  timestamps: true 
});

// Create compound index for senderId and receiverId for faster queries
chatSchema.index({ senderId: 1, receiverId: 1 });

// Populate sender and receiver details when querying
chatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'senderId',
    select: 'firstName lastName email profilePic'
  })
  .populate({
    path: 'receiverId',
    select: 'firstName lastName email profilePic'
  })
  .populate({
    path: 'messages.senderId',
    select: 'firstName lastName email profilePic'
  });
  
  next();
});

// Create the Chat model
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;