const mongoose = require('mongoose');
require('dotenv').config();

const Hymn = require('./models/Hymn');
const Belief = require('./models/Belief');

const beliefsData = [
  {
    id: 1,
    title: "The Word of God",
    icon: "📖",
    summary: "The Holy Scriptures, Old and New Testaments, are the written Word of God, given by divine inspiration. The authors spoke and wrote as they were moved by the Holy Spirit.",
    texts: ["2 Tim. 3:16, 17", "2 Pet. 1:20, 21", "Ps. 119:105", "Prov. 30:5, 6"]
  },
  {
    id: 2,
    title: "The Godhead",
    icon: "🔺",
    summary: "There is one God: Father, Son, and Holy Spirit, a unity of three coeternal Persons. God is immortal, all-powerful, all-knowing, above all, and ever present.",
    texts: ["Deut. 6:4", "Matt. 28:19", "2 Cor. 13:14", "Eph. 4:4-6", "1 Pet. 1:2"]
  },
  {
    id: 3,
    title: "The Father",
    icon: "👑",
    summary: "God the Eternal Father is the Creator, Source, Sustainer, and Sovereign of all creation. He is just and holy, merciful and gracious, slow to anger, and abounding in steadfast love.",
    texts: ["Gen. 1:1", "Rev. 4:11", "1 Cor. 15:28", "John 3:16", "1 John 4:8"]
  },
  {
    id: 4,
    title: "The Son",
    icon: "✝️",
    summary: "God the Eternal Son became incarnate in Jesus Christ. Through Him all things were created, the character of God is revealed, the salvation of humanity is accomplished, and the world is judged.",
    texts: ["John 1:1-3, 14", "Col. 1:15-19", "John 10:30", "Rom. 6:23", "2 Cor. 5:17-19"]
  },
  {
    id: 5,
    title: "The Holy Spirit",
    icon: "🕊️",
    summary: "God the Eternal Spirit was active with the Father and the Son in Creation, Incarnation, and Redemption. He draws, convicts, and renews human beings into the image of God.",
    texts: ["Gen. 1:1, 2", "Luke 1:35", "2 Pet. 1:21", "John 14:16-18, 26", "Acts 1:8"]
  },
  {
    id: 6,
    title: "Creation",
    icon: "🌱",
    summary: "God has revealed in Scripture the authentic and historical account of His creative activity. He created the universe, and in a recent six-day creation the Lord made the heavens and the earth.",
    texts: ["Gen. 1-2", "Exod. 20:8-11", "Ps. 19:1-6", "Heb. 11:3"]
  },
  {
    id: 20,
    title: "The Sabbath",
    icon: "🌅",
    summary: "The gracious Creator, after the six days of Creation, rested on the seventh day and instituted the Sabbath for all people as a perpetual memorial of His creative work. It is a day of joyful communion.",
    texts: ["Gen. 2:1-3", "Exod. 20:8-11", "Luke 4:16", "Isa. 58:13, 14", "Matt. 12:1-12"]
  },
  {
    id: 24,
    title: "Christ’s Ministry in the Heavenly Sanctuary",
    icon: "🏛️",
    summary: "There is a sanctuary in heaven, the true tabernacle that the Lord set up. In it Christ ministers on our behalf, making available to believers the benefits of His atoning sacrifice offered once for all.",
    texts: ["Heb. 8:1-5", "Heb. 9:11-28", "Dan. 7:9-27", "Dan. 8:14", "Rev. 14:6, 7"]
  }
];

const hymnsData = [
  {
    number: 1,
    title: "Praise to the Lord",
    category: "Praise & Adoration",
    lyrics: "Praise to the Lord, the Almighty, the King of creation!\nO my soul, praise Him, for He is thy health and salvation!\nAll ye who hear, now to His temple draw near;\nJoin ye in glad adoration!"
  },
  {
    number: 100,
    title: "Great Is Thy Faithfulness",
    category: "God's Faithfulness",
    lyrics: "Great is Thy faithfulness, O God my Father,\nThere is no shadow of turning with Thee;\nThou changest not, Thy compassions, they fail not;\nAs Thou hast been Thou forever wilt be.\n\nGreat is Thy faithfulness! Great is Thy faithfulness!\nMorning by morning new mercies I see;\nAll I have needed Thy hand hath provided,\nGreat is Thy faithfulness, Lord, unto me!"
  },
  {
    number: 213,
    title: "Jesus is Coming Again",
    category: "The Second Advent",
    lyrics: "Lift up the trumpet, and loud let it ring:\nJesus is coming again!\nCheered by the longing, the brave ones will sing:\nJesus is coming again!\n\nComing again, coming again,\nJesus is coming again!"
  },
  {
    number: 341,
    title: "To God Be the Glory",
    category: "Praise & Adoration",
    lyrics: "To God be the glory, great things He hath done;\nSo loved He the world that He gave us His Son,\nWho yielded His life an atonement for sin,\nAnd opened the life gate that all may go in.\n\nPraise the Lord, praise the Lord,\nLet the earth hear His voice!\nPraise the Lord, praise the Lord,\nLet the people rejoice!"
  }
];

async function seedDatabase() {
  try {
    // Connect using connection string from your local backend config
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect';
    console.log('Connecting to MongoDB at:', mongoURI);
    await mongoose.connect(mongoURI);

    // Clear old sample entries safely
    await Belief.deleteMany({});
    await Hymn.deleteMany({});
    console.log('Cleared existing library records.');

    // Inject items
    await Belief.insertMany(beliefsData);
    console.log(`Successfully seeded ${beliefsData.length} Fundamental Beliefs.`);

    await Hymn.insertMany(hymnsData);
    console.log(`Successfully seeded ${hymnsData.length} SDA Hymns.`);

    console.log('Library Database Seeding Complete! 🎉');
  } catch (error) {
    console.error('Seeding encountered an error:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedDatabase();
