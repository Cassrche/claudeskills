const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/profile.ts']
})
