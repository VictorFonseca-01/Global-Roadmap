import { test, expect } from '@playwright/test';

test.describe('Main Application', () => {
  test('deve carregar a timeline', async ({ page }) => {
    await page.goto('/');
    // Verificando se pelo menos uma aba do menu está visível
    await expect(page.getByRole('button', { name: /Timeline Real/i })).toBeVisible();
  });
});
