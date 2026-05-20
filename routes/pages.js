const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Page = require('../models/Page');

// Get all official pages
router.get('/', auth, async (req, res) => {
  try {
    const pages = await Page.find().sort({ isVerified: -1 });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow/Unfollow a page
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ msg: "Page not found" });

    const index = page.followers.indexOf(req.user.id);
    if (index === -1) {
      page.followers.push(req.user.id);
    } else {
      page.followers.splice(index, 1);
    }

    await page.save();
    res.json({ followersCount: page.followers.length, isFollowing: index === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Create a new official page (Admin Only)
router.post('/', auth, async (req, res) => {
  try {
    // Basic security check: Only admins/pastors can create pages
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin' && user.role !== 'pastor') {
      return res.status(403).json({ msg: "Unauthorized to create official pages" });
    }

    const { name, description, category, website, isVerified } = req.body;
    const newPage = new Page({
      name,
      description,
      category,
      website,
      isVerified,
      owner: req.user.id
    });

    await newPage.save();
    res.status(201).json(newPage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
