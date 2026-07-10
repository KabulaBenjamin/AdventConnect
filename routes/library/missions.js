const express = require('express');
const router = express.Router();
const { MissionCache } = require('../../models/LibraryCache');

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

async function getMissionData(quarterId, weekIndex) {
  const cacheKey = `mission_data_${quarterId || 'current'}_${weekIndex !== undefined ? weekIndex : 'current'}`;
  
  // Check if mission story document is already in MongoDB
  const dbMatch = await MissionCache.findOne({ cacheKey });
  if (dbMatch) return dbMatch.data;

  // Database Miss: Query external API network
  const indexRes = await fetch('https://sabbath-school.adventech.io/api/v1/en/quarterlies/index.json', fetchOptions);
  const quarterlies = await indexRes.json();

  let initialQuarter = quarterlies[0];
  const today = new Date();

  if (quarterId) {
    const found = quarterlies.find(q => q.id === quarterId);
    if (found) initialQuarter = found;
  } else {
    const foundCurrent = quarterlies.find(q => today >= parseDate(q.start_date) && today <= parseDate(q.end_date));
    if (foundCurrent) initialQuarter = foundCurrent;
  }

  let targetQuarterId = initialQuarter.id;

  const lessonsRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${targetQuarterId}/lessons/index.json`, fetchOptions);
  const lessons = await lessonsRes.json();

  let targetLesson = lessons[0];
  if (weekIndex !== undefined && lessons[weekIndex]) {
    targetLesson = lessons[weekIndex];
  } else {
    for (let l of lessons) {
      if (today >= parseDate(l.start_date) && today <= parseDate(l.end_date)) {
        targetLesson = l;
        break;
      }
    }
  }

  const singleReadRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${targetQuarterId}/lessons/${targetLesson.id}/days/index.json`, fetchOptions);
  let htmlContent = "<p>Mission story text unavailable offline.</p>";
  let displayTitle = targetLesson.title;

  if (singleReadRes.ok) {
    const daysList = await singleReadRes.json();
    const targetDay = daysList.find(d => {
      const titleLower = d.title.toLowerCase();
      const idLower = d.id.toLowerCase();
      const isMission = titleLower.includes('mission') || idLower.includes('mission') || idLower.includes('story');
      const isTeacherText = titleLower.includes('teacher') || idLower.includes('teacher') ||
                            titleLower.includes('overview') || idLower.includes('overview') ||
                            titleLower.includes('commentary') || idLower.includes('commentary') ||
                            idLower.includes('tip');
      return isMission && !isTeacherText;
    }) || daysList.find(d => d.id.toLowerCase().includes('mission')) || daysList[daysList.length - 1];

    if (targetDay) {
      const contentRes = await fetch(`https://sabbath-school.adventech.io/api/v1/en/quarterlies/${targetQuarterId}/lessons/${targetLesson.id}/days/${targetDay.id}/read/index.json`, fetchOptions);
      if (contentRes.ok) {
        const fullBody = await contentRes.json();
        htmlContent = fullBody.content || "";
        displayTitle = `${targetLesson.title} - ${targetDay.title}`;
      }
    }
  }

  const finalResult = {
    title: displayTitle,
    quarter: initialQuarter.title,
    currentQuarterId: initialQuarter.id,
    cover: initialQuarter.cover || "https://sspmadventist.org/assets/images/logo.png",
    story: htmlContent,
    availableQuarters: quarterlies.slice(0, 12).map(q => ({ id: q.id, title: q.title }))
  };

  // Write content to database cache collection asynchronously
  await MissionCache.findOneAndUpdate({ cacheKey }, { data: finalResult }, { upsert: true });

  return finalResult;
}

router.get('/read', async (req, res) => {
  try {
    const data = await getMissionData(req.query.quarterId, req.query.weekIndex);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const data = await getMissionData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
