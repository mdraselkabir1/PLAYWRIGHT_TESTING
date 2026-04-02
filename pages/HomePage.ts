import { Page } from '@playwright/test';
import { HomeLocators } from '../locators/HomeLocators';

export class HomePage {
  readonly page: Page;
  readonly locators: HomeLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = new HomeLocators(page);
  }

  async goto() {
    await this.page.goto('/');
  }

  async getTitle() {
    return this.page.title();
  }

  async isNavVisible() {
    return this.page.locator(this.locators.nav).isVisible();
  }

  async clickNavLink(linkText: string) {
    await this.page.click(`nav >> text=${linkText}`);
  }
}
