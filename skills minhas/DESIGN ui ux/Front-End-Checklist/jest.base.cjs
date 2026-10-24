const COVERAGE_THRESHOLD = {
  branches: 70,
  functions: 80,
  lines: 80,
  statements: 80
}

const COVERAGE_REPORTERS = ['text', 'lcov', 'html']

const DEFAULT_COLLECT_COVERAGE_FROM = [
  'src/**/*.{ts,tsx,js,jsx}',
  '!src/**/*.d.ts',
  '!src/**/__tests__/**',
  '!src/**/index.ts',
  '!src/**/index.tsx'
]

function createPackageJestConfig(options = {}) {
  const {
    preset = 'ts-jest',
    testEnvironment = 'node',
    roots = ['<rootDir>/src'],
    testMatch = ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    transform = { '^.+\\.tsx?$': 'ts-jest' },
    moduleNameMapper = {
      '^@repo/(utils|validators)$': '<rootDir>/../$1/src/public-api.ts',
      '^@repo/(.*)$': '<rootDir>/../$1/src'
    },
    collectCoverageFrom = DEFAULT_COLLECT_COVERAGE_FROM,
    coverageDirectory = 'coverage',
    ...rest
  } = options

  return {
    preset,
    testEnvironment,
    roots,
    testMatch,
    transform,
    moduleNameMapper,
    passWithNoTests: true,
    collectCoverageFrom,
    coverageThreshold: {
      global: COVERAGE_THRESHOLD
    },
    coverageReporters: COVERAGE_REPORTERS,
    coverageDirectory,
    ...rest
  }
}

module.exports = {
  COVERAGE_THRESHOLD,
  COVERAGE_REPORTERS,
  DEFAULT_COLLECT_COVERAGE_FROM,
  createPackageJestConfig
}
