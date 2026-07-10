const mongoose = require('mongoose');

const LessonCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true }, // e.g., "lessons_2026-02"
  data: { type: Object, required: true },
  fetchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const MissionCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true }, // e.g., "mission_2026-02"
  data: { type: Object, required: true },
  fetchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = {
  LessonCache: mongoose.model('LessonCache', LessonCacheSchema),
  MissionCache: mongoose.model('MissionCache', MissionCacheSchema)
};
