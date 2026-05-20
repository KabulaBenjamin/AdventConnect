const Post = require('../models/Post');

const populatePost = (query) =>
  query.populate('author', 'username profilePic')
       .populate('comments.author', 'username profilePic')
       .populate('reactions.user', 'username profilePic');

// Map raw incoming emojis directly on the backend to safety keywords
const EMOJI_TO_ENUM = {
  '👍': 'like',
  '❤️': 'love',
  '🙏': 'pray',
  '🙌': 'amen',
  'like': 'like',
  'love': 'love',
  'pray': 'pray',
  'amen': 'amen'
};

exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      populatePost(Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit)),
      Post.countDocuments()
    ]);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.createPost = async (req, res, next) => {
  try {
    const postData = { author: req.user.id, content: req.body.content };

    if (req.file) {
      postData.media = `/uploads/${req.file.filename}`;
      postData.type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }

    const post = new Post(postData);
    await post.save();
    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

exports.reactToPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Sanitize the input: If it is an emoji, translate it. If missing, default safely to 'like'
    const incomingType = req.body.type || 'like';
    const reactionType = EMOJI_TO_ENUM[incomingType] || 'like';

    const index = post.reactions.findIndex(r => r.user && r.user.toString() === req.user.id);

    if (index > -1) {
      if (post.reactions[index].type === reactionType) {
        post.reactions.splice(index, 1);
      } else {
        post.reactions[index].type = reactionType;
      }
    } else {
      post.reactions.push({ user: req.user.id, type: reactionType });
    }

    await post.save();
    res.json(await populatePost(Post.findById(post._id)));
  } catch (err) { next(err); }
};

exports.prayForPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const index = post.prayers.findIndex(p => p.toString() === req.user.id);

    if (index > -1) {
      post.prayers.splice(index, 1);
    } else {
      post.prayers.push(req.user.id);
    }

    await post.save();
    res.json(await populatePost(Post.findById(post._id)));
  } catch (err) { next(err); }
};

exports.commentOnPost = async (req, res, next) => {
  try {
    const { text, parentId } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const newComment = { author: req.user.id, text: text.trim(), replies: [] };

    if (parentId) {
      const findAndReply = (commentsArray) => {
        for (let comment of commentsArray) {
          if (comment._id && comment._id.toString() === parentId.toString()) {
            if (!comment.replies) comment.replies = [];
            comment.replies.push(newComment);
            return true;
          }
          if (comment.replies && comment.replies.length > 0) {
            const found = findAndReply(comment.replies);
            if (found) return true;
          }
        }
        return false;
      };

      const pathResolved = findAndReply(post.comments);
      if (!pathResolved) {
        newComment.parentId = parentId;
        post.comments.push(newComment);
      }
    } else {
      post.comments.push(newComment);
    }

    await post.save();
    res.json(await populatePost(Post.findById(post._id)));
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
};
