import type { Page } from '@playwright/test'
import { TEST_CONFIG } from '@/e2e/config/test.config'

/** General-purpose Playwright helpers for end-to-end tests. */
export class TestUtils {
  constructor(private page: Page) {}

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle')
  }

  async takeScreenshot(name: string) {
    return await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true
    })
  }

  async mockAPIResponse(url: string, response: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  async waitForElement(selector: string, options?: { timeout?: number }) {
    return await this.page.waitForSelector(selector, {
      timeout: options?.timeout || TEST_CONFIG.timeout
    })
  }

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[name="${field}"]`, value)
    }
  }

  async clearCookies() {
    await this.page.context().clearCookies()
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear())
  }

  async setLocalStorage(key: string, value: any) {
    await this.page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value))
      },
      { key, value }
    )
  }

  async getLocalStorage(key: string) {
    return await this.page.evaluate(key => {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    }, key)
  }

  async checkConsoleErrors() {
    const errors: string[] = []

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    return errors
  }

  async retryAction<T>(action: () => Promise<T>, maxRetries = TEST_CONFIG.retries): Promise<T> {
    let lastError: Error | undefined

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        await this.page.waitForTimeout(1000 * (i + 1))
      }
    }

    throw lastError
  }
}
