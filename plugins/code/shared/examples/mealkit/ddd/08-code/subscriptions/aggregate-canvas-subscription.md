# Aggregate Design Canvas — Subscription

Context `subscriptions` · id `subscription` · pattern domain-model · `src/subscriptions/domain/subscription`

## 1. Name
**Subscription** — a household's standing weekly order; one instance per household.

## 2. Description
Holds the lifecycle (active → paused → active, active → cancelled) and each week's meal choice. Boundary = one household's subscription, because "a week is chosen at most once" and "choices lock at cutoff" are decided per household in one transaction. Boxes are a separate aggregate in fulfilment.

## 3. State transitions
(none) → active → paused → active; active → cancelled. `choose-meals` allowed only while active and before the week's cutoff.

## 4. Enforced invariants
| # | Invariant | Why transactional |
|---|---|---|
| I1 | A week is chosen at most once | a double choice would double-charge |
| I2 | Choices lock at cutoff | packing has started |

## 5. Corrective policies
Payment declined after meals-chosen → subscription paused, week's choice released (H1).

## 6. Handled commands → created events
| Command | Preconditions | Event |
|---|---|---|
| start-subscription | household has no active subscription | subscription-started |
| choose-meals | active, before cutoff, week not yet chosen | meals-chosen |

## 7. Throughput
~1 command/household/week; no concurrency to speak of.

## 8. Size
Tens of week choices per year; load whole.

## 9. Model sketch
Root `Subscription` {id, status, choices: WeekChoice[]}; VOs Week, RecipeId; entity WeekChoice.
