const User = require('../models/User');
const Post = require('../models/Post');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const posts = await Post.find({}, 'prayers');
    const prayerCount = posts.reduce((acc, p) => acc + (p.prayers?.length || 0), 0);
    
    res.json({ 
      userCount, 
      postCount, 
      prayerCount, 
      pageCount: 0 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
};
