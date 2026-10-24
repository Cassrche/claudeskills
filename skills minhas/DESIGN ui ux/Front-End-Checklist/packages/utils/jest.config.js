const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/cn.ts',
    'src/debounce.ts',
    'src/formatDate.ts',
    'src/formatTechTerm.ts'
  ]
})
