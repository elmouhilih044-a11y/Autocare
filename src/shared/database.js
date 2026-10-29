const mongoose = require('mongoose');
const env = require('../config/env');

const connectDB = async (uri = env.mongodbUri) => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully with Replica Set.');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
