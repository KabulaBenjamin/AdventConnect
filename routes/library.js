const express = require('express');
const router = express.Router();

const missionRouter = require('./library/missions');
const lessonRouter = require('./library/lessons');
const hymnRouter = require('./library/hymns');
const meetingRouter = require('./library/meetings');
const bibleRouter = require('./library/bible');
const egwRouter = require('./library/egw');
const booksRouter = require('./library/books');

// 1. Feature Sub-Router Isolation Mounts
router.use('/mission', missionRouter);
router.use('/hymns', hymnRouter);
router.use('/meet', meetingRouter);
router.use('/bible', bibleRouter);
router.use('/egw', egwRouter);
router.use('/books', booksRouter);

// 2. Comprehensive Frontend Routing Normalization

// Direct Fallback for Frontend calling /api/library/bible directly
router.use('/bible', bibleRouter);

// Route Mapping for Hymns query strings: /api/library/hymns?q=
router.get('/hymns', (req, res, next) => {
  if (req.query.q !== undefined) {
    req.query.query = req.query.q;
    req.url = '/search';
  }
  hymnRouter(req, res, next);
});

// Route Mapping for EGW queries: /api/library/egw-search?q=
router.get('/egw-search', (req, res, next) => {
  req.url = '/search';
  egwRouter(req, res, next);
});

// Backward-compatibility mapping for Sabbath School lessons
router.get('/devotional/lesson', (req, res, next) => {
  req.url = '/devotional';
  lessonRouter(req, res, next);
});

module.exports = router;
