import { test, expect } from '@playwright/test';

test.describe('App functionality', () => {
  test('deve carregar a tela principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Timeline Gantt - Governança de TI')).toBeVisible();
  });
});
