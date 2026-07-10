const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb){
    cb(null, 'challenge-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 1. Fetch Trending Challenges Stream
router.get('/feed', async (req, res) => {
  try {
    const feed = await Challenge.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar profilePicture');
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload / Join a Challenge
router.post('/upload', [auth, upload.single('video')], async (req, res) => {
  try {
    const { caption, songTitle, choirOrArtist, parentChallengeId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Please attach a media file." });
    }

    const dbUser = await User.findById(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ error: "User account not found." });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    let isOriginalSound = true;
    let audioSourceUrl = videoUrl;

    if (parentChallengeId) {
      const parent = await Challenge.findById(parentChallengeId);
      if (parent) {
        isOriginalSound = false;
        audioSourceUrl = parent.audioSourceUrl;
      }
    }

    const newChallenge = new Challenge({
      user: req.user.id,
      username: dbUser.name || dbUser.username || "Kabula", 
      videoUrl,
      caption,
      songTitle,
      choirOrArtist: choirOrArtist || "Unknown Group",
      isOriginalSound,
      parentChallengeId: parentChallengeId || null,
      audioSourceUrl
    });

    const saved = await newChallenge.save();
    
    const populatedChallenge = await Challenge.findById(saved._id)
      .populate('user', 'name username avatar profilePicture');

    res.status(201).json(populatedChallenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Increment Video Views
router.post('/:id/view', async (req, res) => {
  try {
    await Challenge.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Not found" });
    if (challenge.user.toString() !== req.user.id) return res.status(401).json({ error: "Unauthorized" });

    await challenge.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Toggle Likes
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Challenge.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Missing entry" });

    const index = post.likes.indexOf(req.user.id);
    if (index === -1) post.likes.push(req.user.id);
    else post.likes.splice(index, 1);

    await post.save();
    res.json({ likesCount: post.likes.length, hasLiked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
