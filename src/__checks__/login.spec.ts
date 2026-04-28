import { test, expect } from '@playwright/test'

test('Mwanga Login Page loads correctly', async ({ page }) => {
  await page.goto('/login')
  
  // Check if the login card is visible
  const loginCard = page.locator('.glass-card')
  await expect(loginCard).toBeVisible()
  
  // Check for email input
  await expect(page.locator('input[type="email"]')).toBeVisible()
  
  // Check for branding text
  await expect(page.locator('text=MWANGA')).toBeVisible()
})
