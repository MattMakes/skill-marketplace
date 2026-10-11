# Color Contrast Guide

## Contrast Checker Usage

The `contrast_checker.py` script validates color pairs against WCAG 2.2 contrast requirements.

```bash
# Check a single color pair
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" "#777777" "#ffffff"

# Output:
# Foreground : #777777
# Background : #ffffff
# Contrast   : 4.48:1
#   [FAIL] AA Normal Text        (requires 4.5:1)
#   [PASS] AA Large Text         (requires 3.0:1)
#   [FAIL] AAA Normal Text       (requires 7.0:1)

# Suggest accessible backgrounds for a foreground color
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" --suggest "#777777"

# Check every color pair found in a CSS file
python3 "${CLAUDE_PLUGIN_ROOT}/skills/a11y-audit/scripts/contrast_checker.py" --batch src/styles/globals.css
```

Tailwind classes are not parsed; use the palette mapping table below for them.

## Common Contrast Fixes

| Original Color | Contrast on White | Fix | New Contrast |
|----------------|------------------|-----|--------------|
| `#aaaaaa` | 2.32:1 | `#767676` | 4.54:1 (AA) |
| `#999999` | 2.85:1 | `#767676` | 4.54:1 (AA) |
| `#888888` | 3.54:1 | `#767676` | 4.54:1 (AA) |
| `#777777` | 4.48:1 | `#757575` | 4.60:1 (AA) |
| `#66bb6a` | 3.06:1 | `#2e7d32` | 5.87:1 (AA) |
| `#42a5f5` | 2.81:1 | `#1565c0` | 6.08:1 (AA) |
| `#ef5350` | 3.13:1 | `#c62828` | 5.57:1 (AA) |

## Tailwind CSS Accessible Palette Mapping

| Inaccessible Class | Contrast on White | Accessible Alternative | Contrast |
|---------------------|------------------|----------------------|----------|
| `text-gray-400` | 2.68:1 | `text-gray-600` | 5.74:1 |
| `text-blue-400` | 2.81:1 | `text-blue-700` | 5.96:1 |
| `text-green-400` | 2.12:1 | `text-green-700` | 5.18:1 |
| `text-red-400` | 3.04:1 | `text-red-700` | 6.05:1 |
| `text-yellow-500` | 1.47:1 | `text-yellow-800` | 7.34:1 |

## Screen Reader Utility Class

Every project should include this utility class for visually hiding content while keeping it accessible to screen readers:

```css
/* Visually hidden but accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Allow the element to be focusable when navigated to via keyboard */
.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: inherit;
}
```

Tailwind CSS includes this as `sr-only` by default. For other frameworks:
- **Angular**: Add to `styles.scss`
- **Vue**: Add to `assets/global.css`
- **Svelte**: Add to `app.css`
