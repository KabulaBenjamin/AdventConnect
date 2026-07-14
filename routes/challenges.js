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

// ─── 1. FETCH MAIN FEED (WITH DEEP POPULATED PARENTS/REMIXES) ───
router.get('/feed', async (req, res) => {
  try {
    const feed = await Challenge.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar profilePicture')
      .populate({
        path: 'parentChallengeId',
        select: 'username caption user',
        populate: { path: 'user', select: 'username name' } // Populates original creator of the remix source
      });
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. FETCH TRENDING CHALLENGES (MOST VIEWS/ENGAGEMENT) ───
router.get('/trending', async (req, res) => {
  try {
    const trending = await Challenge.find()
      .sort({ views: -1, 'reactions.praise': -1 }) // Sort by views and praise
      .limit(10)
      .populate('user', 'name username avatar profilePicture');
    res.json(trending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. UPLOAD / JOIN A CHALLENGE ───
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
      username: dbUser.username || dbUser.name || "User", 
      videoUrl,
      caption,
      songTitle,
      choirOrArtist: choirOrArtist || "Unknown Artist",
      isOriginalSound,
      parentChallengeId: parentChallengeId || null,
      audioSourceUrl,
      reactions: { hot: 0, praise: 0, love: 0, anointed: 0 }
    });

    const saved = await newChallenge.save();
    
    const populatedChallenge = await Challenge.findById(saved._id)
      .populate('user', 'name username avatar profilePicture')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });

    res.status(201).json(populatedChallenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. INCREMENT VIDEO VIEWS (PROFESSIONAL UNIQUE DE-DUPLICATION) ───
router.post('/:id/view', async (req, res) => {
  try {
    const locationHeader = req.headers['x-user-location'] || 'Unknown Region';
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Professional tracking check: Use combination of unique reach header profiles
    // to verify if this specific geolocation session already counted to prevent refresh farming.
    const uniqueSessionKey = `${locationHeader}-${req.ip}`;
    const isUniqueViewer = !challenge.uniqueReach.includes(uniqueSessionKey);

    if (isUniqueViewer) {
      challenge.uniqueReach.push(uniqueSessionKey);
      challenge.views = (challenge.views || 0) + 1;

      // Increment geolocation specific tracking map counters
      const existingLoc = challenge.locationBreakdown.find(l => l.locationName === locationHeader);
      if (existingLoc) {
        existingLoc.count += 1;
      } else {
        challenge.locationBreakdown.push({ locationName: locationHeader, count: 1 });
      }
      await challenge.save();
    }

    const populated = await Challenge.findById(challenge._id)
      .populate('user', 'name username avatar profilePicture')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. TOGGLE LIKES ───
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Challenge.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Missing entry" });

    const index = post.likes.indexOf(req.user.id);
    let liked = false;
    if (index === -1) {
      post.likes.push(req.user.id);
      liked = true;
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    
    const populatedPost = await Challenge.findById(post._id)
      .populate('user', 'name username avatar profilePicture')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });
      
    res.json({ challenge: populatedPost, liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 6. INTERACTIVE EMOJI REACTIONS ───
router.post('/:id/reaction', auth, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['hot', 'praise', 'love', 'anointed'].includes(type)) {
      return res.status(400).json({ error: "Invalid reaction type specification" });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    if (!challenge.reactions) {
      challenge.reactions = { hot: 0, praise: 0, love: 0, anointed: 0 };
    }
    
    challenge.reactions[type] = (challenge.reactions[type] || 0) + 1;
    await challenge.save();

    const populatedResponse = await Challenge.findById(challenge._id)
      .populate('user', 'name username avatar profilePicture')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });

    res.json(populatedResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 7. PROFESSIONAL COMMENTS ENGINE ───
// Add Comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text cannot be empty" });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    challenge.comments.push({
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    });

    await challenge.save();

    const populated = await Challenge.findById(challenge._id)
      .populate('user', 'name username avatar profilePicture')
      .populate('comments.user', 'name username avatar')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Comment
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    const comment = challenge.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Only creator of the comment OR owner of the challenge can delete it
    if (comment.user.toString() !== req.user.id && challenge.user.toString() !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    comment.deleteOne();
    await challenge.save();

    const populated = await Challenge.findById(challenge._id)
      .populate('user', 'name username avatar profilePicture')
      .populate('comments.user', 'name username avatar')
      .populate({
        path: 'parentChallengeId',
        populate: { path: 'user', select: 'username name' }
      });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 8. DELETE ENTRY ───
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

module.exports = router;