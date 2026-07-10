const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// @route    GET api/posts
// @desc     Get all posts sorted by creation date with fully populated nested reaction users
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name username avatar')
      .populate('comments.author', 'name username avatar')
      .populate('reactions.user', 'name username avatar') // <-- Fixes reaction names on main posts!
      .populate('comments.reactions.user', 'name username avatar') // <-- Fixes reaction names on comments!
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error('Fetch posts failure:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/posts
// @desc     Create a new post
router.post('/', [auth, upload.array('media', 4)], async (req, res) => {
  try {
    const { content, scope } = req.body;
    const targetScope = scope || 'global';

    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      mediaUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    const newPost = new Post({
      author: req.user.id,
      content,
      media: mediaUrls.length > 0 ? mediaUrls[0] : undefined,
      scope: targetScope
    });

    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name username avatar')
      .populate('comments.author', 'name username avatar')
      .populate('reactions.user', 'name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Post creation failure:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/posts/:id
// @desc     Delete a post by identity lookup
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post record not found' });
    }

    if (post.author.toString() !== req.user.id.toString()) {
      return res.status(401).json({ message: 'User not authorized to remove this post' });
    }

    await post.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.emit('delete_post', req.params.id);
    }

    res.json({ message: 'Post successfully cleared from timeline' });
  } catch (err) {
    console.error('Post deletion failure:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
