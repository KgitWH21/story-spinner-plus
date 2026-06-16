// NOTE: Full payment flow tests require VITE_STRIPE_PUBLISHABLE_KEY to be set to a real pk_test_ key.
// With placeholder key, CardElement will not render and payment tests will not pass.
// Run these tests after setting your Stripe publishable key in .env.local

import { test, expect } from '@playwright/test'

test('donate page renders heading', async ({ page }) => {
  await page.goto('/donate')
  await expect(page.locator('[data-testid="donate-heading"]')).toBeVisible()
  await expect(page.locator('[data-testid="donate-heading"]')).toHaveText('Support Story Spinner Plus')
})

test('stripe elements container is present', async ({ page }) => {
  await page.goto('/donate')
  await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible()
})

test('$10 amount button is selectable', async ({ page }) => {
  await page.goto('/donate')
  const tenButton = page.getByRole('button', { name: '$10' })
  await expect(tenButton).toBeVisible()
  await tenButton.click()
  // Verify it's selected (has visual selection class or aria state)
})
