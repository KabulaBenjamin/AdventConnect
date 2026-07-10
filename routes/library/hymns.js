const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const hymnSchema = new mongoose.Schema({
  number: Number,
  title: String,
  lyrics: String,
  category: String
}, { collection: 'nyimbo' });

const Hymn = mongoose.models.Hymn || mongoose.model('Hymn', hymnSchema);

router.get('/search', async (req, res) => {
  const query = req.query.query || '';
  try {
    let filter = {};
    if (query) {
      if (!isNaN(query)) {
        filter = { number: parseInt(query) };
      } else {
        filter = {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { lyrics: { $regex: query, $options: 'i' } }
          ]
        };
      }
    }

    const hymns = await Hymn.find(filter).sort({ number: 1 }).limit(25);
    
    // Return a direct raw array matching frontend assumptions
    res.json(hymns);
  } catch (err) {
    res.status(500).json([]);
  }
});

module.exports = router;
