const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/serenitas';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Please make sure MongoDB is running or check your MONGODB_URI in .env file');
    // Don't exit process, let the app continue without database for now
    console.log('Continuing without database connection...');
  }
};

module.exports = connectDB; 