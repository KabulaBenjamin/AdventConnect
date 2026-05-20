const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  localChurch: { type: String, default: 'Global Member' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
