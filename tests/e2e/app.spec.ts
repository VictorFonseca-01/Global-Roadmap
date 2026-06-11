import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('deve carregar a tela principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
