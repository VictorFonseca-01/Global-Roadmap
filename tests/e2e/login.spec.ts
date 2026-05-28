import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Bem-vindo de volta')).toBeVisible();
    await expect(page.getByPlaceholder('nome@globalp.com.br')).toBeVisible();
  });
});
