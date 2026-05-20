const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');

// Get all groups (Discovery)
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find().populate('admin', 'username');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const newGroup = new Group({
      name,
      description,
      category,
      admin: req.user.id,
      members: [req.user.id] // Creator is the first member
    });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });
    
    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ msg: "Already a member" });
    }

    group.members.push(req.user.id);
    await group.save();
    res.json({ msg: "Joined successfully", group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
