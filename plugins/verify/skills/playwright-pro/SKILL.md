---
name: playwright-pro
description: "Playwright test authoring toolkit: set up Playwright in a project, generate tests from a user story, URL or component using 55 ready-made templates (auth, CRUD, checkout, search, forms, dashboard, settings, onboarding, notifications, API, accessibility), review tests against a 20-item anti-pattern list, and diagnose flaky or failing tests by category. Use when the user mentions Playwright tests, end-to-end testing, browser automation, fixing flaky tests, migrating from Cypress or Selenium, CI/CD testing, or test suites."
---

# Playwright Pro

Production-grade Playwright testing toolkit for AI coding agents. Four workflows,
all driven from this one skill: **init**, **generate**, **review**, **fix**. Each
reads the project first and follows the Golden Rules below.

## Quick Start Workflow

The recommended sequence for most projects:

```
1. Init      → scaffolds config, CI pipeline, and a first smoke test
2. Generate  → generates tests from your spec or URL (using templates/)
3. Review    → validates quality and flags anti-patterns      ← always run after generate
4. Fix       → diagnoses and repairs any failing/flaky tests  ← run when CI turns red
```

**Validation checkpoints:**
- After generating — always review before committing; the review catches locator anti-patterns and missing assertions.
- After fixing — re-run the full suite locally (`npx playwright test`) to confirm the fix doesn't introduce regressions.
- After migrating from Cypress/Selenium — compare what the old suite covered against the new one before decommissioning it. The locator and assertion rules below apply unchanged to migrated tests.

### Example: Generate → Review → Fix

```bash
# 1. Generate tests from a user story
#    "As a user I can log in with email and password"
#    → tests/auth/login.spec.ts, built from templates/auth/login.md

# 2. Review the generated test
#    → Flags: one test used page.locator('input[type=password]') — suggests getByLabel('Password')
#    → Fix applied.

# 3. Run locally to confirm
npx playwright test tests/auth/login.spec.ts --headed

# 4. If a test is flaky in CI, diagnose it
#    → Identifies missing web-first assertion; replaces waitForTimeout(2000) with expect(locator).toBeVisible()
```

## Golden Rules

1. `getByRole()` over CSS/XPath — resilient to markup changes
2. Never `page.waitForTimeout()` — use web-first assertions
3. `expect(locator)` auto-retries; `expect(await locator.textContent())` does not
4. Isolate every test — no shared state between tests
5. `baseURL` in config — zero hardcoded URLs
6. Retries: `2` in CI, `0` locally
7. Traces: `'on-first-retry'` — rich debugging without slowdown
8. Fixtures over globals — `test.extend()` for shared state
9. One behavior per test — multiple related assertions are fine
10. Mock external services only — never mock your own app

## Locator Priority

```
1. getByRole()        — buttons, links, headings, form elements
2. getByLabel()       — form fields with labels
3. getByText()        — non-interactive text
4. getByPlaceholder() — inputs with placeholder
5. getByTestId()      — when no semantic option exists
6. page.locator()     — CSS/XPath as last resort
```

## Workflow 1: Init (set up Playwright in a project)

Use when the user says "set up playwright", "add e2e tests", "configure playwright",
"init playwright", or "add test infrastructure".

1. **Analyze the project.** Check `package.json` for the framework (React, Next.js,
   Vue, Angular, Svelte); `tsconfig.json` → TypeScript, otherwise JavaScript; whether
   `@playwright/test` is already installed; existing test dirs (`tests/`, `e2e/`,
   `__tests__/`); existing CI config (`.github/workflows/`, `.gitlab-ci.yml`).
2. **Install** if missing: `npm init playwright@latest -- --quiet`, or manually
   `npm install -D @playwright/test && npx playwright install --with-deps chromium`.
3. **Generate `playwright.config.ts`**, adapted to the framework:

   ```typescript
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: [['html', { open: 'never' }], ['list']],
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
       screenshot: 'only-on-failure',
     },
     projects: [
       { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
       { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
       { name: 'webkit', use: { ...devices['Desktop Safari'] } },
     ],
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
     },
   });
   ```

   Next.js: as above. React (Vite): `baseURL` `http://localhost:5173`. Vue/Nuxt:
   `http://localhost:3000`. Angular: `http://localhost:4200`, `webServer.command`
   `npm run start`. No framework detected: omit `webServer`, set `baseURL` from user
   input or leave a placeholder.
4. **Folder structure:** `e2e/fixtures/index.ts` (custom fixtures), `e2e/pages/`
   (page objects), `e2e/test-data/`, `e2e/example.spec.ts`.
5. **Example test:**

   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Homepage', () => {
     test('should load successfully', async ({ page }) => {
       await page.goto('/');
       await expect(page).toHaveTitle(/.+/);
     });

     test('should have visible navigation', async ({ page }) => {
       await page.goto('/');
       await expect(page.getByRole('navigation')).toBeVisible();
     });
   });
   ```
6. **CI workflow.** If `.github/workflows/` exists, create `playwright.yml`:
   checkout, `setup-node` (lts), `npm ci`, `npx playwright install --with-deps`,
   `npx playwright test`, then `upload-artifact` of `playwright-report/` with
   `if: ${{ !cancelled() }}` and `retention-days: 30`, `timeout-minutes: 60`. If
   `.gitlab-ci.yml` exists, add a Playwright stage instead.
7. **`.gitignore`:** append `/test-results/`, `/playwright-report/`, `/blob-report/`,
   `/playwright/.cache/` if not present.
8. **npm scripts:** `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`,
   `"test:e2e:debug": "playwright test --debug"`.
9. **Verify:** `npx playwright test`. If it fails, diagnose and fix before completing.

Report what was created: config path and key settings, test directory and example
test, CI workflow (if any), npm scripts, and how to run.

## Workflow 2: Generate (tests from a story, URL or component)

Use when the user says "write tests", "generate tests", "add tests for", "test this
component", "e2e test", "create test for", "test this page", or "test this feature".

1. **Understand the target.** A user story → the behavior to verify; a component path →
   read its source for props, states and interactions; a page/URL → identify the route
   and its elements; a feature name → map it to app areas.
2. **Explore the codebase** (the Explore subagent is a good fit): read
   `playwright.config.ts` for `testDir`, `baseURL`, `projects`; check existing tests
   for patterns, fixtures and conventions; check `pages/`, `fixtures/`, and auth setup
   (`auth.setup.ts` or `storageState`).
3. **Select a template** from `templates/` in this skill directory (index in
   `templates/README.md`):

   | If testing... | Load template from |
   |---|---|
   | Login/auth flow | `templates/auth/` |
   | CRUD operations | `templates/crud/` |
   | Checkout/payment | `templates/checkout/` |
   | Search/filter UI | `templates/search/` |
   | Form submission | `templates/forms/` |
   | Dashboard/data | `templates/dashboard/` |
   | Settings page | `templates/settings/` |
   | Onboarding flow | `templates/onboarding/` |
   | Notifications | `templates/notifications/` |
   | API endpoints | `templates/api/` |
   | Accessibility | `templates/accessibility/` |

   Adapt the template to the specific app — replace `{{placeholders}}` with actual
   selectors, URLs and data.
4. **Generate the test.** Structure:

   ```typescript
   import { test, expect } from '@playwright/test';
   // Import custom fixtures if the project uses them

   test.describe('Feature Name', () => {
     test('should <expected behavior>', async ({ page }) => {
       // Arrange: navigate, set up state
       // Act: perform user action
       // Assert: verify outcome
     });
   });
   ```

   Locators in priority order (above). Assertions always web-first:

   ```typescript
   // GOOD — auto-retries
   await expect(page.getByRole('heading')).toBeVisible();
   await expect(page.getByRole('alert')).toHaveText('Success');

   // BAD — no retry
   const text = await page.textContent('.msg');
   expect(text).toBe('Success');
   ```

   Never use `page.waitForTimeout()`, `page.$()`/`page.$$()`, bare CSS selectors
   unless unavoidable, or `page.evaluate()` for things locators can do. Always
   include descriptive test names, error/edge-case tests beside the happy path,
   `await` on every Playwright call, and `baseURL`-relative navigation
   (`page.goto('/')`, not `page.goto('http://...')`).
5. **Match project conventions.** TypeScript → `.spec.ts`; JavaScript → `.spec.js`
   with `require()`; use existing page objects and fixtures; put test data where the
   project keeps it.
6. **Supporting files if needed.** A page object when the test touches 5+ unique
   locators on one page; a fixture for shared setup (auth, data); a JSON file in
   `test-data/` for structured data.
7. **Verify:** `npx playwright test <generated-file> --reporter=list`. If it fails,
   read the error, fix the test (not the app), run again; if it is an app issue,
   report it to the user.

Report the generated file(s), supporting files, the run result, and what behaviors
are now covered.

## Workflow 3: Review (test quality)

Use when the user says "review tests", "check test quality", "audit tests", "improve
tests", "test code review", or "playwright best practices check". Scope: a file, a
directory, or (empty) the project's `testDir`.

1. **Gather context:** `playwright.config.ts`, the `*.spec.ts`/`*.spec.js` files in
   scope, and related page objects and fixtures.
2. **Check each file against the anti-patterns** (full detail in
   `reference/common-pitfalls.md` and `reference/flaky-tests.md`):

   **Critical (must fix):** `waitForTimeout()`; non-web-first assertions
   (`expect(await ...)`); hardcoded URLs instead of `baseURL`; CSS/XPath selectors
   when a role-based locator exists; missing `await` on Playwright calls; shared
   mutable state between tests; execution-order dependencies.

   **Warning (should fix):** tests longer than 50 lines; magic strings without named
   constants; missing error/edge-case tests; `page.evaluate()` for things locators can
   do; `test.describe()` nested more than 2 levels; generic test names ("should work",
   "test 1").

   **Info (consider):** no page objects for pages with 5+ locators; inline test data
   instead of factory/fixture; missing accessibility assertions; no visual regression
   tests for UI-heavy pages; console errors not asserted; network-idle waits instead
   of specific assertions; missing `test.describe()` grouping.
3. **Score each file 1–10:** 9–10 production-ready; 7–8 good, minor improvements;
   5–6 functional but has anti-patterns; 3–4 significant issues, likely flaky; 1–2
   needs rewrite.
4. **Report**, per file:

   ```
   ## <filename> — Score: X/10

   ### Critical
   - Line 15: `waitForTimeout(2000)` → use `expect(locator).toBeVisible()`
   - Line 28: CSS selector `.btn-submit` → `getByRole('button', { name: "submit" })`

   ### Warning
   - Line 42: Test name "test login" → "should redirect to dashboard after login"

   ### Suggestions
   - Consider adding error case: what happens with invalid credentials?
   ```
5. **Project-wide review:** spawn subagents per file for parallel review (up to 5
   concurrent) and aggregate into a summary table.
6. **Offer fixes.** Provide corrected code for each critical issue and ask the user
   (AskUserQuestion) whether to apply them; if yes, apply with Edit.

Output: file-by-file review with scores; summary (total files, average score, critical
count); actionable fix list; coverage gaps (pages/features with no tests).

## Workflow 4: Fix (failing or flaky tests)

Use when the user says "fix test", "flaky test", "test failing", "debug test", "test
broken", "test passes sometimes", or "intermittent failure".

1. **Reproduce:** `npx playwright test <file> --reporter=list`. If it passes, burn
   in: `--repeat-each=10`; then `--fully-parallel --workers=4 --repeat-each=5`.
2. **Capture a trace:** `npx playwright test <file> --trace=on --retries=0` and read
   the trace output.
3. **Categorize** (see `reference/flaky-tests.md`):

   | Category | Symptom | Diagnosis |
   |---|---|---|
   | **Timing/Async** | Fails intermittently everywhere | `--repeat-each=20` reproduces locally |
   | **Test Isolation** | Fails in suite, passes alone | `--workers=1 --grep "test name"` passes |
   | **Environment** | Fails in CI, passes locally | Compare CI vs local screenshots/traces |
   | **Infrastructure** | Random, no pattern | Error references browser internals |
4. **Apply the targeted fix.**
   - Timing/Async: replace `waitForTimeout()` with web-first assertions; add missing
     `await`; wait for the specific network response before asserting; `toBeVisible()`
     before interacting.
   - Test Isolation: remove shared mutable state; create test data per test via API or
     fixtures; unique identifiers for test data; check for database state leaks.
   - Environment: match viewport sizes between local and CI; account for font
     rendering differences in screenshots; run in docker locally to match CI; check
     timezone-dependent assertions.
   - Infrastructure: raise timeouts for slow CI runners; `retries: 2` in CI config;
     reduce parallel workers on browser OOM; ensure browser dependencies are installed.
5. **Verify:** `npx playwright test <file> --repeat-each=10 --reporter=list`. All 10
   must pass; otherwise go back to step 3.
6. **Prevent recurrence:** `retries: 2` in CI, `trace: 'on-first-retry'` in config,
   and add the fix pattern to the project's test conventions.

Output: root-cause category and specific issue; the fix (with diff); verification
result (10/10 passes); prevention recommendation.

## Quick Reference

See the `reference/` directory in this skill for:
- `golden-rules.md` — The 10 non-negotiable rules
- `locators.md` — Complete locator priority with cheat sheet
- `assertions.md` — Web-first assertions reference
- `fixtures.md` — Custom fixtures and storageState patterns
- `common-pitfalls.md` — Top 10 mistakes and fixes
- `flaky-tests.md` — Diagnosis commands and quick fixes

See `templates/README.md` for the full template index (55 templates, each with
TypeScript and JavaScript versions and `{{placeholder}}` markers).
