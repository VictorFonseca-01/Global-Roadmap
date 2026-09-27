import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve redirecionar ou carregar a página principal', async ({ page }) => {
    // The application routes everything to the Strategic Timeline page currently.
    await page.goto('/');
    // Verifies that the header title of the application is visible.
    await expect(page.getByText('Timeline Gantt - Governança de TI')).toBeVisible();
  });
});
