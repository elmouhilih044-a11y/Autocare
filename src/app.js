const express = require('express');
const mongoose = require('mongoose');
const defaultContainer = require('./bootstrap/container');
const errorHandler = require('./shared/error-handler');

const createApp = (container = defaultContainer) => {
  const app = express();

  app.use(express.json());

  app.get('/healthz', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(200).json({
      status: 'OK',
      db: dbConnected ? 'connected' : 'disconnected',
    });
  });

  if (container && typeof container.resolve === 'function') {
    const authRouter = container.resolve('authRouter');
    const catalogueRouter = container.resolve('catalogueRouter');
    app.use('/api/v1', authRouter);
    app.use('/api/v1', catalogueRouter);
  }

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
