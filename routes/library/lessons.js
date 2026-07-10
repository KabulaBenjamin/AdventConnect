const express = require('express');
const router = express.Router();
const { LessonCache } = require('../../models/LibraryCache');

const fetchOptions = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
};

const parseDate = (str) => {
  if (!str) return new Date();
  return str.includes('-') ? new Date(str) : new Date(str.split('/').reverse().join('-'));
};

router.get('/devotional', async (req, res) => {
  const { quarterId, lessonIndex } = req.query;
  
  // Create a unique identifier based on the quarter parameter
  const targetQuarterKey = quarterId || 'current_quarter';

  try {
    // 1. Look for the quarter's data inside MongoDB first
    let cachedQuarter = await LessonCache.findOne({ cacheKey: targetQuarterKey });
    let quarterlies = [];
    let initialQuarter = null;
    let lessons = [];

    if (cachedQuarter) {
      // Pull variables directly from database cache
      ({ quarterlies, initialQuarter, lessons } = cachedQuarter.data);
    } else {
      // 2. Database miss: Pull from API and save the entire structure permanently
      const indexRes = await fetch('https://sabbath-school.adventech.io/api/v1/en/quarterlies/index.json', fetchOptions);
      quarterlies = await indexRes.json();

      initialQuarter = quarterlies[0];
      const today = new Date();

      if (quarterId) {
        const found = quarterlies.find(q => q.id === quarterId);
        if (found) initialQuarter = found;
      } else {
        const foundCurrent = quarterlies.find(q => today >= parseDate(q.start_date) && today <= parseDate(q.end_date));
        if (foundCurrent) initialQuarter = foundCurrent;
      }

      const weeksRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${initialQuarter.id}/lessons/index.json`, fetchOptions);
      lessons = await weeksRes.json();

      // Store the master layout configuration into the database cache
      await LessonCache.findOneAndUpdate(
        { cacheKey: targetQuarterKey },
        { data: { quarterlies, initialQuarter, lessons } },
        { upsert: true, new: true }
      );
    }

    // Determine target lesson index based on date or selection
    let targetLesson = lessons[0];
    const today = new Date();
    if (lessonIndex !== undefined && lessons[lessonIndex]) {
      targetLesson = lessons[lessonIndex];
    } else {
      for (let l of lessons) {
        if (today >= parseDate(l.start_date) && today <= parseDate(l.end_date)) {
          targetLesson = l;
          break;
        }
      }
    }

    // Check if the specific days text for this week is already cached inside MongoDB
    const daysCacheKey = `days_${initialQuarter.id}_${targetLesson.id}`;
    let cachedDays = await LessonCache.findOne({ cacheKey: daysCacheKey });
    let resolvedDays = [];

    if (cachedDays) {
      resolvedDays = cachedDays.data;
    } else {
      // Fetch week's study text panels and write them down permanently
      const daysRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${initialQuarter.id}/lessons/${targetLesson.id}/days/index.json`, fetchOptions);
      
      if (daysRes.ok) {
        const daysList = await daysRes.json();
        resolvedDays = await Promise.all(
          daysList.map(async (day) => {
            try {
              const readRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${initialQuarter.id}/lessons/${targetLesson.id}/days/${day.id}/read/index.json`, fetchOptions);
              if (readRes.ok) {
                const body = await readRes.json();
                return {
                  id: day.id,
                  title: day.title,
                  date: day.date,
                  htmlContent: body.content || "<p>Content Unavailable</p>"
                };
              }
            } catch (e) {}
            return { id: day.id, title: day.title, date: day.date, htmlContent: "<p>Content Unavailable</p>" };
          })
        );

        // Store this week's processed days list to MongoDB
        await LessonCache.findOneAndUpdate(
          { cacheKey: daysCacheKey },
          { data: resolvedDays },
          { upsert: true }
        );
      }
    }

    res.json({
      quarterlyTitle: initialQuarter.title,
      weekTitle: targetLesson.title,
      cover: initialQuarter.cover,
      days: resolvedDays,
      availableQuarters: quarterlies.slice(0, 12).map(q => ({ id: q.id, title: q.title })),
      allLessonsInQuarter: lessons.map((l, index) => ({ index, title: l.title, id: l.id })),
      currentQuarterId: initialQuarter.id,
      currentLessonIndex: lessons.findIndex(l => l.id === targetLesson.id)
    });

  } catch (err) {
    console.error("Database persistent lesson cache failure:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
