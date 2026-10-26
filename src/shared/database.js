const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    
    const uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/strada?replicaSet=rs0';
    
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully with Replica Set.');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;