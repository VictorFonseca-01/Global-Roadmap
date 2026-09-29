import { test, expect } from '@playwright/test';

test.describe('App Rendering', () => {
  test('deve carregar a tela de timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline Real (Gantt)' })).toBeVisible();
  });
});
