import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Acesso Restrito' })).toBeVisible();
    await expect(page.getByPlaceholder('seu.email@globalparts.com')).toBeVisible();
  });
});
