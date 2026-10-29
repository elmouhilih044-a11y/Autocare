module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  clearMocks: true,
  restoreMocks: true,
};
