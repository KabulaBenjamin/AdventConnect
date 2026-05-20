const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Multiple people can trigger one notification
  type: { 
    type: String, 
    enum: ['like', 'comment', 'mention', 'group_invite', 'live_start', 'system'], 
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, 
  content: { type: String },
  isRead: { type: Boolean, default: false },
  actionUrl: { type: String }, // Deep link to the specific content
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
