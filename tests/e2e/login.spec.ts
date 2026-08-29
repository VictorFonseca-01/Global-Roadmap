import { test, expect } from '@playwright/test';

test.describe('Strategic Timeline Access', () => {
  test('deve carregar a tela principal (Strategic Timeline)', async ({ page }) => {
    await page.goto('/');
    // 'Global Parts Technology Roadmap' is the title, let's look for something visible
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
  });
});
