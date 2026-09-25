---
name: art-direction
description: >-
  Use when a game concept needs its visual direction set: a style sheet (palette, shape language,
  lighting, texture), a shot list tied to the target fun, and image-generation prompts for a key
  art, hero and gameplay-mock placeholder. Trigger on: "art direction", "style sheet", "what
  should this look like", "shot list", or when `game-brief` needs its art section. Every image
  prompt carries fixed content-boundary negatives and never names a living artist.
---

# Art Direction

Produces the visual direction for a game concept. The **style sheet is the real deliverable** —
it is what a human artist would work from. Any generated images are **placeholders only**, to
make the brief easier to picture; they are never the final art and a missing image is never a
failure. Headless-safe: no AskUserQuestion, Task, TodoWrite, Skill tool or WebFetch. Infer and
state assumptions rather than asking.

## Content boundaries (always enforced, on every prompt)

- **Never name a living artist**, by name, handle or unmistakable "in the style of" reference.
  Describe style in words only (palette, shapes, lighting, texture, era, medium).
- **Every image prompt's `negative_prompt` always includes these fixed boundary negatives**,
  appended to any concept-specific negatives: `weapons, blood, gore, nudity, sexual content,
  casino imagery, gambling imagery`.
- If the concept itself implies a boundary crossing (a weapon as the hero prop, a casino setting),
  state that in your reply and redirect the shot list and prompts away from it — do not silently
  drop the boundary check.

## Method (follow in order)

1. **Read the target fun.** Take the 2-3 target aesthetics (from `fun-targeting` or the brief).
2. **Build the style sheet:**
   - `palette`: 4-8 hex colors, each with a `role` (e.g. `primary`, `accent`, `background`,
     `danger`).
   - `shape_language`: 1-2 sentences (angular vs. organic, geometric vs. hand-drawn, silhouette
     read).
   - `lighting`: 1-2 sentences (time of day, contrast, key/fill relationship).
   - `texture`: 1-2 sentences (flat/painterly/pixel/vector, grain, material feel).
   - `references_in_words`: 2-4 short phrases describing influences *in words only*
     (e.g. "1970s children's book illustration", "matte painting, muted desert palette") —
     never a named living artist or studio's copyrighted character.
3. **Build the shot list, one shot per target aesthetic**, matching each kind of fun to the shot
   that best expresses it (see the table below). 2-3 shots total, matching the 2-3 target
   aesthetics.
4. **Write exactly 3 image prompts**: `key-art`, `hero`, `gameplay-mock`. Each has:
   - `prompt`: what to generate, in words, style included.
   - `negative_prompt`: concept-specific negatives, always **plus** the fixed boundary negatives
     above.
   - `size`: default `"1024x1024"` unless the concept needs a different aspect ratio.
   - `style`: a short phrase matching `shape_language`/`texture` from the style sheet.
5. **Emit the prompts as a JSON block** (see `references/prompt-writing.md` for the exact shape)
   so the daily agent can parse it directly.
6. **State the deliverable.** End with one line: the style sheet is the deliverable; the 3
   generated images are placeholders and may be skipped without failing the brief.

## Fun → shot mapping

| Target fun (8 kinds) | Shot that expresses it |
|---|---|
| Sensation | A "juicy" key moment — motion, particles, impact, the game's core verb caught mid-action. |
| Fantasy | The hero, in costume, in their world. |
| Narrative | A scene that implies a story beat (two characters, a choice, an aftermath). |
| Challenge | An obstacle or boss at the moment of confrontation. |
| Fellowship | Two or more player-characters together, cooperating or competing. |
| Discovery | A vista — a wide shot revealing unexplored space. |
| Expression | A player-customized or player-built result (an outfit, a base, a creation). |
| Submission | A calm, low-stakes, repeatable moment (tending, sorting, idling). |

Pick shots for the 2-3 aesthetics actually in play; do not force all 8.

Reference: `references/prompt-writing.md` for general diffusion prompt-writing rules and the exact
JSON shape for the 3 prompts.
