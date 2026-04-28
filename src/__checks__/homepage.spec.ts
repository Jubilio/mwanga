import { test, expect } from '@playwright/test'

test(' Mwanga Homepage loads correctly', async ({ page }) => {
  await page.goto(process.env.BASE_URL || '/')
  
  // Check if the title or a key branding element is present
  await expect(page).toHaveTitle(/Mwanga/)
  
  // Check for the "Explorador" persona text if it's visible or some key UI element
  const brand = page.locator('text=Mwanga')
  await expect(brand).toBeVisible()
  
  // Take a screenshot for the report
  await page.screenshot({ path: 'homepage.png' })
})
