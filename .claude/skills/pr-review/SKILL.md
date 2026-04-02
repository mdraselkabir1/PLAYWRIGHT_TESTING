---
name: pr-review
description: Use when reviewing code for Playwright tests and page objects - checks POM patterns, best practices, and code quality specific to this project
---

# PR Review

Review code for code quality, best practices, and Page Object Model (POM) compliance in Playwright tests.

## When to Use

- Reviewing Playwright test files (`tests/**/*.spec.ts`)
- Reviewing page object classes (`@pages/`)
- Reviewing locator files (`@locators/`)
- Before merging code changes
- When you want feedback on code structure and quality

## Review Process

### 1. Read & Analyze
Read the provided file. Identify:
- Architecture patterns (POM structure, separation of concerns)
- Code quality (naming, method length, DRY principle)
- Playwright best practices (locators, waits, assertions)
- Test structure (independence, fixtures, AAA pattern)
- TypeScript standards (types, imports)

### 2. Score & Categorize
Assign issues to categories:
- **Strengths**: What's done well
- **Critical Issues**: Violations that must be fixed (1-4 score)
- **Major Issues**: Significant problems that should be addressed (5-6 score)
- **Minor Issues**: Improvements recommended (7-8 score)
- **Suggestions**: Nice-to-haves (9-10 score)

### 3. Provide Actionable Feedback
For each issue:
1. What's wrong (specific line)
2. Why it matters (pattern, best practice, maintainability)
3. How to fix it (concrete suggestion with example)

### 4. Output Summary
```
## Code Review Summary
Score: X/10 | Status: [Excellent|Good|Fair|Poor|Critical]

### ✅ Strengths
- [What's working well]

### ⚠️ Issues Found (N)
1. **[Issue Title]** (line XX)
   - Problem: [What's wrong]
   - Why: [Why it matters]
   - Fix: [How to improve]

### 💡 Suggestions
- [Optional improvements]
```

## Scoring Guide
- **9-10**: Excellent - Production ready, no changes needed
- **7-8**: Good - Minor improvements recommended
- **5-6**: Fair - Some refactoring needed before merge
- **3-4**: Poor - Significant issues, address before merge
- **1-2**: Critical - Do not merge without major rework

## What to Check

### POM Architecture (Most Critical)

The project uses a **three-layer** Page Object Model. Verify each layer is respected:

**Layer 1: @locators/ — Selector Management**
- ✅ All CSS selectors, XPaths, and element references live here only
- ✅ Locator class has constructor receiving `page: Page`
- ✅ Elements exposed as getters, not methods
- ✅ One locator class per page
- ❌ Locators contain business logic or async operations
- ❌ Selectors scattered in test files or page classes

```typescript
// ✅ Correct @locators/ContactLocators.ts
export class ContactLocators {
  constructor(private page: Page) {}
  get nameInput() { return this.page.getByLabel('Name'); }
  get submitButton() { return this.page.getByRole('button', { name: 'Submit' }); }
  get successMessage() { return this.page.locator('.success-banner'); }
}

// ❌ Wrong: business logic in locators
export class ContactLocators {
  async submitForm() { await this.submitButton.click(); } // ← belongs in @pages/
}
```

**Layer 2: @pages/ — Page Interactions**
- ✅ Page class imports and uses its corresponding locator class
- ✅ Methods are action-oriented: `fillForm()`, `submitForm()`, `waitForSuccess()`
- ✅ Methods use `this.locators.*` — never raw selectors
- ✅ Methods under 30 lines, each does ONE thing
- ✅ Returns `Promise<void>` for actions, not elements
- ❌ Raw selectors or `page.locator()` calls inside page methods
- ❌ Returning locators/elements from page methods

```typescript
// ✅ Correct @pages/ContactPage.ts
export class ContactPage extends BasePage {
  private locators = new ContactLocators(this.page);

  async goto() { await this.page.goto('/contact'); }

  async fillContactForm(data: { name: string; email: string; message: string }) {
    await this.locators.nameInput.fill(data.name);
    await this.locators.emailInput.fill(data.email);
    await this.locators.messageTextarea.fill(data.message);
  }

  async submitForm() { await this.locators.submitButton.click(); }

  async waitForSuccessMessage() {
    await expect(this.locators.successMessage).toBeVisible();
  }
}

// ❌ Wrong: hardcoded selectors in page class
async fillForm(name: string) {
  await this.page.locator('input[name="name"]').fill(name); // ← selector belongs in @locators/
}
```

**Layer 3: @tests/ — Test Execution**
- ✅ Tests import from `@pages/` only — never from `@locators/`
- ✅ Tests call page object methods — never direct locators
- ✅ Tests follow AAA pattern: Arrange → Act → Assert
- ✅ Each test is independent, sets up its own data
- ❌ `page.locator()`, `page.getByRole()` directly in test body
- ❌ `new ContactLocators(page)` inside test files

```typescript
// ✅ Correct test file
import { ContactPage } from '../pages/ContactPage';

test('submit contact form successfully', async ({ page }) => {
  // Arrange
  const contactPage = new ContactPage(page);
  await contactPage.goto();
  // Act
  await contactPage.fillContactForm({ name: 'John', email: 'john@test.com', message: 'Hello' });
  await contactPage.submitForm();
  // Assert
  await contactPage.waitForSuccessMessage();
});

// ❌ Wrong: locators directly in test
test('contact form', async ({ page }) => {
  await page.locator('[data-testid="submit"]').click(); // ← use page object method
});
```

**POM Violations — Flag as Critical:**

| Violation | Where Found | Fix |
|-----------|-------------|-----|
| Hardcoded selectors in test file | `@tests/` | Extract to `@locators/`, wrap in `@pages/` method |
| Direct `page.locator()` in page method | `@pages/` | Move selector to `@locators/` class |
| Business logic in locator class | `@locators/` | Move to `@pages/` method |
| Test importing from `@locators/` | `@tests/` | Use `@pages/` class only |
| Same locator defined in multiple files | Any | Consolidate to one locator class |
| Page method returning a locator | `@pages/` | Method should perform action, not return element |

---

**Locator Strategy Quality:**

Preference order (most to least reliable):
1. `getByRole()` — semantic, accessible
2. `getByLabel()` — form inputs
3. `getByPlaceholder()` — input fields
4. `getByText()` — buttons and links
5. `getByTestId()` — when others don't work
6. CSS/XPath — **last resort, flag as issue**

```typescript
// ✅ Best
get submitButton() { return this.page.getByRole('button', { name: 'Submit' }); }

// ⚠️ Acceptable
get nameInput() { return this.page.locator('[data-testid="name-input"]'); }

// ❌ Fragile — flag as Major Issue
get submitBtn() { return this.page.locator('form > div:nth-child(3) > button'); }
```

---

**Code Quality:**
- Methods < 30 lines (aim for 15-20)
- camelCase naming, verb-based methods (`fillForm`, `clickSubmit`, `waitForError`)
- DRY principle — extract repeated interactions to page methods or `BasePage`
- No magic numbers or hardcoded strings — use named constants

**Playwright Best Practices:**
- `getByRole`/`getByLabel` preferred over CSS selectors
- Built-in waits via Playwright auto-wait — no `page.waitForTimeout()`
- Proper `expect()` assertions with meaningful messages
- Test fixtures for setup/teardown
- Test independence — no shared state between tests

**Test Structure:**
- AAA pattern (Arrange, Act, Assert) clearly separated
- Tests cover happy path AND error cases
- Clear, descriptive test names (`'should show error when email is invalid'`)
- Proper `beforeEach`/`afterEach` usage
- `describe` blocks grouping related tests

---

## POM Review Checklist

When reviewing any file, check these explicitly:

**@locators/ files:**
- [ ] Only selectors (no methods, no async, no business logic)
- [ ] Uses `getByRole`/`getByLabel` over CSS where possible
- [ ] One class per page, clear naming (`ContactLocators`, `HomeLocators`)
- [ ] Getters, not methods: `get submitButton()` not `submitButton()`

**@pages/ files:**
- [ ] Imports and uses corresponding locator class
- [ ] No raw `page.locator()` or `page.getByRole()` calls
- [ ] Methods are action-oriented and single-responsibility
- [ ] Extends `BasePage` if common functionality is shared
- [ ] Returns `Promise<void>` — not elements or locators

**@tests/ files:**
- [ ] Imports only from `@pages/` (never `@locators/`)
- [ ] Zero direct locator usage in test body
- [ ] Each test is self-contained
- [ ] Follows AAA structure
- [ ] Uses `describe` blocks for grouping
