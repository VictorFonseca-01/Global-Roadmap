import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test('deve carregar a tela da timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Timeline Real (Gantt)')).toBeVisible();
  });
});
