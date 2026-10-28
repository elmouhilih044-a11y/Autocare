const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { AppError } = require('../../../shared/errors');

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

class AuthService {
  constructor({ userRepository, jwtSecret, jwtExpiresIn }) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
  }

  async login(payload) {
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid email or password');
    }

    const { email, password } = parsed.data;
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }
}

module.exports = AuthService;
module.exports.loginSchema = loginSchema;
