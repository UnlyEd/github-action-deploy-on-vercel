module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  verbose: true,
  setupFilesAfterEnv: [
    'jest-expect-message', // Allows to add additional message when test fails - See https://github.com/mattphillips/jest-expect-message
    './jest.setup.js',
  ],
};
