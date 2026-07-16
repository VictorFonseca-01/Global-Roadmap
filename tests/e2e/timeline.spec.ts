import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test('deve carregar a tela de timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Timeline Gantt - Governança de TI')).toBeVisible();
  });
});
