// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // Chemin vers votre application Next.js
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Gérer les alias définis dans votre tsconfig
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  // Browser journeys run with Playwright (npm run e2e).
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
