const express = require('express');
const connectDB = require('./shared/database');

const createApp = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  
  
  // Health check route
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  
  app.use('/api/v1', (req, res, next) => {
   
    next();
  });

  return app;
};

module.exports = createApp; 