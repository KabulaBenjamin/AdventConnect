const mongoose = require('mongoose');

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
