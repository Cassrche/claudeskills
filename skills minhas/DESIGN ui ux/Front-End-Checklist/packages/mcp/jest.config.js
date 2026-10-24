const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@repo/types$': '<rootDir>/../types/src/index.ts',
    '^@frontendchecklist/rules$': '<rootDir>/../rules/src/index.ts',
    '^@frontendchecklist/rules/(.*)$': '<rootDir>/../rules/src/$1.ts'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/server.ts']
})
