import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=IT GOVERNANCE')).toBeVisible();
  });
});
