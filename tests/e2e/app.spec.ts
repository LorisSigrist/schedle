import { expect, test } from '@playwright/test'
import { puzzleUrl } from './puzzle-fixture'

test('loads the schedule editor', async ({ page }) => {
  await page.goto(puzzleUrl)

  await expect(page.getByRole('heading', { name: 'Schedle' })).toBeVisible()
  await expect(page.getByText('Task 1')).toBeVisible()
})

test('can reveal the algorithm solution after an incorrect answer', async ({ page }) => {
  await page.goto(puzzleUrl)

  await page.getByTestId('submit-schedule').click()

  await expect(page.getByTestId('round-result')).toContainText('does not match')
  await page.getByTestId('show-solution').click()
  await expect(page.getByTestId('solution-entry').first()).toBeVisible()
})
