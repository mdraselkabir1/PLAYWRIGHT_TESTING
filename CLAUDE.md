# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Playwright end-to-end testing project for the DS Innovators website. Tests are organized by feature and use the Page Object Model pattern for maintainability.

## Key Commands

```bash
# Run all tests across all browsers (chromium, firefox, webkit)
npx playwright test

# Run a single test file
npx playwright test tests/contact/contact.spec.ts

# Run tests matching a pattern
npx playwright test --grep "button"

# Run tests in a specific browser
npx playwright test --project=chromium

# Run tests in headed mode (with browser UI visible)
npx playwright test --headed

# Run tests in debug mode (with inspector)
npx playwright test --debug

# View the HTML report from the last test run
npx playwright show-report

# Update snapshots if visual regression changes are intentional
npx playwright test --update-snapshots
```

## Folder Structure

```
@locators/           # All element locators organized by page
  BlogLocators.ts
  ContactLocators.ts
  HomeLocators.ts
  ServicesLocators.ts

@pages/              # All page object classes with methods
  HomePage.ts
  BlogPage.ts
  ContactPage.ts
  ServicesPage.ts

@tests/              # All test files organized by feature
  example.spec.ts
  seed.spec.ts
  contact/
    contact.spec.ts
  navigation/
    navigation.spec.ts
  blog/
    blog.spec.ts
  services/
    services.spec.ts
```

## Architecture

### Page Object Model (POM)
- **@locators/**: Element locators organized into dedicated classes for each page (BlogLocators, ContactLocators, HomeLocators, ServicesLocators). This centralizes all CSS selectors and element IDs for easy maintenance.
- **@pages/**: Page classes (HomePage, BlogPage, ContactPage, ServicesPage) that encapsulate page-specific methods for interacting with the application. Each page imports its corresponding locators.
- Each page class exposes methods for common interactions (goto(), click(), fill(), getTitle(), etc.)

### Test Organization
- **@tests/**: Test files organized by feature area:
  - `contact/` - Contact page tests
  - `navigation/` - Navigation flow tests
  - `blog/` - Blog page tests
  - `services/` - Services page tests
  - `seed.spec.ts` - Setup/seed test for test planning
  - `example.spec.ts` - Example tests from Playwright docs

### Configuration
- **playwright.config.ts** defines:
  - Test directory: `./tests`
  - Browser projects: chromium, firefox, webkit (desktop only)
  - Reporter: HTML (output in `playwright-report/`)
  - Parallel execution: enabled by default
  - Trace collection: on first retry for failed tests
  - CI-specific settings: reduced workers, increased retries

### MCP Integration
The `.mcp.json` file enables integration with the Playwright MCP server for Claude Code agents (test generation, planning, healing).

## Development Workflow

### Creating New Tests
1. Use the **playwright-test-planner** agent to create a test plan
2. Use the **playwright-test-generator** agent to generate test code
3. Store tests in an appropriate subdirectory of `tests/` based on feature

### Using Page Objects
When writing tests, import the page class from `@pages/` and it will automatically use the locators from `@locators/`:

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test('navigate to home page', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  expect(await home.getTitle()).toContain('DS Innovators');
});
```

**Key Points:**
- Page classes are imported from `@pages/`
- Locators are kept in `@locators/` and referenced internally by page classes
- Tests only need to import the page object, not the locators
- All element selectors are managed in locator classes for easy updates

### Debugging Tests
1. Use `--headed` flag to see what the browser is doing
2. Use `--debug` flag to open the Playwright Inspector
3. Check `playwright-report/` for HTML reports with screenshots and traces
4. Use `npx playwright test --last-failed` to re-run previously failed tests

## Test Structure Notes

- Base URL for HomePage: `https://www.dsinnovators.com/`
- Tests use Playwright's built-in assertions (`expect` from '@playwright/test')
- Locators are managed through Locators classes to centralize element selectors
- No custom npm scripts defined; all operations use npx playwright commands directly
