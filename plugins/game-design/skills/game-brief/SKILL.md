---
name: game-brief
description: >-
  Use when writing up a game concept for a reader — produces the reader-facing brief in a fixed
  section order: pitch, player fantasy, a 30-second play-by-play, why it's fun (one subsection per
  target kind of fun), comparable games, scope for a solo developer, risks, the smallest prototype
  that tests the fun, open questions, and a placeholder for the designer's doubts, with YAML
  frontmatter (date, aesthetics, deprioritized, core_verb, scope, runners_up, art, verdict,
  rating). Trigger on: "write the brief", "game pitch document", "concept doc", "one-pager text",
  or the brief step of the game-design pipeline. Runs headless: never asks, infers and states
  assumptions.
---

# Game Brief

You write the document a busy reader opens first. It must sell the game on the first screen and
be honest about the risks.

Read `references/brief-template.md` before you start.

## Input

A concept (title and one-liner at minimum). Ideally also: the `game-ideation` result (constraint
card, runners-up), the `fun-targeting` result (blend, primary kind, target kinds, experience
goals, mechanics), the
`core-loop` result (Mermaid loops), and a date.

## Rules

- Never ask the user a question. Infer what is missing. List every assumption as a bullet that
  starts with `Assumed:` under **Open questions**.
- Use exactly the section headings below, in exactly this order. Do not add, rename or skip one.
- **Why it's fun** has one `###` subsection per target kind of fun, titled with the kind's name
  only (for example `### Discovery`), in the same order as the `aesthetics` frontmatter list.
- The **primary** kind comes first, in `aesthetics` and in **Why it's fun**. The primary is the
  one the caller names as primary; otherwise the first supplied kind.
- Each **Why it's fun** subsection names the moment of the core verb that produces the kind, and
  uses the core verb word itself (for example "each time you **tend** the wick …"). A long-term or
  side system (unlocks, a shop, collections, a story between sessions) never counts as the source.
  If only such a system produces a kind, say so under **Risks** as a fold-in risk.
- Target kinds: use the ones supplied. If none are supplied, pick 2–3 from the eight kinds
  (Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery, Expression, Submission).
- `aesthetics` has 2 or 3 items. `aesthetics` and `deprioritized` together name all eight kinds once.
- `date`: the supplied date; if none, today's date as `YYYY-MM-DD`, and add an `Assumed:` line.
- `art`: `placeholder`, unless the caller says art was skipped, then `skipped`.
- `verdict` is always `unreviewed`. `rating` is always empty.
- `runners_up`: the titles from `game-ideation`; `[]` if none were supplied.
- If core-loop Mermaid blocks are supplied, put the moment-to-moment block at the end of
  **30-second play-by-play**, unchanged.
- **Designer's doubts** holds exactly this one line, which a later critique step replaces:
  `_Pending critique by game:game-studio-cpo._`
- The file name is `<Title>.md`. Print the whole brief. If the caller gives an output folder and
  you can write files, also write it there.

## Steps

1. Collect the title, core verb, target kinds, experience goals, mechanics, loops and scope.
2. Write the frontmatter.
3. Write the sections in order, following the length guide in `references/brief-template.md`.
4. Check: every section present, in order; one `###` per target kind; the doubts placeholder is exact.
5. Print the brief in the exact format below.

## Output format

```markdown
---
date: YYYY-MM-DD
aesthetics: [<Kind>, <Kind>]
deprioritized: [<Kind>, <Kind>, <Kind>, <Kind>, <Kind>, <Kind>]
core_verb: <verb>
scope: <scope>
runners_up: ["<Title>", "<Title>"]
art: placeholder
verdict: unreviewed
rating:
---

# <Title>

## Pitch
<1–2 sentences>

## Player fantasy
<2–3 sentences, second person>

## 30-second play-by-play
1. **0:00** <beat>
2. **0:05** <beat>
...

## Why it's fun
### <Primary Kind>
<experience goal; the core-verb moment that produces it; the mechanic in that moment>

### <Kind>
...

## Comparable games
- **<Game>**: <what we borrow; how we differ>

## Scope for a solo developer
- <content counts, systems, art, time estimate>

## Risks
- **<Risk>**: <mitigation>

## Smallest prototype that tests the fun
- <what to build; the question it answers; how to tell yes from no>

## Open questions
- <question>
- Assumed: <assumption>

## Designer's doubts
_Pending critique by game:game-studio-cpo._
```

## Next step

Hand the brief to `one-page-design` and `art-direction`. For the critique that fills
**Designer's doubts**, send it to `game:game-studio-cpo`.
