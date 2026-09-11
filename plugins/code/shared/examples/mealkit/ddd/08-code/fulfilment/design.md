# Design — fulfilment (active-record, deployable `warehouse`, module `src/fulfilment`)

## 1. Module layout
`src/fulfilment/{records,application,adapters}` — active records for boxes; no rich domain model.

## 2. Aggregates
None (active record); `Box` is a record with a picking list.

## 3. Application services
| Service | Command | Emits |
|---|---|---|
| PackBox | pack-box | box-packed |
| ShipBox | ship-box | box-shipped |

## 4. Ports and adapters
| Port | Kind | Adapter |
|---|---|---|
| FulfilmentEventHandlers | driving | message-bus subscriber (week-charged) |
| PackerCommands | driving | HTTP |
| BoxRepository | driven | PostgresBoxRepository |
| CourierGateway | driven | HttpCourierGateway |
| EventPublisher | driven | OutboxEventPublisher |

## 5. Domain events
Publishes `box-packed` v1 {boxId} and `box-shipped` v1 {boxId, tracking}. Consumes `week-charged` (at-least-once, inbox on subscriptionId+week).

## 6. Persistence
`fulfilment.boxes`, `fulfilment.picking_lines`; own Postgres in the warehouse deployable.

## 7. Read models
None.

## 8. Tests
- contract: box-packed; contract: box-shipped; idempotent: week-charged.
