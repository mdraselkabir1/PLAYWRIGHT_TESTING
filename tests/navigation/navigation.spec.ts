import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('Navigation', () => {
  test('should display the homepage and main navigation', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(await home.getTitle()).toMatch(/DSI|DS Innovators/i);
    await expect(await home.isNavVisible()).toBeTruthy();
  });

  test('should navigate to Services page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickNavLink('Services');
    await expect(page).toHaveURL(/services/i);
    await expect(page.locator('h1, h2')).toContainText(/Services/i);
  });

  test('should navigate to Blog page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickNavLink('Blog');
    await expect(page).toHaveURL(/blog/i);
    await expect(page.locator('h1, h2')).toContainText(/Blog/i);
  });

  test('should navigate to Contact page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickNavLink('Contact');
    await expect(page).toHaveURL(/contact/i);
    await expect(page.locator('h1, h2')).toContainText(/Contact/i);
  });
});
