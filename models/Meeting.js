const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now }
});

const MeetingSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Sabbath Fellowship' },
  description: { type: String, trim: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'scheduled', 'ended'], default: 'active' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingApprovals: [{
    socketId: { type: String },
    userId: { type: String },
    username: { type: String }
  }],
  chatHistory: [chatMessageSchema],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
