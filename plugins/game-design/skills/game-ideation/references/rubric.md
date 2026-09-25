# Scoring rubric

Score every concept that passed the boundary gate. Never score a rejected concept.

## Weights

<!-- DRAFT: tune me -->
| Criterion | Key | Weight |
|---|---|---|
| Fun fit | `fun_fit` | 0.35 |
| Novelty | `novelty` | 0.25 |
| One-sentence clarity | `clarity` | 0.15 |
| Prototypability | `prototypability` | 0.25 |

The weights add up to 1.00. If you change one, change another so the sum stays 1.00.

## Scale

Score each criterion as an integer from 1 to 5.

| Score | Fun fit | Novelty | Clarity | Prototypability |
|---|---|---|---|---|
| 5 | The core verb produces the target fun directly, every minute. | Nothing in the history list or well-known games does this. | Anyone understands it from the one-liner alone. | A playable test of the fun fits in a weekend. |
| 4 | Serves the target fun most of the time. | One familiar element, used in a fresh way. | Clear in one sentence, with one term to explain. | A test fits in one week. |
| 3 | Serves the target fun only in some moments. | A known formula with a new theme. | Needs two sentences. | A test needs two to four weeks. |
| 2 | Serves a different kind of fun better than the target. | Close to one history entry or a well-known game. | Needs a paragraph. | A test needs custom tech or lots of content. |
| 1 | Does not serve the target fun. | Nearly the same as a history entry. | Cannot be said simply. | Cannot be tested without building most of the game. |

## Total

`total = 0.35 × fun_fit + 0.25 × novelty + 0.15 × clarity + 0.25 × prototypability`

Round the total to 2 decimals. The range is 1.00–5.00.

## Novelty against history

- The caller may supply a history list of past concept titles or one-liners. Compare each concept
  against every entry. A concept that shares both the core verb and the setting with a history
  entry scores novelty 1 or 2.
- If the caller supplies novelty scores (for example from embedding distance), use them as given.
- If there is no history list, score novelty against well-known games and record the assumption.

## Picking

1. The pick is the non-rejected concept with the highest total.
2. On a tie, the higher `fun_fit` wins. On a second tie, the higher `prototypability` wins.
3. The runners-up are the next 2 non-rejected concepts by total.
