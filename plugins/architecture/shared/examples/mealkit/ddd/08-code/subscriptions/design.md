# Design — subscriptions (domain-model, deployable `app`, module `src/subscriptions`)

## 1. Module layout
`src/subscriptions/{domain,application,adapters}` — domain has no framework imports (enforced by a dependency-cruiser rule).

## 2. Aggregates
- `subscription` — see `aggregate-canvas-subscription.md` (invariants: a week is chosen at most once; choices lock at cutoff).

## 3. Application services (one per command)
| Service | Command | Emits |
|---|---|---|
| StartSubscription | start-subscription | subscription-started |
| ChooseMeals | choose-meals | meals-chosen |

## 4. Ports and adapters
| Port | Kind | Adapter |
|---|---|---|
| SubscriptionRepository | driven | PostgresSubscriptionRepository (in-memory in tests) |
| EventPublisher | driven | OutboxEventPublisher → in-process bus |
| SubscriptionCommands | driving | HTTP controller |

## 5. Domain events
Publishes `subscription-started` v1 {subscriptionId} and `meals-chosen` v1 {subscriptionId, week, recipeIds}.

## 6. Persistence
`subscriptions.subscriptions` + `subscriptions.week_choices`; optimistic version column.

## 7. Read models
- WeeklyMenu (from meals-chosen).

## 8. Tests
- "A week is chosen at most once": choosing twice for the same week is rejected.
- "Choices lock at cutoff": choose-meals after the week's cutoff is rejected.
- contract: meals-chosen v1 carries subscriptionId, week, recipeIds and nothing else.
