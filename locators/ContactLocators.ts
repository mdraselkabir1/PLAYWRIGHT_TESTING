import { Page } from '@playwright/test';

export class ContactLocators {
  readonly nameInput = 'input[name="name"]';
  readonly emailInput = 'input[name="email"]';
  readonly messageTextarea = 'textarea[name="message"]';
  readonly submitButton = 'button[type="submit"]';
  readonly successAlert = '.success, .alert-success';
  readonly errorAlert = '.error, .alert-danger';
  constructor(_: Page) {}
}
