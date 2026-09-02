---
name: humanize
description: |
 Make text sound human and clear. Use when writing or editing prose for human consumption — documentation, articles, commit messages, emails, blog posts, anything a person will read. Do NOT use for artifacts written for AI to consume (system prompts, tool descriptions, agent or skill instructions). Runs two phases every time: compose for clarity, then scrub AI tells.
allowed-tools:
 - Read
 - Write
 - Edit
 - Grep
 - Glob
 - AskUserQuestion
---

# Humanize

Two phases, every time, in order: compose then scrub. Then audit.


## Phase 1 — Compose for clarity

Read `refs/compose-instructions.md`. Apply Strunk's principles to the draft: active voice, positive form, concrete language, omit needless words, keep related words together, place emphatic words at the end.

This phase fixes structural problems before surface fixes mask them.


## Phase 2 — Scrub AI tells

Read `refs/scrub-instructions.md`. Walk the 29 patterns of AI-generated writing. Rewrite each instance you find.

This phase catches the specific tells that LLM training pulls toward — em dashes, "delve," rule of three, hedging, sycophantic openers, inflated significance.

## Phase 3 — Audit

Subagent: Use @./agents/council-contrarian as the subagent for this audit. Analyze the text for any remaining signs of AI generation. Look for anything that might read as soulless, generic, or patterned. Note any specific phrases, structures, or tones that still feel AI-generated.
Ask: *"What makes the text below so obviously AI-generated?"* Answer briefly with any remaining tells. Then ask: *"Now make it not obviously AI-generated."* Revise.

## Output format

Present the work in this order:
1. **Phase 1 result** — the draft after the compose pass, with a brief note on structural changes (passive→active, cut filler, restructured paragraph, etc.)
2. **Phase 2 result** — the draft after the scrub pass
3. **Phase 3 audit** — the answer to "what makes this obviously AI generated?"
4. **Final** — the post-audit revision
5. **Changes summary** (optional, when helpful)
6. 
## Reference files

- `refs/compose-instructions.md` — clarity principles, adapted from softaworks/agent-toolkit `writing-clearly-and-concisely` (MIT), based on Strunk's *The Elements of Style* (1918, public domain)
- `refs/scrub-instructions.md` — 29 AI-pattern catalog, based on Wikipedia's "Signs of AI writing" (CC BY-SA, maintained by WikiProject AI Cleanup)
