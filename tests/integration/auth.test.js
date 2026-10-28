const request = require('supertest');
const createApp = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const { seedUsers, TEST_ACCOUNTS } = require('../../src/modules/auth/seed');
const { withTransaction } = require('../../src/shared/transaction');
const User = require('../../src/modules/auth/models/user.model');

describe('Auth, healthz and transactions', () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedUsers();
  });

  it('GET /healthz reports OK and connected replica-set database', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.db).toBe('connected');
  });

  it('seeds the three test accounts', async () => {
    const users = await User.find().lean();
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.role).sort()).toEqual(['admin', 'agent', 'passenger']);
    expect(users[0].passwordHash).toBeUndefined();
  });

  it('POST /api/v1/auth/login returns a JWT for a test account', async () => {
    const admin = TEST_ACCOUNTS.find((account) => account.role === 'admin');
    const res = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: admin.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      email: admin.email,
      role: 'admin',
      name: admin.name,
    });
  });

  it('rejects bad credentials and missing token on protected routes', async () => {
    const bad = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@strada.test',
      password: 'nope',
    });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');

    const unauth = await request(app).post('/api/v1/lines').send({ code: 'X', label: 'X' });
    expect(unauth.status).toBe(401);
    expect(unauth.body.code).toBe('UNAUTHORIZED');
  });

  it('enforces roles after a real login', async () => {
    const passenger = TEST_ACCOUNTS.find((account) => account.role === 'passenger');
    const login = await request(app).post('/api/v1/auth/login').send({
      email: passenger.email,
      password: passenger.password,
    });
    const token = login.body.data.token;

    const forbidden = await request(app)
      .post('/api/v1/lines')
      .set({ Authorization: `Bearer ${token}` })
      .send({ code: 'LINE-PASS', label: 'Forbidden' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('FORBIDDEN');
  });

  it('withTransaction commits work on the replica set', async () => {
    await withTransaction(async (session) => {
      await User.create(
        [{ email: 'tx@strada.test', passwordHash: 'hash', role: 'agent', name: 'Tx' }],
        { session }
      );
    });

    const stored = await User.findOne({ email: 'tx@strada.test' });
    expect(stored).not.toBeNull();
  });
});
