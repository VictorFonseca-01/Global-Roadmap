import { test, expect } from '@playwright/test';

test.describe('Acesso à Timeline', () => {
  test('deve carregar a tela da timeline Gantt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
  });
});
