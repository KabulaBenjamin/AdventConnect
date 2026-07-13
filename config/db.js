const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let connStr;

    // Check if we are running live on Render production
    if (process.env.NODE_ENV === 'production') {
      connStr = process.env.MONGO_URI || process.env.MONGODB_URI;
      
      if (!connStr) {
        throw new Error("CRITICAL: Running in production mode but no MONGO_URI environment variable was found on Render!");
      }
      console.log('📡 Production environment detected. Connecting to MongoDB Atlas...');
    } else {
      // Local development environment configurations
      connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/adventconnect';
      console.log('💻 Local development environment detected. Connecting to local Docker MongoDB...');
    }

    await mongoose.connect(connStr);
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;