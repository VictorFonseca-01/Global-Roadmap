import { test, expect } from '@playwright/test';

test.describe('Página Principal', () => {
  test('deve carregar a timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Timeline Gantt')).toBeVisible();
  });
});
