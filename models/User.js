const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  localChurch: { type: String, default: 'Global Member' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },

  // Demographics onboarding parameters
  gender: { type: String, enum: ['male', 'female', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  birthdate: { type: Date },
  country: { type: String, default: 'Kenya' },
  countyOrState: { type: String, default: '' },
  ministryInterest: { type: String, default: 'General Fellow' },

  // New Geolocation & City parameters
  currentCity: { type: String, default: '' },
  locationCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },

  settings: {
    isSubscribed: { type: Boolean, default: false },
    defaultAudience: { type: String, enum: ['public', 'church_members', 'private'], default: 'public' },
    contentFilterPreference: { type: String, default: 'standard' },
    hideReactionCounts: { type: Boolean, default: false },
    allowNotifications: { type: Boolean, default: true },
    accessibilityMode: { type: Boolean, default: false },
    languagePreference: { type: String, default: 'en' },
    mediaAutoplay: { type: Boolean, default: true },
    timeLimitMinutes: { type: Number, default: 0 },
    isProfileLocked: { type: Boolean, default: false },
    profileVisibility: { type: String, enum: ['everyone', 'brethren', 'none'], default: 'everyone' },
    whoCanContactMe: { type: String, enum: ['everyone', 'friends_of_friends'], default: 'everyone' },
    postVisibility: { type: String, enum: ['public', 'brethren'], default: 'public' },
    storyVisibility: { type: String, enum: ['public', 'brethren'], default: 'public' },
    reelVisibility: { type: String, enum: ['public', 'brethren'], default: 'public' },
    allowTagging: { type: String, enum: ['everyone', 'brethren', 'no_one'], default: 'everyone' },
    blockedUserIds: [{ type: String }],
    isActiveStatusVisible: { type: Boolean, default: true }
  },

  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { type: Date, default: Date.now }
});

// Index for future "Find Brethren Nearby" queries
UserSchema.index({ locationCoordinates: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
