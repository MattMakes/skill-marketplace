# Compose Instructions

Apply these principles while drafting or rewriting. The goal: clear, forceful prose that says what it means.

---

## Core principles

These six rules do most of the work. Apply them in order of priority.

### 1. Use active voice

Active voice is direct and assigns responsibility. Passive voice hides the actor.

> Before: The configuration file is read by the application at startup.
> After: The application reads the configuration file at startup.

> Before: Mistakes were made.
> After: I made a mistake.

### 2. Put statements in positive form

Positive form is more vigorous than negation. State what *is*, not what *isn't*.

> Before: He did not remember.
> After: He forgot.

> Before: She was not very often on time.
> After: She usually came late.

### 3. Use definite, specific, concrete language

Vague abstractions weaken prose. Name the thing.

> Before: An issue occurred during processing.
> After: The parser crashed on line 47 of config.yaml.

> Before: Performance has been improved.
> After: Page load dropped from 3.2s to 0.8s.

### 4. Omit needless words

Cut what doesn't carry weight.

| Wordy | Tight |
|---|---|
| In order to achieve this goal | To achieve this |
| Due to the fact that it was raining | Because it was raining |
| At this point in time | Now |
| In the event that you need help | If you need help |
| The system has the ability to process | The system can process |
| It is important to note that the data shows | The data shows |
| It is a fact that | (cut) |
| The question as to whether | Whether |
| There is no doubt but that | No doubt |
| Used for fuel purposes | Used for fuel |

### 5. Keep related words together

Modifiers belong next to what they modify. Misplacement creates ambiguity.

> Before: He noticed a large stain in the rug that was right in the center.
> After: He noticed a large stain right in the center of the rug.

> Before: New York's first commercial human-sperm bank opened Friday with semen samples from 18 men frozen in a stainless steel tank.
> After: ...with semen samples, frozen in a stainless steel tank, from 18 men.

### 6. Place emphatic words at the end of the sentence

The end of a sentence is the position of stress. Put the most important word there.

> Before: This steel is principally used for making razors, because of its hardness.
> After: Because of its hardness, this steel is principally used for making razors.

---

## Supporting principles

### Form possessive singular by adding 's
Charles's friend, Burns's poems. Exception: ancient proper names ending in -es or -is (Moses', Jesus').

### One paragraph per topic
A paragraph holds one topic. Start a new paragraph when the topic shifts. Begin most paragraphs with a topic sentence; end them in conformity with the beginning.

### Express coordinate ideas in similar form
Parallel construction signals parallel meaning.

> Before: Formerly, science was taught by the textbook method, while now the laboratory method is employed.
> After: Formerly, science was taught by the textbook method; now it is taught by the laboratory method.

### Avoid a succession of loose sentences
Vary sentence structure. Strings of compound sentences ("but...and...so...") fatigue the reader.

### Keep to one tense in summaries
Pick a tense and stay in it. Shifting between past and present in the same passage disorients.

---

## Word-choice traps

These words and constructions inflate without informing. Prefer the right column.

| Avoid | Prefer |
|---|---|
| utilize | use |
| facilitate | help, ease |
| commence | begin, start |
| terminate | end |
| in regard to / with respect to | about |
| at the present time | now |
| for the purpose of | for, to |
| in the near future | soon |
| a sufficient number of | enough |
| a majority of | most |
| in spite of the fact that | although |

---

## When in doubt

- Cut, don't add. Remove words until meaning suffers, then add back the minimum.
- Read the sentence aloud. If it stumbles, rewrite it.
- Prefer the short Anglo-Saxon word over the long Latinate one (use, not utilize; help, not facilitate).
- One idea per sentence. If you find an "and" or a comma, ask whether two sentences would be clearer.
- The first draft of anything is bloated. Cut 30% on the second pass.

---

## What this phase does NOT do

This phase fixes structural problems: passive voice, vague abstractions, bloated phrasing, weak parallelism. It does NOT catch the specific signature patterns of LLM-generated text — em dash overuse, "delve" and "tapestry," sycophantic openers, rule-of-three, inflated significance. Those are caught in Phase 2 (`refs/scrub-instructions.md`).

After Phase 1, the text should be structurally clean. After Phase 2, the text should pass for human-written.

