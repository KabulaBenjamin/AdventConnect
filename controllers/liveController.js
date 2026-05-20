const LiveStream = require('../models/LiveStream');

exports.getLiveStreams = async (req, res, next) => {
  try {
    const streams = await LiveStream.find({ status: { $ne: 'ended' } })
      .populate('hostedBy', 'username profilePic')
      .sort({ scheduledAt: 1 });
    res.json(streams);
  } catch (err) { next(err); }
};

exports.createLiveStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.create({ ...req.body, hostedBy: req.user.id });
    res.status(201).json(stream);
  } catch (err) { next(err); }
};

exports.updateStreamStatus = async (req, res, next) => {
  try {
    const stream = await LiveStream.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    res.json(stream);
  } catch (err) { next(err); }
};
