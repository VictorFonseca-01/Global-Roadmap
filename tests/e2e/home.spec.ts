import { test, expect } from '@playwright/test';

test('carrega a página inicial corretamente', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=IT GOVERNANCE')).toBeVisible();
});
