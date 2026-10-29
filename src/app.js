const express = require('express');
const defaultContainer = require('./bootstrap/container');
const errorHandler = require('./shared/error-handler');

const createApp = (container = defaultContainer) => {
  const app = express();

  app.use(express.json());

  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'OK' });
  });

  if (container && typeof container.resolve === 'function') {
    const catalogueRouter = container.resolve('catalogueRouter');
    app.use('/api/v1', catalogueRouter);
    const reservationsRouter = container.resolve('reservationsRouter');
    app.use('/api/v1', reservationsRouter);
  }

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
