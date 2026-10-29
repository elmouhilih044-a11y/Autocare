const env = require('./config/env');
const createApp = require('./app');
const connectDB = require('./shared/database');
const { seedUsers } = require('./modules/auth/seed');

const startServer = async () => {
  await connectDB();
  await seedUsers();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Strada API is running on port ${env.port}`);
  });
};

startServer();
