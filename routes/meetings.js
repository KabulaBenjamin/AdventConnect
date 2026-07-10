const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Meeting = require('../models/Meeting'); // Ensure this model exists
const Post = require('../models/Post');       // For auto-sharing to Feed

// @route   GET api/meetings/verify/:roomId
// @desc    Verify if a room exists and check if the current user is the true host
router.get('/verify/:roomId', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });
    
    if (!meeting) {
      return res.status(404).json({ msg: 'Gathering room not found or has expired' });
    }

    // Determine if the authenticated user is the database owner/host of this room
    const isHost = meeting.host.toString() === req.user.id.toString();

    res.json({
      success: true,
      title: meeting.title,
      isHost: isHost
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error validating room authority');
  }
});

// @route   POST api/meetings/schedule
// @desc    Schedule a meeting with custom privacy category and auto-share link to feed
router.post('/schedule', auth, async (req, res) => {
  try {
    const { title, description, startTime, endTime, isInstant, category } = req.body;
    const selectedCategory = category || 'global';

    let roomId = req.body.roomId;
    if (!roomId) {
      const part = (len) => Array.from({ length: len }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
      roomId = `${part(3)}-${part(4)}-${part(3)}`;
    }

    const newMeeting = new Meeting({
      roomId,
      title,
      description,
      startTime,
      endTime,
      isInstant,
      category: selectedCategory,
      host: req.user.id,
      status: 'active'
    });
    await newMeeting.save();

    let feedAnnouncement = `📅 **New Gathering Scheduled**\n\n**Title:** ${title}\n**Category:** ${selectedCategory.toUpperCase()}\n\nJoin the fellowship room here: http://localhost:3000/meeting/${roomId}`;

    if (description) {
      feedAnnouncement += `\n\n*Focus:* ${description}`;
    }

    const sharePost = new Post({
      author: req.user.id,
      content: feedAnnouncement,
      scope: selectedCategory
    });
    await sharePost.save();

    res.json({ success: true, meeting: newMeeting, sharedPost: sharePost });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error configuring gathering');
  }
});

module.exports = router;
