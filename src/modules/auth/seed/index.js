const bcrypt = require('bcrypt');
const User = require('../models/user.model');

const TEST_ACCOUNTS = [
  {
    email: 'admin@strada.test',
    password: 'Admin123!',
    role: 'admin',
    name: 'Admin Strada',
  },
  {
    email: 'agent@strada.test',
    password: 'Agent123!',
    role: 'agent',
    name: 'Agent Strada',
  },
  {
    email: 'passenger@strada.test',
    password: 'Passenger123!',
    role: 'passenger',
    name: 'Passager Strada',
  },
];

async function seedUsers({ session } = {}) {
  const created = [];

  for (const account of TEST_ACCOUNTS) {
    const email = account.email.toLowerCase();
    let user = await User.findOne({ email }).session(session);

    if (!user) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      user = await User.create(
        [
          {
            email,
            passwordHash,
            role: account.role,
            name: account.name,
          },
        ],
        { session }
      ).then((docs) => docs[0]);
    }

    created.push(user);
  }

  return created;
}

module.exports = { seedUsers, TEST_ACCOUNTS };
