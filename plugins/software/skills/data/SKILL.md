---
name: data
description: >-
  Relational data rules: Supabase's Postgres performance and best practices (queries, schema, configuration), PostgreSQL table design (data types, indexing, constraints, advanced features), Prisma ORM patterns and traps for TypeScript backends, and safe, reversible database migrations (expand-contract renames, concurrent indexes, batched backfills, per-tool workflows for PostgreSQL, Prisma, Drizzle, Kysely, Django and golang-migrate). Use when writing, reviewing or optimising Postgres queries or schemas, using Prisma, or writing a schema or data migration. Read only the topic guide that applies.
---

# Data

Each topic is a full guide in `topics/<name>/GUIDE.md`. Pick the topic, read its guide, and follow it. For a system-wide zero-downtime migration plan, use `software:migration-architect`; this router covers the database itself.

| Topic | Read it when | Guide |
|---|---|---|
| `postgres-best-practices` | Postgres query, schema and configuration performance | [`topics/postgres-best-practices/GUIDE.md`](topics/postgres-best-practices/GUIDE.md) |
| `postgresql-table-design` | Designing or reviewing a PostgreSQL schema | [`topics/postgresql-table-design/GUIDE.md`](topics/postgresql-table-design/GUIDE.md) |
| `prisma-patterns` | Prisma schema, queries, transactions and known traps | [`topics/prisma-patterns/GUIDE.md`](topics/prisma-patterns/GUIDE.md) |
| `database-migrations` | Writing a schema or data migration safely | [`topics/database-migrations/GUIDE.md`](topics/database-migrations/GUIDE.md) |

Paths inside a guide are relative to that guide's folder. Other skills cite a topic as `software:data` (topic `<name>`).

Credits per topic are in `NOTICE.md`.
