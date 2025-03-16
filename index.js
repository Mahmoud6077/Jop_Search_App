// packages
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initCronJobs } = require('./src/utils/cronJobs');

dotenv.config();
const app = express();

const http = require('http');
const socketIo = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join user's personal room
  socket.on('joinUserRoom', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room: user_${userId}`);
  });

  // Join room for HR notifications (company ID as room name)
  socket.on('joinCompanyRoom', (companyId) => {
    socket.join(`company_${companyId}`);
    console.log(`Socket ${socket.id} joined room: company_${companyId}`);
  });

   // Join chat room
  socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Socket ${socket.id} joined chat room: chat_${chatId}`);
  });

  // Handle new chat message
  socket.on('sendMessage', async (data) => {
    try {
      const { chatId, message, senderId, receiverId, token } = data;
      
      // Verify user through token
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        socket.emit('error', { message: 'Invalid or expired token' });
        return;
      }
      
      // Verify that sender matches the token
      if (userId !== senderId) {
        socket.emit('error', { message: 'Unauthorized sender' });
        return;
      }
      
      // Construct date for the message
      const messageDate = new Date();
      
      // If chat exists, add message to it
      if (chatId) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }
        
        // Add message to chat
        chat.messages.push({
          message,
          senderId: userId,
          createdAt: messageDate
        });
        
        await chat.save();
        
        // Emit message to chat room
        io.to(`chat_${chatId}`).emit('newMessage', {
          chatId,
          message: {
            _id: chat.messages[chat.messages.length - 1]._id,
            message,
            senderId: userId,
            createdAt: messageDate
          }
        });
        
        return;
      }
      
      // If no chatId, this is a new chat
      // Check if sender is HR or company owner
      const sender = await User.findById(userId);
      if (!sender) {
        socket.emit('error', { message: 'Sender not found' });
        return;
      }
      
      // Check if receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        socket.emit('error', { message: 'Receiver not found' });
        return;
      }
      
      // Verify that sender is HR or company owner if initiating
      const isAdmin = sender.role === 'Admin';
      
      if (!isAdmin) {
        // Check if sender is HR or company owner
        const companies = await Company.find({
          $or: [
            { createdBy: userId },
            { HRs: userId }
          ]
        });
        
        if (companies.length === 0) {
          socket.emit('error', { message: 'Only HR or company owner can initiate chat' });
          return;
        }
      }
      
      // Create new chat
      const newChat = await Chat.create({
        senderId: userId,
        receiverId,
        messages: [{
          message,
          senderId: userId,
          createdAt: messageDate
        }]
      });
      
      // Populate sender and receiver details
      await newChat.populate({
        path: 'senderId',
        select: 'firstName lastName email profilePic'
      });
      
      await newChat.populate({
        path: 'receiverId',
        select: 'firstName lastName email profilePic'
      });
      
      // Emit new chat created event to both sender and receiver
      io.to(`user_${userId}`).emit('chatCreated', {
        chat: {
          _id: newChat._id,
          senderId: newChat.senderId,
          receiverId: newChat.receiverId,
          createdAt: newChat.createdAt
        },
        message: {
          _id: newChat.messages[0]._id,
          message,
          senderId: userId,
          createdAt: messageDate
        }
      });
      
      io.to(`user_${receiverId}`).emit('chatCreated', {
        chat: {
          _id: newChat._id,
          senderId: newChat.senderId,
          receiverId: newChat.receiverId,
          createdAt: newChat.createdAt
        },
        message: {
          _id: newChat.messages[0]._id,
          message,
          senderId: userId,
          createdAt: messageDate
        }
      });
      
    } catch (error) {
      console.error('Message sending error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available globally (for use in controllers)
app.set('io', io);

// Connect to DB
require('./src/config/connection');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://mydomain.com', /\.mydomain\.com$/] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(limiter);

// Logger middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1', require('./src/routes'));

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the error 
  console.error(`Error ${statusCode}: ${message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Initialize CRON jobs
  initCronJobs();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const { migrateMobileNumbers } = require('./src/utils/migrateEncryption');


// migrateMobileNumbers();