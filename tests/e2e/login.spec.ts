import { test, expect } from '@playwright/test';

test.describe('Timeline Estratégica', () => {
  test('deve carregar a timeline estratégica', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Global Parts Technology Roadmap/);
  });
});
