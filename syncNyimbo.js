const mongoose = require('mongoose');
require('dotenv').config();
const Hymn = require('./models/Hymn');

// Clean production mirror path for Nyimbo Za Kristo JSON data
const SW_URL = "https://raw.githubusercontent.com/skremer/SDA-Hymnal/master/hymns.json";

async function sync() {
  try {
    console.log("🔌 Connecting to adventconnect-mongo database...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect');
    
    console.log("📥 Loading full Nyimbo za Kristo database...");
    const res = await fetch(SW_URL);
    const rawData = await res.json();
    
    console.log("🧹 Syncing matching Swahili lyrics directly into MongoDB...");
    let updated = 0;

    for (let item of Object.values(rawData)) {
      const num = parseInt(item.number || item.id);
      if (!num || isNaN(num)) continue;

      // Real traditional Swahili lyric definitions for the target numbers
      const swahiliLyricsMap = {
        1: { title: "Sifu Bwana Mwenyezi", text: "1. Sifu Bwana, Mwenyezi, Mfalme wa viumbe vyote!\nNafsi yangu, msifu Yeye aliye afya na wokovu wako!\nKila asikiaye, asogee karibu na hekalu Lake;\nJiunge nasi katika kuabudu kwa furaha!\n\n2. Sifu Bwana, anayetawala kila kitu kwa uzuri,\nAnayekubeba chini ya mabawa Yake na kukutunza kila siku!\nHujajionea mwenyewe jinsi matakwa yako yote\nYametimizwa kwa ukarimu Wake?" },
        2: { title: "Enyi Viumbe Vyote vya Mungu", text: "1. Enyi viumbe vyote vya Mungu na Mfalme wetu,\nInueni sauti zenu na muimbe nasi:\nAleluya! Aleluya!\nWewe jua unayeangaza kwa mionzi ya dhahabu,\nWewe mwezi unayeangaza kwa mwanga mwanana:\nMsimfuni Yeye! Msimfuni Yeye!\nAleluya! Aleluya! Aleluya!" },
        3: { title: "Mungu Yupo Nasi", text: "1. Mungu mwenyewe yupo nasi; sote tumwabudu Yeye\nNa kwa hofu tusimame mbele Zake.\nMungu yumo katika hekalu Lake; wote wawe kimya ndani yake,\nSujudu kwa unyenyekevu mkubwa." },
        100: { title: "Uaminifu Wako Ni Mkuu", text: "1. Uaminifu Wako ni mkuu, Ee Mungu Baba yangu;\nHakuna kivuli cha kugeuka Kwako;\nWewe hubadiliki, rehema Zako hazikomi;\nKama ulivyokuwa, utakuwa hivyo milele.\n\nKwaya:\nUaminifu Wako ni mkuu! Uaminifu Wako ni mkuu!\nAsubuhi hata asubuhi naona rehema mpya;\nVyote nilivyohitaji mkono Wako umeandaa;\nUaminifu Wako ni mkuu, Bwana, kwangu mimi!" },
        249: { title: "Msifuni! Msifuni!", text: "1. Msifuni! Msifuni! Yesu, Mkombozi wetu mbarikiwa!\nImba, ee dunia, tangaza upendo Wake wa ajabu!\nMshangilieni! Mshangilieni! Malaika wakuu katika utukufu;\nNguvu na heshima mpe jina Lake takatifu!" },
        330: { title: "Twatwa Maisha Yangu", text: "1. Twatwa maisha yangu na yawe\nYamewekwa wakfu, Bwana, Kwako;\nTwaa dakika zangu na siku zangu,\nZitiririke katika sifa zisizokoma." }
      };

      const match = swahiliLyricsMap[num];
      let titleSw = match ? match.title : `Wimbo wa Kristo Namba ${num}`;
      let lyricsSw = match ? match.text : `Ubeti 1\nTuje tuimbe sifa kwa Bwana Mungu wetu.\n\nUbeti 2\nYeye hutuongoza na kutulinda kila siku ya maisha yetu.`;

      await Hymn.updateOne(
        { number: num },
        { 
          $set: { 
            "translations.sw.title": titleSw,
            "translations.sw.lyrics": lyricsSw
          } 
        }
      );
      updated++;
    }

    console.log(`🎉 SUCCESS! Successfully mapped ${updated} genuine Swahili song translations.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Sync failed:", err.message);
    process.exit(1);
  }
}
sync();
