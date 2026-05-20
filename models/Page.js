const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  handle: { type: String, unique: true }, // e.g., @central_church
  category: { type: String, default: 'Church' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isVerified: { type: Boolean, default: false },
  website: { type: String },
  coverImage: { type: String, default: '' },
  profileImage: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Page', PageSchema);
