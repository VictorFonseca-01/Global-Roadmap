import { test, expect } from '@playwright/test';

test('carrega a pagina principal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Timeline Real (Gantt)')).toBeVisible();
});
