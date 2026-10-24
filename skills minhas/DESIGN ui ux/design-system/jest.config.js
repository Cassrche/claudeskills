const { createPackageJestConfig } = require('../../jest.base.cjs')

module.exports = createPackageJestConfig({
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@repo/design-system/custom/(.*)$': '<rootDir>/src/custom/$1.tsx',
    '^@repo/design-system/ui/(.*)$': '<rootDir>/src/ui/$1.tsx',
    '^@repo/design-system/motion/(.*)$': '<rootDir>/src/motion/$1.tsx',
    '^@repo/design-system/icons$': '<rootDir>/src/icons.ts',
    '^@repo/design-system/typography$': '<rootDir>/src/typography.ts',
    '^@repo/(utils|validators)$': '<rootDir>/../$1/src/public-api.ts',
    '^@repo/(.*)$': '<rootDir>/../$1/src'
  },
  collectCoverageFrom: [
    'src/custom/**/*.tsx',
    'src/ui/accordion.tsx',
    'src/ui/badge.tsx',
    'src/ui/button.tsx',
    'src/ui/card.tsx',
    'src/ui/dialog.tsx',
    'src/ui/dropdown-menu.tsx',
    'src/ui/input.tsx'
  ]
})
