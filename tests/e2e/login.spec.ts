import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a timeline por padrao', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
  });
});
