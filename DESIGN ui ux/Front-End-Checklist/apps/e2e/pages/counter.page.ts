import type { Locator, Page } from '@playwright/test'

/** Page object for the counter example route. */
export class CounterPage {
  readonly page: Page
  readonly incrementButton: Locator
  readonly decrementButton: Locator
  readonly resetButton: Locator
  readonly counterDisplay: Locator
  readonly homeLink: Locator

  constructor(page: Page) {
    this.page = page
    this.incrementButton = page.getByRole('button', { name: /increment/i })
    this.decrementButton = page.getByRole('button', { name: /decrement/i })
    this.resetButton = page.getByRole('button', { name: /reset/i })
    this.counterDisplay = page.getByTestId('counter-display')
    this.homeLink = page.getByRole('link', { name: /home/i })
  }

  async goto() {
    await this.page.goto('/counter')
  }

  async increment() {
    await this.incrementButton.click()
  }

  async decrement() {
    await this.decrementButton.click()
  }

  async reset() {
    await this.resetButton.click()
  }

  async getCounterValue() {
    const text = await this.counterDisplay.textContent()
    return Number.parseInt(text || '0', 10)
  }

  async navigateToHome() {
    await this.homeLink.click()
  }

  async incrementMultiple(times: number) {
    for (let i = 0; i < times; i++) {
      await this.increment()
    }
  }

  async decrementMultiple(times: number) {
    for (let i = 0; i < times; i++) {
      await this.decrement()
    }
  }
}
