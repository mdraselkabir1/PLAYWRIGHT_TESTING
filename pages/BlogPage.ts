import { Page } from '@playwright/test';
import { BlogLocators } from '../locators/BlogLocators';

export class BlogPage {
  readonly page: Page;
  readonly locators: BlogLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = new BlogLocators(page);
  }

  async goto() {
    await this.page.goto('/blog');
  }

  async getPostCount() {
    return this.page.locator(this.locators.post).count();
  }

  async openFirstPost() {
    await this.page.locator(this.locators.postLink).first().click();
  }

  async isArticleVisible() {
    return this.page.locator(this.locators.article).isVisible();
  }
}
