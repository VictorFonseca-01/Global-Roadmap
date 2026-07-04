import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve carregar a tela de login', async ({ page }) => {
    await page.goto('/');
    // Currently, all routes direct to StrategicTimeline in this phase of the project
    await expect(page.getByRole('heading', { name: 'Timeline Gantt - Governança de TI' })).toBeVisible();
  });
});
