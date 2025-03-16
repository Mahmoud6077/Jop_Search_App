const express = require('express');
const router = express.Router();

// Import controllers
const {
  createOrGetChat,
  sendMessage,
  getChatById,
  getUserChats,
  deleteChat,
  getChatHistory
} = require('../controllers/chat.controller');

// Import middlewares
const { verifyToken } = require('../middlewares/auth.middleware');
const { validate, validateParam } = require('../middlewares/validation.middleware');

// Import validators
const {
  createChatSchema,
  sendMessageSchema,
  getChatHistorySchema,
  getChatListSchema,
} = require('../validators/chat.validator');

// All routes require authentication
router.use(verifyToken);

// Create or get a chat
router.post('/', validate(createChatSchema), createOrGetChat);

// Get user's chats
router.get('/', validate(getChatListSchema), getUserChats);

// Get chat history with a specific user - place this BEFORE the /:id route
router.get('/history/:userId', validateParam('userId'), getChatHistory);

// Chat specific routes
router.route('/:id')
  .get(validateParam('id'), validate(getChatHistorySchema), getChatById)
  .delete(validateParam('id'), deleteChat);

// Send a message in a chat
router.post('/:id/messages', validateParam('id'), validate(sendMessageSchema), sendMessage);

module.exports = router;