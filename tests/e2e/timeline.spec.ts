import { test, expect } from '@playwright/test';

test.describe('Timeline Estratégica', () => {
  test('deve carregar a aplicação e mostrar a timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
  });
});
