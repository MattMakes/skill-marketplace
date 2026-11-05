---
name: performance
description: Optimize UI performance against Core Web Vitals (LCP, INP, CLS) for page experience and search ranking, with thresholds, per-metric causes and fixes, loading and code-split strategy, layout-shift prevention, animation performance rules, and lab and field measurement. Use when the user wants to improve speed, "improve Core Web Vitals", "fix LCP", "optimize INP", "reduce CLS" or "fix layout shifts", fix jank, do page experience optimization, hit Web Vitals budgets, or make a UI feel fast on low-end devices.
---

# Skill: Performance

> **Step 0 — doctrine first.** Load `design:design-doctrine` if it is not already loaded this session; every step below assumes its verification protocol and house rules. The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Make the UI fast and stable. Treat performance as an accessibility concern — slow/janky UIs fail low-end devices first.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/shared/workflows/performance.md` (Core Web Vitals targets, loading strategy, layout-shift, animation perf, design-system runtime cost).
2. Diagnose against budgets: **LCP ≤ 2.5s**, **INP ≤ 200ms**, **CLS ≤ 0.1**, met at the 75th percentile of visits (poor: LCP > 4s, INP > 500ms, CLS > 0.25). Measure on a mid-tier mobile profile (throttle slow 4G + 4× CPU): lab with `npx lighthouse <url>` or the DevTools Performance panel, field with CrUX, Search Console or the `web-vitals` library. Find the culprit before fixing: the LCP element, the slow interaction (split INP into input delay, processing and presentation) or the shifted element. The `PerformanceObserver` snippets, the common cause of each metric and its fix with code, and framework quick fixes are in [references/core-web-vitals.md](references/core-web-vitals.md); LCP in depth (TTFB, resource load, render blocking, client rendering) in [references/LCP.md](references/LCP.md).
3. Loading: render above-fold first (SSR/Server Components), code-split by route + heavy widget, lazy-load below-fold/behind-interaction (Astro islands / Qwik), preload one critical font weight, modern responsive images. Preload the LCP image with `fetchpriority="high"` and keep it in the initial HTML; inline critical CSS; load third-party scripts on interaction or visibility.
4. Kill layout shift: size skeletons to final dimensions, reserve media space via `aspect-ratio` (`${CLAUDE_PLUGIN_ROOT}/shared/tokens/sizing.json`), reserve space for embeds and ads, never inject content above existing. A swapped web font shifts text unless the fallback's metrics are matched (`size-adjust`, `ascent-override`) or the font uses `font-display: optional`.
5. Animation: only `transform`/`opacity`, `will-change` sparingly, 100–300ms (`${CLAUDE_PLUGIN_ROOT}/shared/tokens/motion.json`), honor `prefers-reduced-motion`. Prefer CSS state styling over JS for low INP; tree-shake/per-component imports. Break main-thread tasks over 50ms into chunks that yield, give visual feedback first and defer the rest (`requestAnimationFrame`, `requestIdleCallback`), and move CPU-heavy work to a Web Worker.

## Verification (definition of done)
- Lighthouse / field data meets LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 on mid-tier mobile.
- First interaction stays responsive under slow-4G + 4× CPU throttle.
- Skeletons + media reserve space (zero CLS on load); no non-compositor animation in loops.
