import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela de login', async ({ page }) => {
    await page.goto('/login');

    // AuthGuard may show "Autenticando sessão..." before showing the login screen.
    // Wait for the login screen to be visible.
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('nome@globalp.com.br')).toBeVisible();
  });
});
