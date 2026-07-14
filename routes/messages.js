const express = require('express');
const auth = require('../middleware/auth');
const { getConversation, sendMessage, toggleReaction, markAsRead } = require('../controllers/messageController');
const { validateMessageSend, validateReaction } = require('../middleware/validators');

const router = express.Router();

// Get paginated conversation history
router.get('/:userId', auth, getConversation);

// Send a validated message (supports media URLs/attachments)
router.post('/:userId', [auth, validateMessageSend], sendMessage);

// Toggle or remove standard/custom reactions
router.post('/reaction/:messageId', [auth, validateReaction], toggleReaction);

// Mark incoming messages in a conversation as read
router.patch('/read/:userId', auth, markAsRead);

module.exports = router;