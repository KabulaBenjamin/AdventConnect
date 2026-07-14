const mongoose = require('mongoose');

// ─── PROFESSIONAL NESTED COMMENTS SUB-SCHEMA ───
const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ─── MAIN MUSIC CHALLENGE SCHEMA ───
const ChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    required: true
  },
  songTitle: {
    type: String,
    required: true
  },
  choirOrArtist: {
    type: String,
    default: "Unknown Artist"
  },
  isOriginalSound: {
    type: Boolean,
    default: true
  },
  parentChallengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    default: null
  },
  audioSourceUrl: {
    type: String,
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  uniqueReach: [{
    type: String
  }],
  locationBreakdown: [{
    locationName: { type: String },
    count: { type: Number, default: 1 }
  }],
  reactions: {
    hot: { type: Number, default: 0 },
    praise: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    anointed: { type: Number, default: 0 }
  },
  comments: [CommentSchema], // Injected comments array relation
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Challenge', ChallengeSchema);