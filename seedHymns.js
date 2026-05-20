const mongoose = require('mongoose');
require('dotenv').config();
const Hymn = require('./models/Hymn');

// Sample base dictionary to give our seeder real seed content patterns immediately
const coreHymnsBase = {
  1: { en: "Praise to the Lord", sw: "Sifu Bwana", lyricsEn: "Praise to the Lord, the Almighty, the King of creation!\nO my soul, praise Him, for He is thy health and salvation!", lyricsSw: "Sifu Bwana, Mwenyezi, Mfalme wa viumbe vyote!\nNafsi yangu, msifu Yeye aliye afya na wokovu wako!" },
  2: { en: "All Creatures of Our God and King", sw: "Enyi Viumbe Vyote vya Mungu", lyricsEn: "All creatures of our God and King,\nLift up your voice and with us sing!", lyricsSw: "Enyi viumbe vyote vya Mungu na Mfalme wetu,\nInueni sauti zenu na muimbe nasi!" },
  3: { en: "God Himself Is With Us", sw: "Mungu Yupo Nasi", lyricsEn: "God Himself is with us; let us all adore Him\nAnd with awe appear before Him.", lyricsSw: "Mungu mwenyewe yupo nasi; sote tumwabudu Yeye\nNa kwa hofu tusimame mbele Zake." },
  4: { en: "Praise, My Soul, the King of Heaven", sw: "Msifu, Nafsi Yangu, Mfalme wa Mbingu", lyricsEn: "Praise, my soul, the King of heaven;\nTo His feet thy tribute bring.", lyricsSw: "Msifu, nafsi yangu, Mfalme wa mbingu;\nLeta sifa zako miguuni pake." },
  100: { en: "Great Is Thy Faithfulness", sw: "Uaminifu Wako Ni Mkuu", lyricsEn: "Great is Thy faithfulness, O God my Father;\nThere is no shadow of turning with Thee.", lyricsSw: "Uaminifu Wako ni mkuu, Ee Mungu Baba yangu;\nHakuna kivuli cha kugeuka Kwako." },
  249: { en: "Praise Him! Praise Him!", sw: "Msifuni! Msifuni!", lyricsEn: "Praise Him! Praise Him! Jesus, our blessed Redeemer!\nSing, O Earth, His wonderful love proclaim!", lyricsSw: "Msifuni! Msifuni! Yesu, Mkombozi wetu mbarikiwa!\nImba, ee dunia, tangaza upendo Wake wa ajabu!" },
  330: { en: "Take My Life and Let It Be", sw: "Twatwa Maisha Yangu", lyricsEn: "Take my life and let it be\nConsecrated, Lord, to Thee.", lyricsSw: "Twatwa maisha yangu na yawe\nYamewekwa wakfu, Bwana, Kwako." },
};

async function seedDatabase() {
  try {
    console.log("🔌 Connecting to local adventconnect-mongo database...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect');
    console.log("✅ Database Connected.");

    console.log("🧹 Clearing old database records...");
    await Hymn.deleteMany({});

    console.log("🧩 Generating complete 695 Hymnal array matching MIDI pathways...");
    const bulkOperations = [];

    for (let i = 1; i <= 695; i++) {
      const match = coreHymnsBase[i] || { 
        en: `Hymn ${i}`, 
        sw: `Wimbo wa Kristo ${i}`, 
        lyricsEn: `Lyrics for English SDA Hymn ${i} content text template.`, 
        lyricsSw: `Maneno ya Wimbo wa Kristo namba ${i} bado yanahakikiwa.` 
      };

      const paddedNumber = String(i).padStart(3, '0');
      const midiUrl = `https://www.sdahymnals.com/Hymns/${paddedNumber}.mid`;

      bulkOperations.push({
        number: i,
        midiUrl: midiUrl,
        translations: {
          en: { title: match.en, lyrics: match.lyricsEn },
          sw: { title: match.sw, lyrics: match.lyricsSw }
        }
      });
    }

    console.log(`🚀 Injecting all ${bulkOperations.length} entries successfully into MongoDB...`);
    await Hymn.insertMany(bulkOperations);

    console.log("🎉 SUCCESS! The entire multi-lingual hymnal index has been populated.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
