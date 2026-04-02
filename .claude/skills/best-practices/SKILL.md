---
name: playwright-best-practices
description: Use when writing Playwright tests, setting up page objects and locators, organizing test files, or implementing the Page Object Model pattern
---

# Playwright Best Practices

Get guidance on Playwright testing best practices and clean coding standards for this project. Learn how to write better, more maintainable tests.

## When to Use

- Writing new Playwright test files
- Setting up locators and page objects
- Organizing tests into features
- Implementing the Page Object Model pattern
- Reviewing test code for quality issues
- Debugging flaky or unreliable tests

## Core Patterns

### 1. Page Object Model (POM)
Learn how to structure your code using the Page Object Model pattern:

#### Core Principles
- **Why**: Centralized element management, easier maintenance, code reuse, test isolation
- **Structure**: `@locators/` for selectors, `@pages/` for page interactions
- **Best Practice**: One locator class + one page class per unique page
- **Separation**: Locators stay in `@locators/`, methods stay in `@pages/`, tests stay in `@tests/`

#### The Three Layers

**Layer 1: @locators/ - Selector Management**
All CSS selectors, XPaths, and element references live here:

```typescript
// ✅ Good: ContactLocators.ts
export class ContactLocators {
  constructor(private page: Page) {}

  // Getters for element locators
  get nameInput() { return this.page.locator('input[name="name"]'); }
  get emailInput() { return this.page.getByLabel('Email'); }
  get messageTextarea() { return this.page.locator('textarea[name="message"]'); }
  get submitButton() { return this.page.getByRole('button', { name: 'Submit' }); }
  get successMessage() { return this.page.locator('.success-banner'); }
}
```

**Layer 2: @pages/ - Page Methods**
Business logic and user interactions wrap around locators:

```typescript
// ✅ Good: ContactPage.ts
export class ContactPage extends BasePage {
  private locators = new ContactLocators(this.page);

  async goto() {
    await this.page.goto('/contact');
  }

  async fillContactForm(data: ContactFormData) {
    await this.locators.nameInput.fill(data.name);
    await this.locators.emailInput.fill(data.email);
    await this.locators.messageTextarea.fill(data.message);
  }

  async submitForm() {
    await this.locators.submitButton.click();
  }

  async waitForSuccessMessage() {
    await expect(this.locators.successMessage).toBeVisible();
  }
}
```

**Layer 3: @tests/ - Test Execution**
Tests use page objects, never direct locators:

```typescript
// ✅ Good: contact.spec.ts
import { ContactPage } from '../pages/ContactPage';

test('submit contact form', async ({ page }) => {
  const contactPage = new ContactPage(page);
  await contactPage.goto();
  await contactPage.fillContactForm({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!'
  });
  await contactPage.submitForm();
  await contactPage.waitForSuccessMessage();
});
```

#### Anti-Patterns to Avoid

```typescript
// ❌ Bad: Hardcoded selectors in test files
test('contact form', async ({ page }) => {
  await page.locator('[data-testid="submit"]').click();
});

// ❌ Bad: Business logic in locators
export class ContactLocators {
  async submitForm() { // ← Wrong layer!
    await this.submitButton.click();
  }
}

// ❌ Bad: Page methods returning selectors
async getSubmitButton() {
  return this.page.locator('button'); // ← Should be in locators
}

// ❌ Bad: Direct element access in tests
test('form', async ({ page }) => {
  const locators = new ContactLocators(page);
  await locators.submitButton.click(); // ← Use page object method instead
});
```

---

### 2. Locator Strategies
Choose the right locator strategy for reliability and maintainability:

**Preference Order** (most to least reliable):
1. `getByRole()` - Semantic, accessible
2. `getByLabel()` - For form inputs
3. `getByPlaceholder()` - For input fields
4. `getByText()` - For buttons and links
5. `getByTestId()` - When others don't work (requires test-id attribute)
6. CSS/XPath - Last resort (fragile!)

```typescript
// ✅ Best: Using getByRole
get submitButton() { return this.page.getByRole('button', { name: 'Submit' }); }

// ✅ Good: Using getByTestId with data-testid
get contactForm() { return this.page.locator('[data-testid="contact-form"]'); }

// ❌ Avoid: CSS selectors (fragile, breaks easily)
get submitButton() { return this.page.locator('form > div:nth-child(3) > button'); }
```

---

### 3. Async/Await Patterns
Properly handle asynchronous operations:

```typescript
// ✅ Good: Proper async/await
async fillForm(data: FormData): Promise<void> {
  await this.page.fill('[name="email"]', data.email);
  await this.page.fill('[name="message"]', data.message);
}

// ❌ Bad: Mixing promises and callbacks
const fillForm = (data) => {
  this.page.fill('[name="email"]', data.email).then(() => {...});
};

// ❌ Bad: Forgetting await
async clickButton() {
  this.page.click('button'); // Missing await!
}
```

---

### 4. Error Handling
Write tests that handle errors gracefully:

```typescript
// ✅ Good: Expecting errors
test('display error on invalid email', async ({ page }) => {
  await homePage.fillEmail('invalid');
  await homePage.clickSubmit();

  const errorMsg = page.locator('.error-message');
  await expect(errorMsg).toBeVisible();
  await expect(errorMsg).toContainText('Invalid email');
});

// ❌ Bad: Tests fail silently on errors
test('submit form', async ({ page }) => {
  await homePage.fillForm(data);
  // If fillForm fails, test continues and may pass incorrectly
});
```

---

## Organization & Structure

### 5. Test Organization
Structure tests for clarity and maintainability:

```typescript
// ✅ Good: Organized with describe blocks
describe('Contact Form', () => {
  describe('Submission', () => {
    test('should submit with valid data', async ({ page }) => { ... });
    test('should show error with invalid data', async ({ page }) => { ... });
  });

  describe('Validation', () => {
    test('should require email field', async ({ page }) => { ... });
    test('should validate email format', async ({ page }) => { ... });
  });
});

// ❌ Bad: Flat, unorganized tests
test('contact form test 1', async ({ page }) => { ... });
test('contact form test 2', async ({ page }) => { ... });
test('validation test 1', async ({ page }) => { ... });
```

---

### 6. Test Fixtures & Setup
Use fixtures for common setup:

```typescript
// ✅ Good: Using page object fixtures
test('should submit form', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.fillAndSubmitForm(data);
  await expect(page).toHaveURL(/success/);
});

// ❌ Bad: Repeating setup in every test
test('test 1', async ({ page }) => {
  await page.goto('https://example.com');
  const form = page.locator('form');
  // ... test code
});
test('test 2', async ({ page }) => {
  await page.goto('https://example.com');
  const form = page.locator('form');
  // ... test code
});
```

---

## Code Quality

### 7. DRY Principle (Don't Repeat Yourself)
Eliminate code duplication:

```typescript
// ❌ Bad: Repeated code in multiple page objects
// In HomePage.ts
async fillEmail(email: string) {
  await this.page.fill('[name="email"]', email);
  await this.page.keyboard.press('Tab');
}

// In ContactPage.ts
async fillEmail(email: string) {
  await this.page.fill('[name="email"]', email);
  await this.page.keyboard.press('Tab');
}

// ✅ Good: Extract to base class
export class BasePage {
  protected async fillField(name: string, value: string) {
    await this.page.fill(`[name="${name}"]`, value);
  }
}

export class HomePage extends BasePage {
  async fillEmail(email: string) {
    await this.fillField('email', email);
  }
}
```

---

### 7.5 POM Implementation Guide
**How to create a new page object from scratch:**

**Step 1: Identify the page/component**
- What URL does it load? (`/contact`, `/dashboard`)
- What unique elements are on it?
- What user actions can be performed?

**Step 2: Create the Locators class**
```typescript
// @locators/NewPageLocators.ts
import { Page } from '@playwright/test';

export class NewPageLocators {
  constructor(private page: Page) {}

  // Group related elements
  // Form elements
  get nameField() { return this.page.getByLabel('Name'); }

  // Buttons
  get submitBtn() { return this.page.getByRole('button', { name: 'Submit' }); }

  // Messages
  get errorMessage() { return this.page.locator('.error'); }
}
```

**Step 3: Create the Page class**
```typescript
// @pages/NewPage.ts
import { Page, expect } from '@playwright/test';
import { NewPageLocators } from '../locators/NewPageLocators';

export class NewPage {
  private locators: NewPageLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = new NewPageLocators(page);
  }

  // Navigation
  async goto() {
    await this.page.goto('/new-page');
  }

  // User interactions (group by feature)
  async fillForm(data: FormData) {
    await this.locators.nameField.fill(data.name);
  }

  async submit() {
    await this.locators.submitBtn.click();
  }

  // Assertions/waits (what to expect)
  async waitForError() {
    await expect(this.locators.errorMessage).toBeVisible();
  }
}
```

**Step 4: Use in tests**
```typescript
// tests/feature/new-page.spec.ts
import { NewPage } from '../pages/NewPage';

test('user can fill and submit form', async ({ page }) => {
  const newPage = new NewPage(page);
  await newPage.goto();
  await newPage.fillForm({ name: 'John' });
  await newPage.submit();
  await newPage.waitForError();
});
```

**When to Use Base Classes**
```typescript
// ✅ Create BasePage when multiple pages share common functionality
export class BasePage {
  constructor(protected page: Page) {}

  // Common methods all pages need
  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForLoadState() {
    await this.page.waitForLoadState('networkidle');
  }
}

// ✅ Specific pages extend base
export class ContactPage extends BasePage {
  private locators = new ContactLocators(this.page);
  // Page-specific methods
}
```

---

### 8. Naming Conventions
Use clear, descriptive names:

```typescript
// ✅ Good: Clear, action-oriented names
async clickSubmitButton(): Promise<void> { ... }
async fillContactForm(data: ContactData): Promise<void> { ... }
async waitForSuccessMessage(): Promise<void> { ... }

// ❌ Bad: Vague, unclear names
async click(): Promise<void> { ... }
async fill(): Promise<void> { ... }
async wait(): Promise<void> { ... }
```

---

### 9. Avoid Magic Numbers & Strings
Use named constants:

```typescript
// ❌ Bad: Magic numbers
await page.waitForTimeout(5000);
expect(items).toHaveLength(10);

// ✅ Good: Named constants
private readonly TIMEOUT_MS = 5000;
private readonly EXPECTED_ITEM_COUNT = 10;

await page.waitForTimeout(this.TIMEOUT_MS);
expect(items).toHaveLength(this.EXPECTED_ITEM_COUNT);
```

---

## Performance & Reliability

### 10. Waits & Timeouts
Use Playwright's built-in waiting mechanisms:

```typescript
// ✅ Good: Let Playwright wait for elements
await this.page.getByRole('button', { name: 'Submit' }).click();
// Playwright automatically waits for element to be available

// ✅ Good: Explicit waits for specific conditions
await page.waitForLoadState('networkidle');
await expect(successMessage).toBeVisible();

// ❌ Bad: Arbitrary sleep
await page.waitForTimeout(5000); // Use only as last resort!

// ❌ Bad: Polling manually
let found = false;
for (let i = 0; i < 100; i++) {
  if (await page.locator('.element').isVisible()) {
    found = true;
    break;
  }
  await page.waitForTimeout(100);
}
```

---

### 11. Test Independence
Each test must be independent:

```typescript
// ❌ Bad: Tests depend on execution order
test('create user', async ({ page }) => {
  await createUser('john@example.com');
  // Modifies global state
});

test('update user', async ({ page }) => {
  // Depends on previous test creating a user first!
  await updateUser('john@example.com');
});

// ✅ Good: Each test sets up its own data
test('create user', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;
  await createUser(email);
  await expect(page).toContainText(email);
});

test('update user', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;
  await createUser(email);
  await updateUser(email, { name: 'Updated' });
  await expect(page).toContainText('Updated');
});
```

---

## Quick Reference Checklist

Before committing or submitting PR, verify:

**Page Object Model Structure:**
- ✅ Selectors are in `@locators/` files, not scattered in tests
- ✅ Page methods are in `@pages/` classes
- ✅ Tests only use page object methods (no direct locators)
- ✅ One locator class + one page class per page
- ✅ Separation of concerns maintained (locators/pages/tests)

**Locator Quality:**
- ✅ Using `getByRole()`, `getByLabel()` for locators (not CSS)
- ✅ Avoiding CSS selectors with nth-child, deep nesting
- ✅ Using `getByTestId()` only when other strategies don't work
- ✅ All selectors are in `@locators/` classes

**Code Quality:**
- ✅ All async operations have `await`
- ✅ Tests are independent, can run in any order
- ✅ No hardcoded values (use constants instead)
- ✅ Error cases are tested
- ✅ Code is DRY (no duplication)
- ✅ Methods are under 30 lines
- ✅ Clear, descriptive naming throughout
- ✅ Proper error messages in assertions
- ✅ No arbitrary waits (use Playwright's built-in waiting)

**TypeScript/Maintainability:**
- ✅ Page methods have proper type annotations
- ✅ Locator getters are properly typed
- ✅ No `any` types without good reason

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| CSS selectors `form > div:nth-child(3)` | Use `getByRole()` or `getByTestId()` for stability |
| Forgetting `await` on async calls | Every Playwright action needs `await` |
| Tests depending on execution order | Each test must be independent and set its own data |
| Magic numbers like `5000` | Use named constants: `TIMEOUT_MS = 5000` |
| Mixing selectors in test files | Centralize all locators in `@locators/` classes |
| Hardcoded URLs and test data | Use environment variables and fixtures |

---

## POM-Specific Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Selectors in page methods | Scattered, hard to maintain | Move to `@locators/` class |
| Methods in test files | Not reusable, duplicated logic | Extract to `@pages/` class |
| Page methods that return selectors | Breaking separation of concerns | Method should do action, not return element |
| Tests creating locators directly | Bypasses page object encapsulation | Always use page object methods |
| Mixing UI logic in locators | Locators should only select elements | Business logic goes in page methods |
| Huge page classes (100+ lines) | Hard to maintain, violates SRP | Split into smaller focused methods |
| Page objects without constructor | Hard to manage dependencies | Always inject `page` in constructor |
| Same locators in multiple files | Maintenance nightmare | Create shared base locators or consolidate |

---

## POM Checklist

When creating or updating page objects:

✅ **Locators (@locators/)**
- [ ] All selectors are in `@locators/` classes
- [ ] Using `getByRole()` > `getByLabel()` > `getByTestId()` > CSS
- [ ] Locator class has proper constructor and `page` parameter
- [ ] Locators are named descriptively (submitButton, not btn1)
- [ ] One locator class per page

✅ **Page Methods (@pages/)**
- [ ] All business logic is in page classes
- [ ] Methods are action-oriented (fillForm, submitForm, waitForError)
- [ ] Methods use locators from the locator class
- [ ] Each method does ONE thing (single responsibility)
- [ ] Methods are under 30 lines of code
- [ ] Public methods have clear names, private helpers are prefixed with `_`
- [ ] Using proper TypeScript types for parameters/returns

✅ **Test Files (@tests/)**
- [ ] Tests only use page object methods
- [ ] No direct element locators in tests
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Each test is independent and sets up its own data
- [ ] Clear, descriptive test names
- [ ] One page object instance per test (imported from @pages/)

✅ **Base Classes**
- [ ] Common functionality extracted to BasePage
- [ ] BasePage handles navigation, waits, common assertions
- [ ] All page classes extend BasePage (if shared methods exist)
- [ ] BaseLocators for common locator patterns

## Project Structure Reference

Refer to [CLAUDE.md](CLAUDE.md) for:
- Folder structure and organization
- Key Playwright commands
- Configuration details
- Development workflow specifics
