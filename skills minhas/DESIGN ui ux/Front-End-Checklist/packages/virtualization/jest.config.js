const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: ['src/virtualization-items.tsx']
})
