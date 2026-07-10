const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET Current Logged In User Data Profile Context
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) return res.status(404).json({ error: "Profile not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error fetching self data profile." });
  }
});

// GET People You May Know Suggestions Pipeline
router.get('/suggestions', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Fetch a pool of users who aren't the current user, aren't already friends, and haven't sent a request
    const currentUser = await User.findById(userId);
    const excludeIds = [userId, ...(currentUser.friends || []), ...(currentUser.friendRequests || [])];

    const suggestions = await User.find({ _id: { $nin: excludeIds } })
      .select('username avatar currentCity localChurch')
      .limit(10);

    res.json(suggestions || []);
  } catch (err) {
    console.error("❌ Suggestions pipeline failure:", err);
    res.status(500).json({ error: "Failed to pull church registry suggestions." });
  }
});

// Onboarding Synchronization Endpoint
router.put('/onboarding-sync', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized token structure context missing." });

    const { avatar, currentCity, latitude, longitude } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Profile registry not found." });

    if (avatar !== undefined) user.avatar = avatar;
    if (currentCity !== undefined) user.currentCity = currentCity;

    if (latitude !== undefined && longitude !== undefined) {
      user.locationCoordinates = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error syncing registration assets." });
  }
});

// GET Pending Friend Requests Pipeline
router.get('/friend-requests/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).populate('friendRequests', 'username avatar email');
    if (!user) return res.status(404).json({ error: "User profile registry not found." });
    res.json(user.friendRequests || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve pending friend requests." });
  }
});

// POST Send Friend Request
router.post('/friend-request/send', auth, async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { targetUserId } = req.body;

    if (senderId === targetUserId) {
      return res.status(400).json({ error: "You cannot send a connection request to yourself." });
    }

    const targetUser = await User.find({ _id: targetUserId });
    if (!targetUser || targetUser.length === 0) {
      return res.status(404).json({ error: "Target recipient profile not found." });
    }
    
    const operationalUser = targetUser[0];

    if (operationalUser.friendRequests.includes(senderId)) {
      return res.status(400).json({ error: "Friend request is already pending." });
    }
    if (operationalUser.friends && operationalUser.friends.includes(senderId)) {
      return res.status(400).json({ error: "You are already connected as friends." });
    }

    operationalUser.friendRequests.push(senderId);
    await operationalUser.save();

    res.json({ success: true, message: "Friend request transmitted successfully." });
  } catch (err) {
    console.error("❌ Send Friend Request Error:", err);
    res.status(500).json({ error: "Failed to process friend request distribution." });
  }
});

// POST Respond to Friend Request
router.post('/friend-request/respond', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { senderId, action } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Profile not found." });

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== senderId);

    if (action === 'accept') {
      if (!user.friends) user.friends = [];
      if (!user.friends.includes(senderId)) user.friends.push(senderId);
      
      const senderUser = await User.findById(senderId);
      if (senderUser) {
        if (!senderUser.friends) senderUser.friends = [];
        if (!senderUser.friends.includes(userId)) senderUser.friends.push(userId);
        await senderUser.save();
      }
    }

    await user.save();
    res.json({ success: true, actionCompleted: action });
  } catch (err) {
    res.status(500).json({ error: "Internal server error handling handshake response." });
  }
});

module.exports = router;
