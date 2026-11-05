---
name: mochi-deck
description: Teach the user concepts and build spaced-repetition flashcard decks as .mochi files they import into the Mochi (mochi.cards) app. Use whenever the user wants to learn, memorize, or be taught something ("teach me X", "help me learn/remember X", "explain X so it sticks"), asks for flashcards or a deck ("make me a deck about X", "turn these notes into flashcards", "add these to Mochi"), or mentions Mochi, spaced repetition, or reviewing cards — even if they don't mention Mochi or flashcards explicitly, a "teach me" request should end with an offer to save what was learned as a Mochi deck.
---

# Mochi Deck Builder

Teach the user a topic, then distill it into well-written flashcards and package them as a `.mochi` file the user imports into the Mochi app. Everything runs on Mochi's free tier — no account, no API key, no subscription. `scripts/mochi_deck.py` (relative to this skill's directory) does the packaging; plain Python 3 stdlib, nothing to install.

## Workflow

**"Teach me X"** — teach first, cards second. Explain the concept conversationally: build from what the user already knows, use concrete examples and analogies, and ask one or two quick questions to check understanding. Only after teaching, distill the session into a deck. Cards made from an explanation the user just worked through are far more effective than cards dropped on them cold.

**"Make me a deck about X" / "turn these notes into cards"** — draft the deck directly from the topic or notes.

In both cases:

1. Write the deck to a markdown file (format below) named `<topic>-deck.md`, in the current directory or wherever the user keeps decks. This file is the source of truth — keep it around so decks can be revised and regenerated.
2. Show the user the drafted cards and ask if they want changes before packaging. Don't skip this — bad cards poison a review habit.
3. Package: `python3 scripts/mochi_deck.py pack <file> --deck "<Deck Name>"` → writes `<deck-name>.mochi` next to the markdown file.
4. Tell the user where the `.mochi` file is and how to import it: open Mochi → menu → **Import** → select the file. The deck appears under the given name. Card ids are deterministic (derived from deck name + card front), so after editing the markdown and re-packing, re-importing **updates** the existing cards instead of duplicating them.

Note for the user's expectations: Mochi's free tier is per-device (sync across devices is a paid feature), so they should import on the device where they'll actually review.

## Deck file format

Cards are separated by a line containing only `===`. Within a card, sides are separated by a line containing only `---` (Mochi's own side separator). Separator lines inside fenced code blocks are ignored. Everything is Mochi-flavored markdown; LaTeX works with `$...$`.

```
How do you merge two Python lists into a new one?
```python
a = [1, 2]; b = [3, 4]
```
---
```python
[*a, *b]  # or a + b
```
===
The {{median}} is the middle value of a sorted dataset, while the {{mean}} is the sum divided by the count.
```

The second card shows Mochi's cloze syntax: `{{...}}` on a single-side card hides each marked term for recall.

## Card-writing rules

Cards are asked out of context months later — write for that future moment, not for today's conversation.

- **One idea per card.** If an answer has three parts worth remembering, that's three cards. Big cards fail as a unit and teach nothing when they do.
- **Active recall, not recognition.** Ask "how" / "why" / "what" questions the user must generate an answer to. Never yes/no questions — recognition is not memory.
- **Context in the question, brevity in the answer.** Setup, code scaffolding, and constraints go on the front; the back is just the answer. A back longer than ~3 lines usually means the card should be split.
- **Simple, everyday language.** The question should be instantly parseable mid-review; save precision for the answer.
- **Practical over trivia.** Skip version numbers, dates, and names unless they're the point. Prefer "how do you do X" over "what is X called".
- **Code in fenced blocks** with the language tag, on both sides where relevant.
- **Use cloze cards** for definitions and contrasts (see format above); use two separate cards, not one crammed card, when a fact is worth recalling in both directions.
- **Don't pad.** A tight 8-card deck beats a padded 25-card deck; every weak card taxes every future review session.

## Multi-lesson curricula

For big topics taught across many sessions, keep a `<topic>-curriculum.md` next to the deck files: phases, one checkbox per lesson (with deck name and completion date), and project checkpoints between phases. When the user says "next lesson" (or similar), read the curriculum, teach the first unchecked lesson, produce its deck, and check it off with the date. Nest all of a curriculum's decks under one parent deck with `pack --parent "<Topic>"`.

## Notes

- `pack` skips cards whose front duplicates an earlier card in the file, and prints what it skipped.
- `pack --parent "Name"` nests the deck under a parent deck (created with a stable id, so every lesson's file can include it and they all merge into one parent in Mochi).
- The script also has API commands (`push`, `list-decks`, `list-cards`, `create-deck`, `delete-card`) that publish directly to a Mochi account — these require a Mochi Pro subscription and an API key in `MOCHI_API_KEY` or `~/.config/mochi/api_key`. The user has chosen not to subscribe, so don't suggest them unless the user brings it up.
