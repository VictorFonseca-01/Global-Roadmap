import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Global Parts Technology Roadmap/);
  });
});
