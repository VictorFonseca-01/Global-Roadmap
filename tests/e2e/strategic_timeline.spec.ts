import { test, expect } from '@playwright/test';

test.describe('Strategic Timeline', () => {
  test('deve carregar a tela principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IT GOVERNANCE')).toBeVisible();
  });
});
