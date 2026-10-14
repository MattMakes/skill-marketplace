# Design — billing (transaction-script, deployable `app`, module `src/billing`)

## 1. Module layout
`src/billing/{application,adapters}` — no domain layer: a generic subdomain wrapping Stripe behind an ACL.

## 2. Aggregates
None (transaction script).

## 3. Application services
| Service | Command | Emits |
|---|---|---|
| ChargeWeek | charge-week | week-charged |
| ChargeCard | charge-card | — (Stripe call) |

## 4. Ports and adapters
| Port | Kind | Adapter |
|---|---|---|
| BillingEventHandlers | driving | in-process subscriber (meals-chosen) |
| PaymentGateway | driven | StripePaymentGateway (ACL) |
| EventPublisher | driven | OutboxEventPublisher |

## 5. Domain events
Publishes `week-charged` v1 {subscriptionId, week}. Consumes `meals-chosen` (idempotent on subscriptionId+week).

## 6. Persistence
`billing.charges` table (one row per subscription-week); outbox table shared with the app.

## 7. Read models
None.

## 8. Tests
- contract: week-charged; idempotent: meals-chosen.
