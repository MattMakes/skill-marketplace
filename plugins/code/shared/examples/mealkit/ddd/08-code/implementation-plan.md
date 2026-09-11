# Implementation plan — Meal-kit subscription

## In plain words

We turned the design into a build order: what to write first, and what each piece must protect.

**Decided:** One thing worth guarding carefully: a subscription. Everything else is plainer code.

**Assumed:** A week's choice can be locked in one go, so nothing has to be half-saved.

**Riskiest:** If locking a week ever needs several steps that can each fail, this shape has to change.

---

Language typescript · architecture hexagonal · deployables app (subscriptions, billing), warehouse (fulfilment) · scaffold: no

## Slice 0 — walking skeleton
Module folders per context, dependency-cruiser fitness test, outbox package, CI.

## Slice 1 — subscriptions: choose-meals → meals-chosen
Implements `aggregate-canvas-subscription.md` I1/I2 with in-memory adapters; tests first (see design.md §6).

## Slice 2 — billing: charge-on-choice policy → week-charged (Stripe adapter behind an ACL)

## Slice 3 — fulfilment: pack-on-charge → box-packed / box-shipped (warehouse service, async via message-bus)

## Slice 4 — read models (WeeklyMenu), end-to-end scenario S1.

## Hand-off
Hand this plan to `dev:create-plan`, then implement each slice with `dev:tdd`.
