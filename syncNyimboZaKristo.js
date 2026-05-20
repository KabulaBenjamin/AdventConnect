const mongoose = require('mongoose');
require('dotenv').config();
const Hymn = require('./models/Hymn');

// Rock-solid open-source Swahili dataset mirror
const SW_DATA_URL = "https://raw.githubusercontent.com/Gospel-Music/nyimbo-za-kristo/main/json/nyimbo.json";

async function syncSwahiliHymns() {
  try {
    console.log("🔌 Connecting to adventconnect-mongo database...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect');
    console.log("✅ Connected.");

    console.log("📥 Downloading full Swahili Nyimbo za Kristo dataset...");
    const response = await fetch(SW_DATA_URL);
    if (!response.ok) throw new Error(`Server returned status: ${response.status}`);
    
    const swRaw = await response.json();
    console.log(`✅ Downloaded ${swRaw.length} Swahili song records.`);

    console.log("🧩 Syncing real Swahili lyrics into MongoDB matrix...");
    let updateCount = 0;

    for (let swSong of swRaw) {
      const hymnNum = parseInt(swSong.number || swSong.id);
      if (!hymnNum || isNaN(hymnNum)) continue;

      // Clean up title text and lyrics from metadata brackets
      let cleanTitle = (swSong.title || `Wimbo ${hymnNum}`).replace(/^\d+[\s.-]*/, "").trim();
      let cleanLyrics = (swSong.lyrics || swSong.text || "").replace(/\[.*?\]/g, "").trim();

      if (!cleanLyrics) continue;

      // Update just the Swahili translation fields while leaving English and MIDIs untouched
      await Hymn.updateOne(
        { number: hymnNum },
        {
          $set: {
            "translations.sw.title": cleanTitle,
            "translations.sw.lyrics": cleanLyrics
          }
        }
      );
      updateCount++;
    }

    console.log(`🎉 SUCCESS! Fully synchronized ${updateCount} real Swahili Nyimbo za Kristo lyrics into your database!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Swahili synchronization failed:", error.message);
    process.exit(1);
  }
}

syncSwahiliHymns();
