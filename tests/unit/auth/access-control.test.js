const { createAuthenticate } = require('../../../src/modules/auth/middleware/authenticate');
const { requireRole } = require('../../../src/modules/auth/middleware/require-role');
const { signToken } = require('../../helpers/auth');

function mockRes() {
  return {};
}

describe('JWT authenticate & requireRole', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const authenticate = createAuthenticate({ jwtSecret });

  it('sets req.user from a valid Bearer token', (done) => {
    const req = { headers: { authorization: `Bearer ${signToken({ role: 'agent' })}` } };
    authenticate(req, mockRes(), (err) => {
      expect(err).toBeUndefined();
      expect(req.user.role).toBe('agent');
      expect(req.user.email).toBe('agent@strada.test');
      done();
    });
  });

  it('rejects missing or invalid tokens with 401', (done) => {
    const req = { headers: {} };
    authenticate(req, mockRes(), (err) => {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');

      const badReq = { headers: { authorization: 'Bearer not-a-jwt' } };
      authenticate(badReq, mockRes(), (err2) => {
        expect(err2.statusCode).toBe(401);
        done();
      });
    });
  });

  it('allows listed roles and forbids others', (done) => {
    const guard = requireRole(['admin']);
    const allowed = { user: { role: 'admin' } };
    guard(allowed, mockRes(), (err) => {
      expect(err).toBeUndefined();

      const denied = { user: { role: 'passenger' } };
      guard(denied, mockRes(), (err2) => {
        expect(err2.statusCode).toBe(403);
        expect(err2.code).toBe('FORBIDDEN');
        done();
      });
    });
  });
});
