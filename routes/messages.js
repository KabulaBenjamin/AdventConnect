const express = require('express');
const auth = require('../middleware/auth');
const { getConversation, sendMessage } = require('../controllers/messageController');

const router = express.Router();

router.get('/:userId', auth, getConversation);
router.post('/:userId', auth, sendMessage);

module.exports = router;
