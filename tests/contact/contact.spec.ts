import { test, expect } from '@playwright/test';
import { ContactPage } from '../../pages/ContactPage';

test.describe('Contact Form', () => {
  test('should submit contact form with valid data', async ({ page }) => {
    const contact = new ContactPage(page);
    await contact.goto();
    await contact.fillForm('Test User', 'testuser@example.com', 'This is a test message.');
    await contact.submit();
    await expect(await contact.isSuccessVisible()).toBeTruthy();
  });

  test('should show error for invalid email', async ({ page }) => {
    const contact = new ContactPage(page);
    await contact.goto();
    await contact.fillForm('Test User', 'invalid-email', 'This is a test message.');
    await contact.submit();
    await expect(await contact.isErrorVisible()).toBeTruthy();
  });
});
