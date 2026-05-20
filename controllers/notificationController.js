const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    const notifs = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifs);
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

exports.markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (err) { next(err); }
};
