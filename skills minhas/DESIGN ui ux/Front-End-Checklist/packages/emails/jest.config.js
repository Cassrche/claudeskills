const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'emails/**/*.{ts,tsx}', '!src/**/*.d.ts']
})
