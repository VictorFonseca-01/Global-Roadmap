import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test('deve carregar a tela inicial com o Gantt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IT GOVERNANCE')).toBeVisible();
    await expect(page.getByText('Dashboard Executivo')).toBeVisible();
  });
});
