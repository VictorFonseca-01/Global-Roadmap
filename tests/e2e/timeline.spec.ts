import { test, expect } from '@playwright/test';

test.describe('Strategic Timeline', () => {
  test('deve carregar a timeline com as raias iniciais', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Timeline Gantt - Governança de TI')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'INFRASTRUCTURE & SERVERS' }).first()).toBeVisible();
    await expect(page.getByText('Nova Iniciativa').first()).toBeVisible();
  });
});
