import type { Locator, Page } from '@playwright/test'

/** Page object for the homepage smoke tests. */
export class HomePage {
  readonly page: Page
  readonly heading: Locator
  readonly counterLink: Locator
  readonly getStartedButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { level: 1 })
    this.counterLink = page.getByRole('link', { name: /counter/i })
    this.getStartedButton = page.getByRole('button', { name: /get started/i })
  }

  async goto() {
    await this.page.goto('/')
  }

  async navigateToCounter() {
    await this.counterLink.click()
  }

  async getHeadingText() {
    return await this.heading.textContent()
  }

  async clickGetStarted() {
    await this.getStartedButton.click()
  }
}
