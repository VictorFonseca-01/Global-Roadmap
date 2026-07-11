import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela inicial', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });
});
