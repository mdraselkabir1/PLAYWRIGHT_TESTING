import { test, expect } from '@playwright/test';
import { ServicesPage } from '../../pages/ServicesPage';

test.describe('Services', () => {
  test('should display all main services', async ({ page }) => {
    const services = new ServicesPage(page);
    await services.goto();
    await expect(page.locator('h1, h2')).toContainText(/Services/i);
    await expect(await services.getServiceCount()).toBeGreaterThan(0);
  });

  test('should open a service detail page', async ({ page }) => {
    const services = new ServicesPage(page);
    await services.goto();
    await services.openFirstService();
    await expect(await services.isServiceDetail()).toBeTruthy();
  });
});
