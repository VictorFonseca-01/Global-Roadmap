import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela inicial da Timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IT GOVERNANCE')).toBeVisible();
  });
});
