import { test as base } from '@playwright/test'
import { CounterPage } from '@/e2e/pages/counter.page'
import { HomePage } from '@/e2e/pages/home.page'
import { AccessibilityUtils } from '@/e2e/utils/accessibility.utils'
import { PerformanceUtils } from '@/e2e/utils/performance.utils'
import { TestUtils } from '@/e2e/utils/test.utils'

type TestFixtures = {
  homePage: HomePage
  counterPage: CounterPage
  accessibilityUtils: AccessibilityUtils
  performanceUtils: PerformanceUtils
  testUtils: TestUtils
}

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page)
    await use(homePage)
  },

  counterPage: async ({ page }, use) => {
    const counterPage = new CounterPage(page)
    await use(counterPage)
  },

  accessibilityUtils: async ({ page }, use) => {
    const accessibilityUtils = new AccessibilityUtils(page)
    await use(accessibilityUtils)
  },

  performanceUtils: async ({ page }, use) => {
    const performanceUtils = new PerformanceUtils(page)
    await use(performanceUtils)
  },

  testUtils: async ({ page }, use) => {
    const testUtils = new TestUtils(page)
    await use(testUtils)
  }
})

export { expect } from '@playwright/test'
