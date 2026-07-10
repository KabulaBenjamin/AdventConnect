const mongoose = require('mongoose');

// Shared recursive comment structure definition
const CommentSchema = new mongoose.Schema();
CommentSchema.add({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'pray', 'amen'], default: 'like' }
  }],
  // Added prayer tracking arrays inside nested nodes/replies
  prayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [CommentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String
  },
  media: {
    type: String
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'prayer'],
    default: 'text'
  },
  scope: {
    type: String,
    enum: ['global', 'board', 'friends', 'invited'],
    default: 'global'
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'pray', 'amen'], default: 'like' }
  }],
  prayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
