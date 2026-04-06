import { Page } from '@playwright/test';
import { ServicesLocators } from '../locators/ServicesLocators';

export class ServicesPage {
  readonly page: Page;
  readonly locators: ServicesLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = new ServicesLocators(page);
  }

  async goto() {
    await this.page.goto('/services');
  }

  async getServiceCount() {
    return this.page.locator(this.locators.serviceCard).count();
  }

  async openFirstService() {
    await this.page.locator(this.locators.serviceCardLink).first().click();
  }

  async isServiceDetail() {
    return /services\//i.test(this.page.url());
  }
}
