const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  mediaUrl: { type: String },
  messageType: {
    type: String,
    enum: ['text', 'sticker', 'image'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: { type: String }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
