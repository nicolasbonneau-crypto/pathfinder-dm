import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('loads knowledge page by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ask anything about your Pathfinder 2e rulebooks.')).toBeVisible()
  })

  test('navigates to combat page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Combat/ }).click()
    await expect(page).toHaveURL('/combat')
    await expect(page.getByText(/Encounter/)).toBeVisible()
  })

  test('navigates back to knowledge page', async ({ page }) => {
    await page.goto('/combat')
    await page.getByRole('link', { name: /Knowledge/ }).click()
    await expect(page).toHaveURL('/')
  })
})
