const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); 

// @route   PUT api/users/profile-update
router.put('/profile-update', auth, async (req, res) => {
  const { bio, localChurch } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { bio, localChurch } },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/friend-request/:id
// @desc    Send a friend request
router.post('/friend-request/:id', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);

    if (!userToFollow || !me) return res.status(404).json({ msg: "User not found" });

    // Check if already requested (prevent duplicates)
    if (userToFollow.friendRequests?.includes(req.user.id)) {
      return res.status(400).json({ msg: "Request already sent" });
    }

    userToFollow.friendRequests.push(req.user.id);
    await userToFollow.save();
    
    res.json({ msg: "Friend request sent successfully" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .limit(5)
      .select('username localChurch bio profilePic');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
