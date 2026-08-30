import { test, expect } from '@playwright/test';

test.describe('Timeline App', () => {
  test('deve carregar a aplicacao principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nova Iniciativa' })).toBeVisible();
  });
});
