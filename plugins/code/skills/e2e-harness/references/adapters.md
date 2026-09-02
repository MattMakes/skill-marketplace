# Resource adapters

An adapter teaches the harness two things about a resource kind: how to
**recognize** it during discovery, and how to **observe** it during a test.
They are separate — recognition is Python, observation is TypeScript — because
discovery must run without a live system and observation must run inside
Playwright.

## What ships

| Kind | Recognized from | `publish` | `await_message` | `await_blob` / `upload_blob` |
|---|---|---|---|---|
| `service`, `http`, `container` | compose, language markers, images | — | — | — |
| `kafka` | `apache/kafka`, `confluentinc/cp-kafka`, `bitnami/kafka`, `redpanda` | ✅ | ✅ | — |
| `azure-storage` | `azurite` images | — | — | ✅ |
| `eventhubs`, `servicebus` | Azure emulator images | stub | stub | — |
| `s3`, `aws-localstack`, `gcs`, `pubsub`, `rabbitmq` | images | stub | stub | stub |
| `postgres`, `mysql`, `mongodb`, `redis`, `elasticsearch`, `clickhouse`, `sqlserver` | images | — | — | — |

**Recognized** means discovery finds it, names it, and records its ports, so it
can be a readiness target and appear in the resource catalog. **Stub** means a
journey referencing it validates but fails at runtime with a message naming the
missing adapter — a clear failure rather than a silent skip.

Datastores are recognized but have no observation helpers. Assert on them
through the service's own API instead; a test that reaches into the database
behind the service tests the schema, not the system.

## Adding an adapter

Two edits. Both are small, and the fixture under `evals/fixtures/` is the place
to prove it works.

**1. Recognition** — `scripts/e2elib/inventory.py`, `IMAGE_KINDS`:

```python
("nats", "nats", {"default_port": 4222}),
```

Longest matching pattern wins, so a specific image beats a generic substring.

**2. Legality** — `scripts/e2elib/journeys.py`, `STEP_RESOURCE_KINDS`: add the
kind to whichever step kinds it can serve. This is what turns "publish to a
Postgres container" into a validation error instead of a runtime surprise.

**3. Observation** — `assets/templates/harness.ts`. Each helper switches on
`r.kind` and throws a named error for anything it does not handle. Follow the
`kafkaClient` pattern: import the client library lazily inside the function, and
if the import fails, say which package to install. A missing optional dependency
should never look like a broken test.

```ts
if (r.kind === 'nats') {
  const { connect } = await import('nats');
  // ...
}
```

Add the npm package to `ADAPTER_PACKAGES` in `scripts/e2e` so `e2e setup
--install` picks it up when that resource kind is present.

## Why lazy imports

`e2e setup --install` only installs clients for resource kinds actually found in
the repo. A Kafka-free project should not carry `kafkajs`. Lazy imports make
that possible and turn the missing case into an actionable message rather than a
module-not-found stack trace.

## Aspire

An Aspire AppHost declares its resources in code, so a static probe cannot read
the graph. Discovery records the AppHost and flags the gap. Two options:

- Boot once with `aspire run`, read the dashboard or `aspire resources`, and add
  what you need to `extra_resources` in `e2e/config.json` — those are merged
  into the inventory verbatim.
- Point `up` at `aspire run` and add explicit `readiness` targets in config.

`extra_resources` entries need at least `id`, `kind`, and either `base_url` or
`host_port`.

## Known cosmetic warning

Runs that use `await_message` may print:

```
TimeoutNegativeWarning: -1788312036471 is a negative number.
```

It originates in `kafkajs/src/network/requestQueue/index.js` when the consumer
disconnects with requests still queued — traced with `NODE_OPTIONS=--trace-warnings`,
no frame belongs to the harness. Tests still pass. Ignore it.

Set `E2E_KAFKA_LOG_LEVEL=INFO` to un-silence kafkajs when debugging a genuine
broker problem; the default is `NOTHING` so connection chatter does not bury the
test output.
