# E2E Testing with Playwright

## Overview

This directory contains end-to-end tests for the web application using Playwright with a Page Object Model (POM) architecture for maintainability and scalability.

## Architecture

```
e2e/
├── config/           # Centralized test configuration
│   └── test.config.ts
├── fixtures/         # Custom test fixtures and helpers
│   ├── test.fixture.ts
│   └── test-helpers.ts
├── pages/           # Page Object Models
│   ├── base.page.ts
│   ├── home.page.ts
│   └── counter.page.ts
├── tests/           # Test specifications
│   ├── homepage.spec.ts
│   ├── counter.spec.ts
│   ├── accessibility.spec.ts
│   └── performance.spec.ts
└── utils/           # Utility functions
    ├── test.utils.ts
    ├── performance.utils.ts
    └── accessibility.utils.ts
```

## Running Tests

### Local Development

```bash
# Install Playwright browsers (first time only)
pnpm run e2e:install

# Run all tests
pnpm run e2e

# Run tests in headed mode (see browser)
pnpm run e2e:headed

# Run tests in UI mode (interactive)
pnpm run e2e:ui

# Run specific test file
pnpm run e2e tests/homepage.spec.ts

# Run tests with specific tag
pnpm run e2e --grep="@smoke"

# Run tests on specific browser
pnpm run e2e --project=chromium
pnpm run e2e --project=firefox
pnpm run e2e --project=webkit

# Debug tests
pnpm run e2e:debug
```

### CI/CD

Tests run automatically in CI on:
- Pull requests (smoke tests only)
- Pushes to main/develop branches (full suite)
- Deployment workflows

```bash
# Run tests as they run in CI
CI=true pnpm run e2e

# Run with sharding (for parallel execution)
pnpm run e2e --shard=1/3
pnpm run e2e --shard=2/3
pnpm run e2e --shard=3/3
```

## Writing Tests

### Using Page Objects

```typescript
import { test, expect } from '../fixtures/test.fixture'

test('example test', async ({ homePage, counterPage }) => {
  // Navigate using page object
  await homePage.goto()
  
  // Verify using page object methods
  await homePage.verifyPageLoaded()
  
  // Interact with components
  await counterPage.increment()
  await counterPage.verifyCounterValue(1)
})
```

### Using Utilities

```typescript
test('performance test', async ({ performanceUtils }) => {
  const metrics = await performanceUtils.measureCoreWebVitals()
  expect(metrics.lcp).toBeLessThan(2500)
})

test('accessibility test', async ({ accessibilityUtils }) => {
  const result = await accessibilityUtils.checkAccessibilityViolations()
  expect(result.hasViolations).toBe(false)
})
```

### Test Tags

Use tags to categorize tests:

```typescript
test('critical user flow @smoke @critical', async ({ page }) => {
  // Test implementation
})
```

Common tags:
- `@smoke` - Quick smoke tests for PR checks
- `@critical` - Critical user flows
- `@visual` - Visual regression tests
- `@slow` - Long-running tests

## Configuration

### Test Config (e2e/config/test.config.ts)

Central location for all test constants:
- URLs and routes
- Timeouts
- Viewport sizes
- Test data
- Performance thresholds
- Selectors

### Playwright Config (playwright.config.ts)

Playwright-specific settings:
- Browser configurations
- Test directory
- Reporter settings
- Web server settings

## Best Practices

1. **Use Data-TestIds**: Add `data-testid` attributes to elements for stable selectors
2. **Page Object Model**: Encapsulate page logic in page objects
3. **Centralized Config**: Keep all constants in test.config.ts
4. **Reusable Utilities**: Create utility functions for common operations
5. **Parallel Execution**: Tests run in parallel by default
6. **Retry Logic**: Configure retries for flaky tests
7. **Screenshots**: Automatically captured on failure
8. **Assertions**: Use Playwright's built-in assertions for auto-retry

## Debugging

### VS Code Integration

1. Install Playwright Test for VS Code extension
2. Click the play button next to tests to run/debug

### Command Line

```bash
# Debug mode with inspector
pnpm run e2e:debug

# Show browser (headed mode)
pnpm run e2e:headed

# Slow down execution
SLOWMO=1000 pnpm run e2e
```

### Trace Viewer

```bash
# Run with trace
pnpm run e2e --trace on

# View trace
pnpm exec playwright show-trace trace.zip
```

## Reports

### HTML Report

```bash
# Generate and open report
pnpm run e2e:report
```

### GitHub Actions

- Test results appear in PR comments
- Artifacts uploaded for failed tests
- HTML reports available as workflow artifacts

## Troubleshooting

### Common Issues

1. **Browser not installed**
   ```bash
   pnpm run e2e:install
   ```

2. **Port already in use**
   - Check if dev server is running on port 3080
   - Kill existing process or use different port

3. **Timeout errors**
   - Increase timeout in test.config.ts
   - Check network conditions
   - Verify selectors are correct

4. **Flaky tests**
   - Add explicit waits
   - Use Playwright's auto-retry assertions
   - Check for race conditions

## CI/CD Integration

### GitHub Actions Workflows

1. **e2e.yml**: Dedicated E2E test workflow
2. **ci.yml**: Comprehensive CI including E2E
3. **pr.yml**: Quick checks for pull requests

### Environment Variables

Required for CI:
- `CI=true`
- `BASE_URL` (optional, defaults to localhost:3080)

## Performance Testing

The suite includes performance tests that check:
- Core Web Vitals (LCP, FCP, CLS)
- JavaScript bundle size
- Memory leaks
- Page load times

Run performance tests:
```bash
pnpm run e2e --grep="Performance"
```

## Accessibility Testing

Automated accessibility checks include:
- WCAG compliance
- ARIA attributes
- Keyboard navigation
- Color contrast
- Heading hierarchy

Run accessibility tests:
```bash
pnpm run e2e --grep="Accessibility"
```

## Contributing

1. Follow the existing patterns
2. Add data-testid attributes when adding new UI elements
3. Update page objects when UI changes
4. Keep tests independent and idempotent
5. Use descriptive test names
6. Add appropriate tags to new tests