const express = require('express');
const auth = require('../middleware/auth');
const { getConversation, sendMessage, toggleReaction } = require('../controllers/messageController');

const router = express.Router();

router.get('/:userId', auth, getConversation);
router.post('/:userId', auth, sendMessage);
router.post('/reaction/:messageId', auth, toggleReaction);

module.exports = router;
