const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, default: "Unknown Author" },
  category: { type: String, default: "General Literature", index: true }, // e.g., "EGW Writings", "Spirit of Prophecy", "History", "Youth"
  coverUrl: { type: String, default: "" },
  summary: { type: String, default: "" },
  downloadUrl: { type: String, default: "" }, // Link to actual material source or PDF file node
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

bookSchema.index({ title: 'text', author: 'text', summary: 'text' });

module.exports = mongoose.model('Book', bookSchema);
