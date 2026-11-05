# Schema and entity relationships

Blueprint has five renderer types. It has no native ERD/table-row renderer or crow's-foot ports. Use `architecture` for an entity relationship overview and supplement it with readable HTML tables for fields. If exact crow's-foot notation is required, use a separately authored inline SVG figure and identify it as such; do not claim it passed Blueprint validation.

Read the migration, DDL, ORM mappings, or schema definition before drawing. Distinguish database constraints from application conventions. Do not infer cardinality, nullability, cascading behavior, or uniqueness from a field name.

## Relationship overview

- Represent actual database tables with `type: "database"`. Use stable IDs and exact table names. For API/JSON object shapes, use clearly labeled object/schema components (`backend`), not invented database tables.
- Use `sublabel` for a short key summary such as `PK id · FK customer_id`. The example [order-schema.architecture.json](../examples/order-schema.architecture.json) demonstrates the supported shape.
- Draw FK edges from referencing table to referenced table. Label them with the field reference and explain cardinality in cards: for example, `orders.customer_id` references `customers.id`; each order has exactly one customer when the FK is NOT NULL, while a customer may have zero or more orders unless additional constraints say otherwise.
- A UNIQUE FK limits a parent to at most one child. A nullable FK permits no parent. Composite keys retain all columns. A many-to-many relation includes the junction table instead of inventing a direct FK.
- Keep these views still with `meta.animation: "none"`. Say that arrows denote references, not runtime reads, writes, or message direction. Show runtime access in a separate sequence/data-flow figure.

## Field details beside the diagram

Use a semantic `<table>` with columns for field, type, keys/nullability/default, and what changed. Mark PK/FK/UNIQUE and added/removed/changed explicitly in text; color can reinforce those labels. Preserve complete composite constraints and distinguish a database default from an application default. For JSON Schema, show required/optional, types, enums and nested objects without implying SQL semantics.

Keep field tables within the article width on narrow screens; allow long identifiers to wrap or provide a clearly labeled table scroll region without shrinking text.

Use one table per important entity or just the changed fields, depending on the question. A large column inventory belongs in a collapsible detail section, not tiny text inside a node. Toy rows should be labeled as examples and should satisfy the shown constraints.

For before/after, keep unchanged tables in the same positions and explain migration order, backfill, nullability changes, and compatibility only where supported by source evidence. Blueprint's validators verify the diagram specification and composition; they do not validate SQL, a migration, or the inferred data model.
