import { test, expect } from '@playwright/test';

test.describe('Página Inicial', () => {
  test('deve carregar a página principal e a timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Timeline Real (Gantt)')).toBeVisible();
  });
});
