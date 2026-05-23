const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fraud_detection';
  
  console.log('Connecting to MongoDB...');
  try {
    // Set connection timeout to 3 seconds for quick local fallback
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('MongoDB database connected successfully.');
    global.useMockDB = false;
  } catch (error) {
    console.error('==================================================');
    console.error('DATABASE WARNING: Could not connect to MongoDB.');
    console.error(`Attempted URI: ${mongoURI}`);
    console.error('Error message:', error.message);
    console.error('Fallback Mode: Initializing IN-MEMORY MOCK DATABASE.');
    console.error('This allows the system to run locally without a database.');
    console.error('==================================================');
    global.useMockDB = true;
  }
};

module.exports = connectDB;
