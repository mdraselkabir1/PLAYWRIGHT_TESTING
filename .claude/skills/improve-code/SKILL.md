---
name: improve-code
description: Use when refactoring existing code, before submitting PRs, or learning best practices - analyzes code for duplication, complexity, performance issues, and maintainability improvements
---

# Improve Code

Suggest specific code improvements and refactoring opportunities based on clean coding principles and project best practices.

## Usage

```
/improve-code [file-path]
/improve-code - (improve current selection)
```

## Examples

```
/improve-code tests/contact/contact.spec.ts
/improve-code @pages/HomePage.ts
/improve-code @locators/ContactLocators.ts
```

## What This Skill Does

Analyzes code and suggests improvements in the following areas:

### 📐 Page Object Model (POM) Pattern
- **Locator Extraction**: Move hardcoded selectors from tests to @locators/ files
- **Method Extraction**: Move repeated UI interactions into @pages/ methods
- **Locator Reuse**: Identify duplicate locators and consolidate in locator classes
- **Inheritance Strategy**: Suggest base page classes for common functionality
- **Separation of Concerns**: Ensure locators stay in @locators/, methods in @pages/, tests in @tests/

**Specific POM improvements:**
- Hardcoded `page.locator('selector')` → Extract to `@locators/PageLocators.ts`
- Repeated multi-step interactions → Extract to `@pages/PageName.ts` method
- Test data builders → Move to dedicated test helpers or fixtures
- Shared locator patterns (buttons, forms) → Create base locators or shared utilities

### 🎯 Refactoring Opportunities
- **Extract Methods**: Identifies code that should be extracted into separate methods
- **Remove Duplication**: Finds repeated patterns and suggests consolidation
- **Simplify Logic**: Suggests ways to simplify complex conditional logic
- **Reduce Parameters**: Methods with too many parameters
- **Constant Extraction**: Magic values that should be named constants

### 📚 Code Organization
- **Import Optimization**: Unused imports, organization suggestions
- **Method Ordering**: Suggest logical grouping of methods
- **File Structure**: Better organization of related functionality
- **Naming Improvements**: Better names for variables, methods, parameters

### ⚡ Performance
- **Reduce Complexity**: Simplify O(n²) operations to O(n)
- **Avoid Unnecessary Operations**: Remove redundant checks or calls
- **Optimize Locator Strategies**: Suggest faster/more reliable locator strategies
- **Efficient Test Data**: Reuse test data instead of creating new objects

### 🛡️ Robustness
- **Add Error Handling**: Missing try-catch blocks or error handling
- **Add Assertions**: Missing assertions or edge case checks
- **Improve Reliability**: Make tests less flaky, add proper waits
- **Handle Timeouts**: Proper timeout handling for async operations

### 🧬 Maintainability
- **Add Documentation**: Where comments would help
- **Type Annotations**: Missing or improved type definitions
- **Constants for Configuration**: Extract hardcoded values
- **Consistent Patterns**: Align with project conventions

## Output Format

```
## Code Improvement Suggestions

### Refactoring Priority: HIGH

#### 1. Extract Method: fillAndValidateForm
**Location**: HomePage.ts:35-60
**Reason**: 25 lines of repeated form-filling logic exists in multiple tests

**Before**:
async fillForm(name, email) {
  await this.page.fill('[name="name"]', name);
  await this.page.fill('[name="email"]', email);
  await this.page.fill('[name="message"]', 'Test message');
  // ... 20 more lines
}

**After**:
// In HomePage.ts
async fillForm(name, email, message = 'Test message') {
  await this.fillTextField('name', name);
  await this.fillTextField('email', email);
  await this.fillTextField('message', message);
}

private async fillTextField(name: string, value: string) {
  await this.page.fill(`[name="${name}"]`, value);
}

**Impact**: -15 lines of code, improved readability, easier maintenance

---

### Duplication Found: 3 instances

#### 2. Consolidate Locator Definitions
**Files**: HomeLocators.ts, BlogLocators.ts, ContactLocators.ts
**Issue**: All define `get submitButton()` with similar implementations
**Suggestion**: Create a BaseLocators class with common locators

---

### Easy Wins: Quick Improvements

#### 3. Extract Selectors to POM Locators
**Anti-pattern** (in test file):
```typescript
test('fill contact form', async ({ page }) => {
  await page.locator('input[name="name"]').fill('John');
  await page.locator('input[name="email"]').fill('john@test.com');
  await page.locator('button[type="submit"]').click();
});
```

**POM Pattern** (extract to locators + page objects):
```typescript
// @locators/ContactLocators.ts
export class ContactLocators {
  nameInput = () => this.page.locator('input[name="name"]');
  emailInput = () => this.page.locator('input[name="email"]');
  submitButton = () => this.page.locator('button[type="submit"]');
}

// @pages/ContactPage.ts
export class ContactPage extends BasePage {
  private locators = new ContactLocators(this.page);

  async fillContactForm(name: string, email: string) {
    await this.locators.nameInput().fill(name);
    await this.locators.emailInput().fill(email);
  }

  async submitForm() {
    await this.locators.submitButton().click();
  }
}

// tests/contact/contact.spec.ts
test('fill contact form', async ({ page }) => {
  const contactPage = new ContactPage(page);
  await contactPage.fillContactForm('John', 'john@test.com');
  await contactPage.submitForm();
});
```

#### 4. Add Named Constants
**Current**: `await page.waitForTimeout(5000)`
**Better**:
```typescript
private readonly TIMEOUT_MS = 5000;
await page.waitForTimeout(this.TIMEOUT_MS);
```

#### 5. Improve Type Safety
**Current**: `async fillForm(data)`
**Better**: `async fillForm(data: FormData)`

#### 6. Add JSDoc Comments
```typescript
/**
 * Fills the contact form with the provided data
 * @param name - User's full name
 * @param email - User's email address
 * @returns Promise that resolves when form is filled
 */
async fillForm(name: string, email: string): Promise<void>
```

### Impact Summary
- **Lines to Remove**: 45
- **Duplications to Eliminate**: 3
- **Complexity Reduction**: Medium → Low
- **Estimated Refactoring Time**: 30 minutes
- **Testing Impact**: No behavioral changes, tests remain the same
```

## Improvement Categories

### Critical (Must Fix)
- Security vulnerabilities
- Memory leaks
- Test flakiness
- Logic errors
- **POM violations**: Hardcoded selectors in tests, scattered locators

### Important (Should Fix)
- Code duplication (especially UI interactions)
- Performance issues
- Missing error handling
- Type safety gaps
- **Improper separation**: Logic in wrong layer (business logic in locators, etc.)
- **Inconsistent patterns**: Some tests using POM, others not

### Nice to Have (Could Fix)
- Variable naming
- Code formatting
- Documentation
- Test organization
- **POM optimization**: Base classes for shared functionality

## When to Use

✅ Use when you want to improve existing code
✅ Use before submitting a PR for final polish
✅ Use when refactoring legacy tests
✅ Use to learn Playwright best practices
✅ Use when tests have hardcoded selectors (not following POM)
✅ Use when duplicating UI interactions across tests
✅ Use when extracting a new page object class

❌ Don't use when you need to fix a bug (use /debug instead)
❌ Don't use for initial code review (use /pr-review instead)

## POM Refactoring Workflow

### Step 1: Identify POM Violations
- Hardcoded selectors in test files
- Same UI interactions repeated in multiple tests
- Locators scattered across multiple files instead of consolidated
- Complex page setup logic in tests

### Step 2: Extract to @locators/
Move all CSS selectors, XPaths, and element references to dedicated locator classes:
```typescript
// @locators/PageLocators.ts
export class PageLocators {
  button(name: string) = () => this.page.locator(`button:has-text("${name}")`);
}
```

### Step 3: Create Methods in @pages/
Wrap UI interactions in descriptive methods:
```typescript
// @pages/PageName.ts
async clickButton(name: string) {
  await this.locators.button(name).click();
}
```

### Step 4: Update Tests
Replace direct locators with page object methods:
```typescript
// tests/example.spec.ts
const page = new PageName(testPage);
await page.clickButton('Submit');
```

## Output Options

The skill provides:
- **Specific Locations**: Line numbers for changes
- **Before/After Examples**: Clear code comparisons
- **Rationale**: Why this improvement matters
- **Implementation guide**: How to make the change
- **Impact analysis**: What improves (performance, readability, etc.)
