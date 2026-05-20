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
      text: req.body.text
    });
    res.status(201).json(message);
  } catch (err) { next(err); }
};
