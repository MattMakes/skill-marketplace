# Accessibility Testing Checklist

Use this checklist after applying fixes to verify accessibility manually.

## Keyboard Navigation
- [ ] All interactive elements reachable via Tab key
- [ ] Tab order follows visual/logical reading order
- [ ] Focus indicator visible on every focusable element (2px+ outline)
- [ ] Modals trap focus and return focus on close
- [ ] Escape key closes modals, dropdowns, and popups
- [ ] Arrow keys navigate within composite widgets (tabs, menus, listboxes)
- [ ] No keyboard traps (user can always Tab away)

## Screen Reader
- [ ] All images have appropriate alt text (or `alt=""` for decorative)
- [ ] Headings create logical document outline (h1 -> h2 -> h3)
- [ ] Form inputs have associated labels
- [ ] Error messages announced via `aria-live` or `role="alert"`
- [ ] Page title updates on navigation (SPA)
- [ ] Dynamic content changes announced appropriately
- [ ] Primary journey completed with VoiceOver, NVDA or TalkBack (commands and passes: `design:screen-reader-testing`)

## Visual
- [ ] Text contrast meets 4.5:1 for normal text, 3:1 for large text
- [ ] UI component contrast meets 3:1 against background
- [ ] Content reflows without horizontal scrolling at 320px width
- [ ] Text resizable to 200% without loss of content
- [ ] No information conveyed by color alone
- [ ] Focus indicators meet 2.4.11 Focus Appearance criteria
- [ ] Usable in Windows High Contrast (`forced-colors`) mode

## Motion and Media
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No auto-playing media with audio
- [ ] No content flashing more than 3 times per second
- [ ] Video has captions; audio has transcripts
- [ ] Time limits warn before expiry and can be extended (2.2.1)

## Forms
- [ ] All inputs have visible labels
- [ ] Required fields indicated (not by color alone)
- [ ] Error messages specific and associated with input via `aria-describedby`
- [ ] Autocomplete attributes present on common fields (name, email, etc.)
- [ ] No CAPTCHA without alternative method (WCAG 2.2 3.3.8)
