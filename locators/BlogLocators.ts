import { Page } from '@playwright/test';

export class BlogLocators {
  readonly post = '.blog-post, .post';
  readonly postLink = '.blog-post a, .post a';
  readonly article = 'article';
  constructor(_: Page) {}
}
