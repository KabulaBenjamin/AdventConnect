const mongoose = require('mongoose');

const SyncedResourceSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true // e.g., "lesson-current" or "mission-current"
  },
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  syncedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('SyncedResource', SyncedResourceSchema);
