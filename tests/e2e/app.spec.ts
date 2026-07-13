import { test, expect } from '@playwright/test';

test.describe('Strategic Timeline', () => {
  test('deve carregar a timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('aside')).toBeVisible();
  });
});
