const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'jsdom',
  collectCoverageFrom: ['src/export-mutations.ts']
})
