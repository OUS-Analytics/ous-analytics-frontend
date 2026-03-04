const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^recharts$': '<rootDir>/test/mocks/recharts.tsx',
    '^react-day-picker$': '<rootDir>/test/mocks/react-day-picker.tsx',
    '^embla-carousel-react$': '<rootDir>/test/mocks/embla-carousel-react.tsx',
    '^input-otp$': '<rootDir>/test/mocks/input-otp.tsx',
    '^@vercel/analytics/next$': '<rootDir>/test/mocks/vercel-analytics.tsx',
    '^next-themes$': '<rootDir>/test/mocks/next-themes.tsx',
    '^sonner$': '<rootDir>/test/mocks/sonner.tsx',
    '^cmdk$': '<rootDir>/test/mocks/cmdk.tsx',
    '^@radix-ui/react-context-menu$': '<rootDir>/test/mocks/radix-context-menu.tsx',
    '^@radix-ui/react-menubar$': '<rootDir>/test/mocks/radix-menubar.tsx',
    '^@radix-ui/react-navigation-menu$': '<rootDir>/test/mocks/radix-navigation-menu.tsx',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.*',
    '!**/*.config.*',
    '!**/.DS_Store',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 99,
      functions: 99,
      lines: 99,
    },
    './src/**/*.{ts,tsx}': {
      statements: 99,
      branches: 99,
      functions: 99,
      lines: 99,
    },
  },
};

module.exports = createJestConfig(customConfig);
