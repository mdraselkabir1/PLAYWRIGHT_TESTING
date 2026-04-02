import { test, expect } from '@playwright/test';
import { BlogPage } from '../../pages/BlogPage';

test.describe('Blog', () => {
  test('should display blog listing', async ({ page }) => {
    const blog = new BlogPage(page);
    await blog.goto();
    await expect(page.locator('h1, h2')).toContainText(/Blog/i);
    await expect(await blog.getPostCount()).toBeGreaterThan(0);
  });

  test('should open a blog post', async ({ page }) => {
    const blog = new BlogPage(page);
    await blog.goto();
    await blog.openFirstPost();
    await expect(await blog.isArticleVisible()).toBeTruthy();
    await expect(page).toHaveURL(/blog\//i);
  });
});
