require('dotenv').config();
const createApp = require('./app');
const connectDB = require('./shared/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Strada API is running on port ${PORT}`);
  });
};

startServer();