const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const auth = require('../middleware/auth'); 

router.get('/', auth, async (req, res) => {
  try {
    const rawQuery = req.query.q;
    if (!rawQuery || !rawQuery.trim()) {
      return res.json({ users: [], devotionals: [], rooms: [] });
    }

    const query = rawQuery.trim();
    const cleanRegex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    // Run parallel optimizations directly targeted at your schema attributes
    const [matchedUsers, matchedPosts, matchedGroups] = await Promise.all([
      // 1. Find matching User profiles
      User.find({ username: cleanRegex })
        .select('username role')
        .limit(10)
        .lean(),

      // 2. Find matching Feed Content using your exact schema keys: 'content' and 'author'
      Post.find({ content: cleanRegex })
        .populate('author', 'username')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),

      // 3. Find matching Groups
      Group.find({ name: cleanRegex })
        .limit(10)
        .lean()
    ]);

    res.json({
      users: matchedUsers.map(u => ({
        id: u._id,
        username: u.username,
        role: u.role || 'Member'
      })),
      devotionals: matchedPosts.map(p => ({
        id: p._id,
        title: p.content || '',
        author: p.author?.username || 'Benjamin Koikoi'
      })),
      rooms: matchedGroups.map(g => ({
        id: g._id,
        name: g.name,
        members: g.members?.length || 0
      }))
    });

  } catch (err) {
    console.error('❌ Clean Schema Search Failure:', err.message);
    res.status(500).send('Search processing exception encountered.');
  }
});

module.exports = router;
