module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
};
