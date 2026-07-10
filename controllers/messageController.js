const Message = require('../models/Message');

exports.getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ]
    }).sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const message = await Message.create({
      sender: req.user.id,
      recipient: req.params.userId,
      text: req.body.text,
      mediaUrl: req.body.mediaUrl,
      messageType: req.body.messageType || 'text'
    });
    res.status(201).json(message);
  } catch (err) { next(err); }
};

exports.toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Check if this specific user already left this exact reaction
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // User clicked the same emoji again -> Remove it
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Remove any other reaction this user might have left first (optional: 1 reaction per user limit)
      message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId);
      // Add the new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    res.json(message.reactions);
  } catch (err) { next(err); }
};
