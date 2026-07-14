const { body, param, validationResult } = require('express-validator');

const validateMessageSend = [
  param('userId').isMongoId().withMessage('Invalid recipient ID format'),
  body('text').optional().trim().isLength({ max: 5000 }).withMessage('Message text is too long'),
  body('mediaUrl').optional().trim().isURL().withMessage('Invalid media URL format'),
  body('messageType').optional().isIn(['text', 'sticker', 'image', 'video', 'audio', 'file']).withMessage('Unsupported message type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateReaction = [
  param('messageId').isMongoId().withMessage('Invalid message ID format'),
  body('emoji').trim().notEmpty().withMessage('Emoji parameter is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateMessageSend, validateReaction };