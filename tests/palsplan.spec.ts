import { expect, test } from '@playwright/test'

test('friends can create a trip, choose dates, and join with its code', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Find the dates/i })).toBeVisible()

  await page.getByRole('button', { name: /Start a new trip/i }).click()
  await page.getByLabel('Trip name').fill('Caribbean long weekend')
  await page.getByLabel(/Destination/).fill('Cartagena')
  await page.getByLabel('Your name').fill('Dani')
  await page.getByRole('button', { name: /Create the trip/i }).click()

  await expect(page.getByRole('heading', { name: 'Caribbean long weekend' })).toBeVisible()
  await expect(page.getByText('Cartagena')).toBeVisible()

  const availableDates = page.locator('button.date-cell:not([disabled])')
  const dateLabels = await availableDates.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
  expect(dateLabels[2]).not.toBe(dateLabels[3])
  await availableDates.nth(2).click()
  await expect(page.locator('.save-bar')).toContainText('1 date selected')
  await availableDates.nth(3).click()
  await expect(page.locator('.save-bar')).toContainText('2 dates selected')
  await page.getByRole('button', { name: /Save my dates/i }).click()
  await expect(page.getByRole('button', { name: /Saved/i })).toBeVisible()

  const tripCode = await page.locator('.code-chip strong').textContent()
  expect(tripCode).toMatch(/^[A-Z0-9]{6}$/)
  const tripUrl = page.url()

  await page.evaluate(() => localStorage.removeItem('palsplan:members'))
  await page.goto(tripUrl)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Your name').fill('Maya')
  await page.getByRole('button', { name: /Join the trip/i }).click()
  await expect(page.getByText('2 travelers')).toBeVisible()
  await expect(page.getByText('Maya', { exact: true }).first()).toBeVisible()
})

test('invalid invite code has a useful error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Trip code').fill('ABC123')
  await page.getByRole('button', { name: /Join trip/i }).click()
  await expect(page.getByText(/couldn’t find that trip/i)).toBeVisible()
})
