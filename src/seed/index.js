require('dotenv').config();
const connectDB = require('../shared/database');
const { seedUsers, TEST_ACCOUNTS } = require('../modules/auth/seed');

async function seed() {
  await connectDB();
  await seedUsers();

  console.log('Test accounts:');
  for (const account of TEST_ACCOUNTS) {
    console.log(`  ${account.role}: ${account.email} / ${account.password}`);
  }

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
