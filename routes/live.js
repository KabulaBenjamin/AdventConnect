const express = require('express');
const auth = require('../middleware/auth');
const { getLiveStreams, createLiveStream, updateStreamStatus } = require('../controllers/liveController');

const router = express.Router();

router.get('/', auth, getLiveStreams);
router.post('/', auth, createLiveStream);
router.patch('/:id/status', auth, updateStreamStatus);

module.exports = router;
