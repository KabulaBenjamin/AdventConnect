const mongoose = require('mongoose');

const ArchiveSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  archivedBy: { type: String },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Archive', ArchiveSchema);
