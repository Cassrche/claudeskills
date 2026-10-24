import type { Page } from '@playwright/test'

/**
 * Helper function to wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Helper function to take a screenshot with a consistent naming pattern
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true
  })
}

/**
 * Helper function to check if an element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate(sel => {
    const element = document.querySelector(sel)
    if (!element) return false

    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }, selector)
}

/**
 * Helper function to login (if authentication is implemented)
 */
export async function login(page: Page, username: string, password: string) {
  // This is a placeholder for future authentication
  await page.goto('/login')
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}

/**
 * Helper function to clear all cookies and local storage
 */
export async function clearBrowserData(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Helper function to mock API responses
 */
export async function mockAPIResponse(page: Page, url: string, response: any) {
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * Helper function to wait for element to be visible and stable
 */
export async function waitForElementStable(page: Page, selector: string) {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  await element.waitFor({ state: 'attached' })
  await page.waitForTimeout(100) // Brief pause to ensure stability
  return element
}
