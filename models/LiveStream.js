const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  streamUrl: { type: String },
  thumbnail: { type: String },
  status: { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming' },
  scheduledAt: { type: Date },
  category: { type: String, enum: ['Sermon', 'Concert', 'Bible Study'], required: true },
  hostedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LiveStream', liveStreamSchema);
