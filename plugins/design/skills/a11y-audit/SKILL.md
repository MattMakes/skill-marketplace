---
name: "a11y-audit"
description: "Accessibility audit skill for scanning, fixing, and verifying WCAG 2.2 Level A and AA compliance across React, Next.js, Vue, Angular, Svelte, and plain HTML codebases. Use when auditing accessibility, fixing a11y violations, checking color contrast, generating compliance reports, or integrating accessibility checks into CI/CD pipelines."
---

# Accessibility Audit

WCAG 2.2 Accessibility Audit and Remediation Skill

## Description

The a11y-audit skill provides a complete accessibility audit pipeline for modern web applications. It implements a three-phase workflow -- Scan, Fix, Verify -- that identifies WCAG 2.2 Level A and AA violations, generates exact fix code per framework, and produces stakeholder-ready compliance reports.

For every violation it finds, it provides the precise before/after code fix tailored to your framework (React, Next.js, Vue, Angular, Svelte, or plain HTML).

**What this skill does:**

1. **Scans** your codebase for every WCAG 2.2 Level A and AA violation, categorized by severity (Critical, Major, Minor)
2. **Fixes** each violation with framework-specific before/after code patterns
3. **Verifies** that fixes resolve the original violations and introduces no regressions
4. **Reports** findings in a structured format suitable for developers, PMs, and compliance stakeholders
5. **Integrates** into CI/CD pipelines to prevent accessibility regressions

## Features

| Feature | Description |
|---------|-------------|
| **Full WCAG 2.2 Scan** | Checks all Level A and AA success criteria across your codebase |
| **Framework Detection** | Auto-detects React, Next.js, Vue, Angular, Svelte, or plain HTML |
| **Severity Classification** | Categorizes each violation as Critical, Major, or Minor |
| **Fix Code Generation** | Produces before/after code diffs for every issue |
| **Color Contrast Checker** | Validates foreground/background pairs against AA and AAA ratios |
| **Compliance Reporting** | Generates stakeholder reports with pass/fail summaries |
| **CI/CD Integration** | GitHub Actions, GitLab CI, Azure DevOps pipeline configs |
| **Keyboard Navigation Audit** | Detects missing focus management and tab order issues |
| **ARIA Validation** | Checks for incorrect, redundant, or missing ARIA attributes |

### Severity Definitions

| Severity | Definition | Example | SLA |
|----------|-----------|---------|-----|
| **Critical** | Blocks access for entire user groups | Missing alt text, no keyboard access to navigation | Fix before release |
| **Major** | Significant barrier that degrades experience | Insufficient color contrast, missing form labels | Fix within current sprint |
| **Minor** | Usability issue that causes friction | Redundant ARIA roles, suboptimal heading hierarchy | Fix within next 2 sprints |

## Usage

### Quick Start

```bash
# Scan entire project
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/a11y_scanner.py" /path/to/project

# Scan with JSON output for tooling
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/a11y_scanner.py" /path/to/project --json

# Check color contrast for specific values
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" "#777777" "#ffffff"

# Check every color pair found in a CSS file
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" --batch /path/to/styles.css
```

### Slash Command

```
/a11y-audit                    # Audit current project
/a11y-audit --scope src/       # Audit specific directory
/a11y-audit --fix              # Audit and auto-apply fixes
/a11y-audit --report           # Generate stakeholder report
/a11y-audit --ci               # Output CI-compatible results
```

### Three-Phase Workflow

**Phase 1: Scan** -- Walk the source tree, detect framework, apply rule set.

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/a11y_scanner.py" /path/to/project
```

**Phase 2: Fix** -- Apply framework-specific fixes for each violation.

> See [references/framework-a11y-patterns.md](references/framework-a11y-patterns.md) for the complete fix patterns catalog.

**Phase 3: Verify** -- Re-run the scanner to confirm fixes and check for regressions. Save the Phase 1 output as JSON and diff the `findings` lists.

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/a11y_scanner.py" /path/to/project --json > a11y-after.json
```

## Example: React Component Audit

```tsx
// BEFORE: src/components/ProductCard.tsx
function ProductCard({ product }) {
  return (
    <div onClick={() => navigate(`/product/${product.id}`)}>
      <img src={product.image} />
      <div style={{ color: '#aaa', fontSize: '12px' }}>{product.name}</div>
      <span style={{ color: '#999' }}>${product.price}</span>
    </div>
  );
}
```

| # | WCAG | Severity | Issue |
|---|------|----------|-------|
| 1 | 1.1.1 | Critical | `<img>` missing `alt` attribute |
| 2 | 2.1.1 | Critical | `<div onClick>` not keyboard accessible |
| 3 | 1.4.3 | Major | Color `#aaa` on white fails contrast (2.32:1, needs 4.5:1) |
| 4 | 1.4.3 | Major | Color `#999` on white fails contrast (2.85:1, needs 4.5:1) |
| 5 | 4.1.2 | Major | Interactive element missing role and accessible name |

```tsx
// AFTER: src/components/ProductCard.tsx
function ProductCard({ product }) {
  return (
    <a href={`/product/${product.id}`} className="product-card"
       aria-label={`View ${product.name} - $${product.price}`}>
      <img src={product.image} alt={product.imageAlt || product.name} />
      <div style={{ color: '#595959', fontSize: '12px' }}>{product.name}</div>
      <span style={{ color: '#767676' }}>${product.price}</span>
    </a>
  );
}
```

> See [references/examples-by-framework.md](references/examples-by-framework.md) for Vue, Angular, Next.js, and Svelte examples.

## Tools Reference

### a11y_scanner.py

```
Usage: python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/a11y_scanner.py" <path> [options]

Options:
  --json                  Output results as JSON (shorthand for --format json)
  --format {text,json}    Output format (default: text)
  --severity LIST         Comma-separated severity filter, e.g. critical,serious

Scans .html, .htm, .jsx, .tsx, .vue, .svelte and .css files. The scanner reports
severities as critical, serious, moderate and minor (the Critical / Major / Minor
tiers above map to critical, serious+moderate, minor). Exit codes: 0 = pass,
1 = critical or serious findings, 2 = moderate or minor only. JSON output is
{"summary": {...}, "findings": [...]}; redirect stdout to keep a report.
```

### contrast_checker.py

```
Usage: python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" [foreground] [background] [options]

Arguments:
  foreground, background  Colors as #RRGGBB, #RGB, rgb(r,g,b) or a named CSS color

Options:
  --suggest COLOR         Suggest accessible background colors for a foreground color
  --batch CSS_FILE        Extract color pairs from a CSS file and check each
  --json                  Output results as JSON
  --demo                  Show example output with sample color pairs

Reports AA and AAA results for normal text, large text and UI components in one run.
```

## Common Pitfalls

| Pitfall | Correct Approach |
|---------|------------------|
| `role="button"` on a `<div>` | Use native `<button>` -- includes keyboard handling for free |
| `tabindex="0"` on everything | Only interactive elements need focus; use native elements |
| `aria-label` on non-interactive elements | Use `aria-labelledby` pointing to visible text |
| `display: none` for screen reader hiding | Use `.sr-only` class instead |
| Color alone to convey meaning | Add icons, text labels, or patterns alongside color |
| Placeholder as only label | Always provide a visible `<label>` |
| `outline: none` without replacement | Always provide a visible focus indicator via `focus-visible` |
| Empty `alt=""` on informational images | Informational images need descriptive alt text |
| Skipping heading levels (h1 -> h3) | Heading levels must be sequential |
| `onClick` without `onKeyDown` | Add keyboard support or prefer native elements |
| Ignoring `prefers-reduced-motion` | Wrap animations in `@media (prefers-reduced-motion: no-preference)` |

## Related Skills

`design:accessibility` carries the WCAG 2.1 guideline text with wrong/right examples, `design:screen-reader-testing` covers manual VoiceOver/NVDA/JAWS passes, and `tools:test-driven-development` fits when a11y checks become automated tests.

## Reference Documentation

| Reference | Description |
|-----------|-------------|
| [wcag-quick-ref.md](references/wcag-quick-ref.md) | WCAG 2.2 Level A & AA criteria quick reference |
| [wcag-22-new-criteria.md](references/wcag-22-new-criteria.md) | New WCAG 2.2 success criteria (Focus Appearance, Target Size, etc.) |
| [aria-patterns.md](references/aria-patterns.md) | ARIA patterns, keyboard interaction, and live regions |
| [framework-a11y-patterns.md](references/framework-a11y-patterns.md) | Framework-specific fix patterns (React, Vue, Angular, Svelte, HTML) |
| [color-contrast-guide.md](references/color-contrast-guide.md) | Color contrast checker details, Tailwind palette mapping, sr-only class |
| [ci-cd-integration.md](references/ci-cd-integration.md) | GitHub Actions, GitLab CI, Azure DevOps, pre-commit hook configs |
| [audit-report-template.md](references/audit-report-template.md) | Stakeholder-ready audit report template |
| [testing-checklist.md](references/testing-checklist.md) | Manual testing checklist (keyboard, screen reader, visual, forms) |
| [examples-by-framework.md](references/examples-by-framework.md) | Full audit examples for Vue, Angular, Next.js, and Svelte |

## Resources

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices 1.2](https://www.w3.org/WAI/ARIA/apg/)
- [Deque axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
