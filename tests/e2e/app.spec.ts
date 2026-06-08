import { expect, test } from '@playwright/test'

test('loads the schedule editor', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Schedle' })).toBeVisible()
  await expect(page.getByText('Task 1')).toBeVisible()
})
