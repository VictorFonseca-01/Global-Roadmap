import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('deve carregar a tela principal (StrategicTimeline)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline Real (Gantt)' })).toBeVisible();
  });
});
