const mongoose = require('mongoose');

const HymnSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, index: true },
  midiUrl: { type: String, default: "" },
  translations: {
    en: {
      title: { type: String, required: true },
      lyrics: { type: String, required: true }
    },
    sw: {
      title: { type: String, default: "" },
      lyrics: { type: String, default: "" }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Hymn', HymnSchema);
