import { Page } from '@playwright/test';
import { ContactLocators } from '../locators/ContactLocators';

export class ContactPage {
  readonly page: Page;
  readonly locators: ContactLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = new ContactLocators(page);
  }

  async goto() {
    await this.page.goto('https://www.dsinnovators.com/contact');
  }

  async fillForm(name: string, email: string, message: string) {
    await this.page.fill(this.locators.nameInput, name);
    await this.page.fill(this.locators.emailInput, email);
    await this.page.fill(this.locators.messageTextarea, message);
  }

  async submit() {
    await this.page.click(this.locators.submitButton);
  }

  async isSuccessVisible() {
    return this.page.locator(this.locators.successAlert).isVisible();
  }

  async isErrorVisible() {
    return this.page.locator(this.locators.errorAlert).isVisible();
  }
}
