import { test, expect } from '@playwright/test';

test.describe('Strategic Timeline', () => {
  test('should load the app', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Global Parts Technology Roadmap');
  });
});
