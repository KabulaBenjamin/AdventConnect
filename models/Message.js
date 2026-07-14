const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  emoji: { 
    type: String, 
    required: true,
    trim: true
  }
}, { _id: false }); // Prevents mongoose from generating an unnecessary _id for every single reaction

const MessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String,
    trim: true,
    maxLength: 5000 // Prevents payload overload attacks
  },
  mediaUrl: { 
    type: String,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'sticker', 'image', 'video', 'audio', 'file'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  reactions: [ReactionSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true // Automatically manages createdAt and updatedAt
});

// ─── CRITICAL PRODUCTION INDEXES ───
// Compound index for ultra-fast, paginated conversation retrievals
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });

// Single field index for background analytics or cleanup
MessageSchema.index({ status: 1 });

module.exports = mongoose.model('Message', MessageSchema);