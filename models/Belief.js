const mongoose = require('mongoose');
const beliefSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  icon: String,
  summary: String,
  texts: [String]
}, { timestamps: true });
module.exports = mongoose.model('Belief', beliefSchema);
