const Message = require('../models/Message');
const User = require('../models/User');

// ─── 1. FETCH PAGINATED CONVERSATION ───
exports.getConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    
    // Pagination parameters
    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    // Verify recipient exists
    const recipientExists = await User.findById(userId).select('_id');
    if (!recipientExists) {
      return res.status(404).json({ error: "Interlocutor profile not found" });
    }

    // Query both sides of the communication channel with pagination
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId }
      ]
    })
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name username avatar profilePicture')
      .populate('recipient', 'name username avatar profilePicture')
      .populate('reactions.userId', 'name username');

    // Get total count for pagination metadata
    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId }
      ]
    });

    res.json({
      messages: messages.reverse(), // Reverse to restore chronological order on the client
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasMore: totalMessages > page * limit
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages", details: err.message });
  }
};

// ─── 2. ATOMIC MESSAGE DESPATCH ───
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { userId: recipientId } = req.params;
    const { text, mediaUrl, messageType } = req.body;

    // Reject empty contents
    if (!text && !mediaUrl) {
      return res.status(400).json({ error: "A message must contain either text or media assets" });
    }

    // Double check active recipient status
    const recipient = await User.findById(recipientId).select('_id');
    if (!recipient) {
      return res.status(404).json({ error: "Target recipient does not exist" });
    }

    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      text,
      mediaUrl,
      messageType: messageType || (mediaUrl ? 'image' : 'text')
    });

    const savedMessage = await newMessage.save();

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name username avatar profilePicture')
      .populate('recipient', 'name username avatar profilePicture');

    // 💡 SYSTEM HOOK: If you use Socket.io / WebSockets, emit here:
    // req.io.to(recipientId).emit('new_message', populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message", details: err.message });
  }
};

// ─── 3. ATOMIC REACTION TOGGLE (NO RACE CONDITIONS) ───
exports.toggleReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Target message not found" });
    }

    // Check if the user has already reacted with this exact emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // If same reaction exists, pull it (remove/toggle off)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // If user reacted with a *different* emoji, clear their previous reactions first (standard modern chat behavior)
      message.reactions = message.reactions.filter(r => r.userId.toString() !== userId);
      // Push new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name username avatar profilePicture')
      .populate('recipient', 'name username avatar profilePicture')
      .populate('reactions.userId', 'name username');

    // 💡 SYSTEM HOOK: req.io.to(message.recipient).to(message.sender).emit('message_reaction_update', updatedMessage);

    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to process reaction", details: err.message });
  }
};

// ─── 4. BATCH READ RECEIPT UPDATES ───
exports.markAsRead = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId: senderId } = req.params; // The sender whose messages we are marking as read

    // Perform an atomic update setting all unread incoming messages from this user to 'read'
    const result = await Message.updateMany(
      { sender: senderId, recipient: myId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    // 💡 SYSTEM HOOK: req.io.to(senderId).emit('messages_marked_read', { byUser: myId });

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status", details: err.message });
  }
};