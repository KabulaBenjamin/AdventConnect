const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 1. Grab whatever environment variable Render passes
    let connStr = process.env.MONGO_URI || process.env.MONGODB_URI;

    // 2. If Render fails to pass it, HARDCODE your Atlas string as the ultimate production fallback
    if (!connStr) {
      console.log('⚠️ Warning: MONGO_URI missing from dashboard. Using production fallback string...');
      connStr = "mongodb+srv://kabulabenjamin25_db_user:YOUR_ACTUAL_PASSWORD_HERE@cluster0.enexzxy.mongodb.net/adventconnect?appName=Cluster0";
    }

    // 3. Clean any accidental spaces or hidden character artifacts
    connStr = connStr.trim();

    console.log('📡 Connecting to database engine...');
    await mongoose.connect(connStr);
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;