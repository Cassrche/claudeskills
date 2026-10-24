# Testing Strategy & Coverage Guidelines

## Coverage Thresholds

Based on industry best practices from Google, Microsoft, and other leading tech companies, we enforce the following coverage thresholds:

### Global Coverage Requirements
- **Statements**: 80% (Industry standard)
- **Lines**: 80% (Industry standard)
- **Functions**: 80% (Industry standard)
- **Branches**: 70% (Pragmatic target for conditional logic)

### Tiered Coverage by Code Type

#### Critical Utilities (`/utils/`)
- **Target**: 90% all metrics
- **Rationale**: Utility functions are reused across the application and should be thoroughly tested

#### UI Components (`/components/`)
- **Target**: 80% statements/lines/functions, 70% branches
- **Rationale**: Standard coverage for UI components, acknowledging that some edge cases may be less critical

#### Application Pages (`/app/`)
- **Target**: 80% overall
- **Rationale**: Focus on user journeys and integration rather than 100% unit coverage

## Best Practices

### 1. Focus on Critical Paths
- Prioritize testing business-critical functionality
- Ensure error handling paths are covered
- Test data validation and security boundaries

### 2. Quality Over Quantity
- Write meaningful tests that validate behavior, not just increase coverage
- One good integration test can be worth multiple unit tests
- Focus on what's NOT covered rather than the percentage

### 3. Progressive Coverage Goals
Different testing levels should have different targets:
- **Unit Tests**: 80-90% coverage
- **Integration Tests**: 70-80% coverage
- **E2E Tests**: Focus on critical user journeys (50-60%)

### 4. When to Exclude Files from Coverage
Acceptable exclusions:
- Generated files
- Configuration files
- Type definitions (`.d.ts`)
- Test utilities and mocks
- Boilerplate code with no logic

### 5. Incremental Improvement
For existing code with low coverage:
- Set realistic incremental goals
- Use tools to prevent coverage regression
- Focus on new code having proper coverage

## Running Tests

```bash
# Development (watch mode)
pnpm test

# Run with coverage report
pnpm test:coverage

# CI mode (no watch, with coverage)
pnpm test:ci

# Run specific test file
pnpm test Counter.test.tsx
```

## Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Immediate feedback during development
- **HTML**: Detailed browseable report in `coverage/lcov-report/index.html`
- **LCOV**: For CI/CD integration

## Enforcement

Coverage thresholds are enforced at multiple levels:

1. **Local Development**: Jest fails if coverage drops below thresholds
2. **Pre-commit Hook**: Checks coverage on staged files
3. **Pre-push Hook**: Runs full test suite with coverage
4. **CI/CD Pipeline**: Blocks merge if coverage requirements not met

## Why These Thresholds?

Based on empirical studies and industry experience:

- **80% coverage** provides good confidence in code correctness
- **70% branch coverage** is pragmatic for complex conditionals
- Coverage above 80-90% has diminishing returns
- Time spent going from 80% to 100% is better invested in integration/E2E tests

## Red Flags

Be concerned if you see:
- Coverage below 60% on any metric
- Critical business logic with low coverage
- Error handling paths not tested
- No tests for data validation
- Security-related code without tests

## Resources

- [Google Testing Blog - Code Coverage Best Practices](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)
- [Jest Documentation - Coverage Configuration](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)

## Remember

> "The goal is not 100% coverage. The goal is confidence in your code's correctness and maintainability."

Coverage is a tool, not a goal. Use it wisely to build reliable, maintainable software.
