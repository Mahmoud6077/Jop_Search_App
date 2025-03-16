const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const Company = require('../models/company.model');
const { catchAsync, AppError } = require('../middlewares/error.middleware');

// Helper function to check if a user is an HR for any company
const isUserHR = async (userId) => {
  const companies = await Company.find({
    $or: [
      { createdBy: userId },
      { HRs: userId }
    ]
  });
  
  return companies.length > 0;
};

// Create or get a chat
const createOrGetChat = catchAsync(async (req, res, next) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  if (!receiverId) {
    return next(new AppError('Receiver ID is required', 400));
  }

  // Prevent creating chat with yourself
  if (senderId.equals(receiverId)) {
    return next(new AppError('Cannot create a chat with yourself', 400));
  }
  
  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return next(new AppError('Receiver not found', 404));
  }
  
  // Check if sender is HR/company owner (unless admin)
  if (req.user.role !== 'Admin') {
    const isHR = await isUserHR(senderId);
    if (!isHR) {
      return next(new AppError('Only HR, company owner, or admin can initiate chats', 403));
    }
  }
  
  // Find existing chat
  let chat = await Chat.findOne({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId }
    ]
  });
  
  // If chat doesn't exist, create a new one
  if (!chat) {
    chat = await Chat.create({
      senderId,
      receiverId,
      messages: []
    });
    
    // Populate sender and receiver details
    await chat.populate({
      path: 'senderId',
      select: 'firstName lastName email profilePic'
    });
    
    await chat.populate({
      path: 'receiverId',
      select: 'firstName lastName email profilePic'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      chat
    }
  });
});

// Send a message in a chat
const sendMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;
  const userId = req.user._id;
  const chatId = req.params.id;
  
  // Find chat
  const chat = await Chat.findById(chatId);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is part of the chat
  const isParticipant = chat.senderId._id.equals(userId) || chat.receiverId._id.equals(userId);
  if (!isParticipant && req.user.role !== 'Admin') {
    return next(new AppError('You are not a participant in this chat', 403));
  }
  
  // Validate if sender is HR/company owner (unless admin)
  if (req.user.role !== 'Admin' && !chat.senderId._id.equals(userId)) {
    const isHR = await isUserHR(userId);
    if (!isHR) {
      return next(new AppError('Only HR, company owner, or admin can send messages', 403));
    }
  }
  
  // Add message to chat
  chat.messages.push({
    message,
    senderId: userId,
    createdAt: Date.now()
  });
  
  await chat.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      chat
    }
  });
});

// Get chat by ID
const getChatById = catchAsync(async (req, res, next) => {
  const chatId = req.params.id;
  const userId = req.user._id;
  
  // Find chat with populated sender and receiver
  const chat = await Chat.findById(chatId);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is part of the chat
  const isParticipant = chat.senderId._id.equals(userId) || chat.receiverId._id.equals(userId);
  if (!isParticipant && req.user.role !== 'Admin') {
    return next(new AppError('You are not a participant in this chat', 403));
  }
  
  // Pagination for messages
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Get messages with pagination
  const totalMessages = chat.messages.length;
  const paginatedMessages = chat.messages.slice(startIndex, endIndex).reverse(); // Most recent first
  
  const chatData = {
    _id: chat._id,
    senderId: chat.senderId,
    receiverId: chat.receiverId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: paginatedMessages
  };
  
  res.status(200).json({
    status: 'success',
    pagination: {
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: page,
      messagesPerPage: limit
    },
    data: {
      chat: chatData
    }
  });
});


// Get chat history with a specific user
const getChatHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;
  
  // Find chat between these two users
  const chat = await Chat.findOne({
    $or: [
      { senderId: currentUserId, receiverId: userId },
      { senderId: userId, receiverId: currentUserId }
    ]
  }).populate({
    path: 'senderId',
    select: 'firstName lastName email profilePic'
  }).populate({
    path: 'receiverId',
    select: 'firstName lastName email profilePic'
  }).populate({
    path: 'messages.senderId',
    select: 'firstName lastName email profilePic'
  });
  
  // If no chat exists yet, return empty messages array
  if (!chat) {
    return res.status(200).json({
      status: 'success',
      data: {
        chat: null,
        messages: []
      }
    });
  }
  
  // Pagination options
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  
  // Get total messages count
  const totalMessages = chat.messages.length;
  
  // Get paginated messages (sorted by newest first)
  const paginatedMessages = chat.messages
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(startIndex, startIndex + limit);
  
  res.status(200).json({
    status: 'success',
    data: {
      chat: {
        _id: chat._id,
        senderId: chat.senderId,
        receiverId: chat.receiverId
      },
      messages: paginatedMessages,
      pagination: {
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page,
        messagesPerPage: limit
      }
    }
  });
});


// Get user's chat list
const getUserChats = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  
  // Find all chats where user is sender or receiver
  const chats = await Chat.find({
    $or: [
      { senderId: userId },
      { receiverId: userId }
    ]
  }).sort({ updatedAt: -1 });
  
  // Create simple chat preview objects with last message
  const chatPreviews = chats.map(chat => {
    const otherUser = chat.senderId._id.equals(userId) ? chat.receiverId : chat.senderId;
    const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
    
    return {
      _id: chat._id,
      otherUser: {
        _id: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        profilePic: otherUser.profilePic
      },
      lastMessage: lastMessage ? {
        message: lastMessage.message,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt
      } : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    };
  });
  
  res.status(200).json({
    status: 'success',
    results: chatPreviews.length,
    data: {
      chats: chatPreviews
    }
  });
});

// Delete a chat
const deleteChat = catchAsync(async (req, res, next) => {
  const chatId = req.params.id;
  const userId = req.user._id;
  
  // Find chat
  const chat = await Chat.findById(chatId);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is part of the chat or admin
  const isParticipant = chat.senderId._id.equals(userId) || chat.receiverId._id.equals(userId);
  if (!isParticipant && req.user.role !== 'Admin') {
    return next(new AppError('You are not authorized to delete this chat', 403));
  }
  
  // Delete chat
  await chat.deleteOne();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  createOrGetChat,
  sendMessage,
  getChatById,
  getUserChats,
  deleteChat,
  getChatHistory
};