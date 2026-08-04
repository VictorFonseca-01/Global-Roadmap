import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve redirecionar ou carregar a página inicial já que o login foi removido', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Timeline Gantt - Governança de TI')).toBeVisible();
  });
});
