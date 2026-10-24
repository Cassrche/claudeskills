const nextJest = require('next/jest')
const { COVERAGE_REPORTERS, COVERAGE_THRESHOLD } = require('../../jest.base.cjs')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './'
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironment: 'jest-environment-jsdom',
  passWithNoTests: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@frontendchecklist/rules$': '<rootDir>/../../packages/rules/src/index.ts',
    '^@frontendchecklist/rules/(.*)$': '<rootDir>/../../packages/rules/src/$1.ts',
    '^@repo/mcp$': '<rootDir>/../../packages/mcp/src/index.ts',
    '^@repo/mcp/load-rules$': '<rootDir>/../../packages/mcp/src/load-rules.ts',
    '^@repo/utils$': '<rootDir>/../../packages/utils/src/public-api.ts',
    '^@repo/auth/auth-client$': '<rootDir>/test/mocks/auth-client.ts',
    '^.*packages/auth/src/auth-client$': '<rootDir>/test/mocks/auth-client.ts',
    '^@repo/design-system/custom/(.*)$': '<rootDir>/../../packages/design-system/src/custom/$1.tsx',
    '^@repo/design-system/ui/(.*)$': '<rootDir>/../../packages/design-system/src/ui/$1.tsx',
    '^@repo/design-system/icons$': '<rootDir>/../../packages/design-system/src/icons.ts',
    '^@repo/emails/server$': '<rootDir>/../../packages/emails/src/server.ts',
    '^.*custom/(.*)/src$': '<rootDir>/../../packages/design-system/src/custom/$1.tsx',
    '^.*packages/design-system/custom/(.*)/src$':
      '<rootDir>/../../packages/design-system/src/custom/$1.tsx',
    '^.*custom/navigation/(.*)/src$':
      '<rootDir>/../../packages/design-system/src/custom/navigation/$1.tsx',
    '^.*ui/(.*)/src$': '<rootDir>/../../packages/design-system/src/ui/$1.tsx',
    '^.*packages/design-system/ui/(.*)/src$':
      '<rootDir>/../../packages/design-system/src/ui/$1.tsx',
    '^.*packages/design-system/icons/src$': '<rootDir>/../../packages/design-system/src/icons.ts',
    '^.*icons/src$': '<rootDir>/../../packages/design-system/src/icons.ts',
    '^.*packages/utils/src$': '<rootDir>/../../packages/utils/src/public-api.ts',
    '^.*utils/src$': '<rootDir>/../../packages/utils/src/public-api.ts'
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: ['components/Counter.tsx'],
  coverageThreshold: {
    global: COVERAGE_THRESHOLD
  },
  coverageReporters: COVERAGE_REPORTERS,
  coverageDirectory: 'coverage'
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
