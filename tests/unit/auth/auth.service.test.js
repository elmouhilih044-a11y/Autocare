const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AuthService = require('../../../src/modules/auth/services/auth.service');
const { AppError } = require('../../../src/shared/errors');

describe('AuthService', () => {
  const jwtSecret = 'test-jwt-secret-strada';
  let service;
  let userRepository;

  beforeEach(() => {
    userRepository = {
      findByEmailWithPassword: jest.fn(),
    };
    service = new AuthService({
      userRepository,
      jwtSecret,
      jwtExpiresIn: '1h',
    });
  });

  it('returns a JWT and public user on valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Admin123!', 4);
    userRepository.findByEmailWithPassword.mockResolvedValue({
      _id: { toString: () => 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      email: 'admin@strada.test',
      role: 'admin',
      name: 'Admin Strada',
      passwordHash,
    });

    const result = await service.login({
      email: 'admin@strada.test',
      password: 'Admin123!',
    });

    expect(result.user).toEqual({
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      email: 'admin@strada.test',
      role: 'admin',
      name: 'Admin Strada',
    });
    const payload = jwt.verify(result.token, jwtSecret);
    expect(payload.sub).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(payload.role).toBe('admin');
  });

  it('rejects unknown users and wrong passwords with the same error', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@strada.test', password: 'x' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });

    const passwordHash = await bcrypt.hash('Admin123!', 4);
    userRepository.findByEmailWithPassword.mockResolvedValue({
      _id: { toString: () => 'id' },
      email: 'admin@strada.test',
      role: 'admin',
      name: 'Admin',
      passwordHash,
    });
    await expect(
      service.login({ email: 'admin@strada.test', password: 'wrong' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects invalid payload', async () => {
    await expect(service.login({ email: 'not-an-email', password: 'x' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });
});
