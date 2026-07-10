const express = require('express');
const router = express.Router();

// Supports both: /api/library/bible?book=John&chapter=3 AND /api/library/bible/chapter?book=John&chapter=3
const handleBibleQuery = async (req, res) => {
  const book = req.query.book || req.query.b;
  const chapter = req.query.chapter || req.query.c;
  const verse = req.query.verse || req.query.v;

  if (!book || !chapter) {
    return res.status(400).json({ error: "Parameters 'book' and 'chapter' are required." });
  }

  try {
    const reference = verse ? `${book} ${chapter}:${verse}` : `${book} ${chapter}`;
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}`);
    
    if (!response.ok) {
      throw new Error("Scripture reference could not be resolved.");
    }

    const data = await response.json();
    
    // Return structured response that handles both single verses or whole chapters seamlessly
    res.json({
      success: true,
      reference: data.reference,
      text: data.text,
      verses: data.verses.map(v => ({
        chapter: v.chapter,
        verse: v.verse,
        text: v.text.trim()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/', handleBibleQuery);
router.get('/chapter', handleBibleQuery);
router.get('/verse', handleBibleQuery);

module.exports = router;
