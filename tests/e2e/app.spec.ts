import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('deve carregar a tela principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=IT GOVERNANCE')).toBeVisible();
    await expect(page.locator('text=Timeline Real (Gantt)')).toBeVisible();
  });
});
