import { expect, test } from '@playwright/test'

test.describe('marketing smoke @smoke', () => {
  test('homepage renders the main hero', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'Trusted front-end quality rules for humans and AI agents'
      })
    ).toBeVisible()
  })

  test('rules index renders', async ({ page }) => {
    await page.goto('/rules')

    await expect(page.getByRole('heading', { name: 'All Rules' })).toBeVisible()
  })

  test('mcp page renders', async ({ page }) => {
    await page.goto('/mcp')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Frontend Code Review MCP' })
    ).toBeVisible()
  })
})
