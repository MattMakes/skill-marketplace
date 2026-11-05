---
name: design-review
description: Review or audit a product design, feature, site or screen. The full review walks through it as a first-time user, answers 13 design questions, runs Nielsen's 10 heuristics and builds an HTML report with before/after fixes for the top 3 issues, optionally deployed to Surge. The scored review rates 6 weighted dimensions (hierarchy, consistency, accessibility, usability, responsiveness, performance) and returns a prioritized findings table with token-referenced fixes. Use when asked to review a design, audit UX, do a design review or heuristic evaluation, score or critique a screen, page or product, get a design quality score, or analyze a product's user experience before or after build.
---

# Design Review

Run a product design review in one of two modes: a full review that ends in a shareable before/after report, or a scored review that ends in a weighted score and a prioritized findings table.

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| **URL or feature** | Yes | A live URL, local HTML file, or description of the feature to review |
| **Context** | No | Any additional context about the product, audience, or goals |

Start immediately with defaults. Do not ask clarifying questions. Make your best assumptions for anything you don't know.

## Modes

| Mode | Pick it when |
|------|--------------|
| **Full review** (default) | A live product, URL or feature, and the audience is a PM or stakeholders who need a report they can forward. Follow the Workflow below. |
| **Scored review** | A screen or page built with this plugin's tokens and gates, or the user asks for a score, a heuristic evaluation or a findings list rather than a report. Follow the steps below. |

For an adversarial verdict on taste, or a Dieter Rams scorecard that ends in a plan, the user runs `/design:critique` instead.

### Scored review

> **Step 0 — doctrine first.** Load `design:design-doctrine` if it is not already loaded this session; every step below assumes its verification protocol and house rules. The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

1. Read `${CLAUDE_PLUGIN_ROOT}/shared/workflows/design-review.md` (rubric, scoring guide, process).
2. Gather context from the request and the files: the screen(s) or flow, target users, platform, constraints.
3. Score the 6 dimensions (Visual Hierarchy 20%, Consistency 20%, Accessibility 20%, Usability 20%, Responsiveness 10%, Performance 10%) and compute the weighted overall.
4. Run the accessibility lens with `${CLAUDE_PLUGIN_ROOT}/shared/accessibility/wcag-checklist.md`; use `${CLAUDE_PLUGIN_ROOT}/shared/scripts/contrast.py` for any color-pair doubt. For depth, `design:a11y-audit` (Design audit mode).
5. Check against the anti-slop tells in `${CLAUDE_PLUGIN_ROOT}/shared/taste/design-taste.md` (Banned Defaults checklist).
6. Apply the 10 heuristics from Workflow step 3; flag violations by number.

Output:
- The 6-dimension scored table and the overall score.
- A prioritized findings table: # · Severity (Critical → Major → Minor → Enhancement) · Finding · Recommendation.
- Concrete, token-referenced fixes.

## Workflow

### 1. Walk Through as a New User

Open the URL in the browser. Navigate screen by screen, taking screenshots. React to what you see out loud:

- What am I being asked to do?
- Is it clear WHY I'd do it?
- Where would I get confused or frustrated?
- What would I expect to happen next?

Pay special attention to:
- **Time to wow:** How quickly does a new user think "this is why I came here"?
- **Dead ends:** Places where the user finishes something and there's no clear next step.
- **Empty states:** Screens that look broken when there's no data yet.

### 2. Answer the 13 Design Questions

For each question, provide a specific answer based on what you observed. Do not ask the user. Make your best assumption.

1. **What is the objective of this feature?** What problem does it solve? What outcome does it drive?
2. **Who is this for?** Specific user persona, not "everyone."
3. **When and why would they use it?** The trigger moment. What just happened that brings them here?
4. **What are they thinking about?** Their mental state, concerns, expectations when they arrive.
5. **How did they get here?** The previous step in their journey. What screen or action preceded this?
6. **What do we want users to feel?** The emotional response we're designing for.
7. **What would they do without this feature?** The alternative. Manual workaround, competitor, nothing?
8. **What do they do next?** The next step after using this feature. Is it clear?
9. **Are we confident this is better than what already exists?** Compared to the current state or competitors.
10. **What can we remove to have it work just as well?** Strip to the essential. What's decorative vs functional?
11. **If we throw away our constraints, would we still design it this way?** Imagine unlimited time and resources.
12. **Will most users realize the value of this feature?** Is the benefit obvious or hidden?
13. **Is this for user growth, engagement, or retention?** Which metric does this primarily serve?

Use ASCII diagrams to visualize the user journey where it helps paint the picture.

### 3. Nielsen Norman Heuristic Evaluation

Evaluate against all 10 heuristics. For each one, give a pass/fail with specific evidence:

1. **Visibility of system status** — Does the user always know what's happening?
2. **Match between system and real world** — Does it use language and concepts the user knows?
3. **User control and freedom** — Can users undo, go back, escape?
4. **Consistency and standards** — Does it follow platform conventions?
5. **Error prevention** — Does it prevent mistakes before they happen?
6. **Recognition rather than recall** — Are options visible, not memorized?
7. **Flexibility and efficiency of use** — Are there shortcuts for power users?
8. **Aesthetic and minimalist design** — Is every element earning its place?
9. **Help users recognize, diagnose, and recover from errors** — Are error messages useful?
10. **Help and documentation** — Is guidance available when needed?

### 4. Identify Top 3 Issues

From the walkthrough and heuristic evaluation, pick the 3 highest-impact issues. For each:

- **What to fix:** Plain language description.
- **Why it matters:** Tie it back to a specific heuristic violation or design question answer.
- **Expected impact:** What changes if you fix this.

### 5. Build the Before/After Report

For each issue, build two HTML renders side by side:

- **Before:** Recreate the current state of the problem area in code.
- **After:** Show the visual fix in code.

These are rebuilt in HTML, not screenshots. Both versions should be crisp and consistent.

**Render the fix INSIDE the real page chrome, not the component bare.** If the preview exists so the user can choose how a change looks on a real product surface, a stripped-down component render is wrong — it looks nothing like the live site and the user can't judge it (real correction: a component preview rendered bare looked "so different than the site" because it wasn't shown inside the card it lives in). Pull the app's actual CSS verbatim, reproduce the surrounding chrome (container, nav, breadcrumb, the component's own card wrapper), run the app's real client-side transform, and feed it real fixture content. For multiple options, build ONE in-context page with a fixed option switcher (radio groups toggling `body` data-attributes) plus a "Current" baseline, so the user flips variants live against the real surface. Full recipe, the exec-don't-regex helper-decode pitfall, and the pre-deploy verify step: `references/in-context-preview.md`.

Package everything into a single HTML page:

```
┌─────────────────────────────────┐
│  [Product Name] Design Review   │
│  Date · URL                     │
├─────────────────────────────────┤
│  Summary                        │
│  13 Design Questions (answered) │
│  Heuristic Scorecard            │
│  Issue 1: Before / After        │
│  Issue 2: Before / After        │
│  Issue 3: Before / After        │
└─────────────────────────────────┘
```

### 6. Deploy (optional)

Hand the user the local HTML file. If they want a hosted link and have a Surge account, deploy it:

```bash
npx surge . [product-name]-design-review.surge.sh
```

Share the URL with the user.

## Output

A single shareable HTML report (local file or hosted URL) containing:
- Design question answers with user journey visualization
- Heuristic evaluation scorecard
- Before/after visual comparisons for the top 3 issues
- Specific, actionable recommendations tied to evidence

## Notes

- Make your best assumptions. Do not ask the user to answer the 13 questions. You answer them based on observation.
- Be specific and constructive. Not "improve onboarding" but "add a welcome screen that asks what the user wants to accomplish."
- The report should be presentation-ready. A PM could send it to stakeholders without explanation.
- For local HTML files, open them in the browser. Do not read source code.
