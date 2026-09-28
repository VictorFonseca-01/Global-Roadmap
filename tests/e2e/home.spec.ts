import { test, expect } from '@playwright/test';

test.describe('Acesso a Pagina Principal', () => {
  test('deve carregar a pagina principal de roadmap', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IT GOVERNANCE')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline Real (Gantt)' })).toBeVisible();
  });
});
