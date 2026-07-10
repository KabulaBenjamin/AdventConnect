const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect';

async function run() {
  console.log('🔄 Connecting to MongoDB database to configure search layers...');
  await mongoose.connect(mongoURI);
  
  // 1. Index Posts for text search across content fields with weights
  console.log('⚡ Indexing Post text frames...');
  await mongoose.connection.collection('posts').createIndex(
    { content: "text", body: "text", title: "text" },
    { weights: { title: 10, content: 5, body: 5 }, name: "GlobalTextIndex" }
  );

  // 2. Index Groups for rapid matching
  console.log('⚡ Indexing Group profiles...');
  await mongoose.connection.collection('groups').createIndex({ name: "text" });

  // 3. Index Users for rapid edge matching
  console.log('⚡ Indexing User entities...');
  await mongoose.connection.collection('users').createIndex({ username: 1 });

  console.log('✅ Indexing complete! Fast indices mapped to database schemas.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Index generation failure:', err);
  process.exit(1);
});
