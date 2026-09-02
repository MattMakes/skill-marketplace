# journeys.json reference

The one file in this pipeline written by judgment. Everything before it is a
probe over files on disk; everything after it is a template. Get this file right
and the rest follows mechanically.

Validate after every edit: `e2e journeys validate`. The validator is strict
because a malformed step usually produces a test that *passes for the wrong
reason*, which is worse than one that fails.

## Shape

```json
{
  "schema_version": 1,
  "journeys": [
    {
      "id": "kebab-case-slug",
      "title": "Sentence describing the observable outcome",
      "description": "Optional. Why this journey matters.",
      "source": { "docs": ["README.md#submit-an-upload"], "inventory": ["kafka:kafka"] },
      "tags": ["critical", "async"],
      "steps": [ ... ]
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Lowercase kebab-case. Becomes the spec filename, so keep it stable — renaming it churns the generated tree. |
| `title` | yes | Appears in the test report. Describe the *outcome*, not the mechanics. |
| `source` | yes | Must cite `docs` paths or `inventory` ids. A journey with no cited source is a guess, and the validator rejects it. |
| `tags` | no | Appended to the test title as `@tag`, so `e2e run --filter '@critical'` works. |
| `steps` | yes | At least one, and at least one must assert. |

## Step kinds

`e2e journeys kinds` prints this list with the exact required/optional fields
for your installed version. Summary:

| Kind | Purpose |
|---|---|
| `http` | One request, assert on the response. |
| `await_http` | Poll until the response satisfies the checks. For anything processed asynchronously. |
| `browser` | Playwright: navigate, act, assert. |
| `publish` | Put a message on a topic/queue to drive the system. |
| `await_message` | Wait for a matching message. The core assertion for event-driven systems. |
| `await_blob` | Wait for an object to land in a container/bucket. |
| `upload_blob` | Put an object into storage to drive the system. |
| `sleep` | Fixed wait. Warned about — see below. |

### Assertions

Every journey needs at least one of these somewhere, or it passes vacuously:

- `expect_status` — int or list of acceptable ints
- `expect_body_contains` — string or list; all must be present
- `expect_json_path` — `{"data.orderId": "abc"}`, dotted paths with array indices (`items.0.id`)
- `match_contains` / `match_json_path` — same idea for messages
- `name_pattern`, `content_contains`, `min_size_bytes` — for blobs
- `expect_text`, `expect_url` — for browser steps

Unknown fields are **errors**. `expect_stats` instead of `expect_status` would
silently check nothing, so the validator refuses it rather than warning.

### Passing values between steps

`save_as` captures from a response into the journey context; `{{name}}`
interpolates it into any later string field.

```json
{ "kind": "http", "resource": "service:api", "method": "POST", "path": "/uploads",
  "body": {"filename": "report.csv"}, "expect_status": 202,
  "save_as": { "uploadId": "id" } },

{ "kind": "await_blob", "resource": "azure-storage:azurite", "container": "uploads",
  "name_pattern": "^{{uploadId}}\\.json$", "timeout_ms": 30000 }
```

## Writing good journeys

**Assert on the observable effect, not the acknowledgement.** A `202 Accepted`
proves the request was received, nothing more. In an event-driven system the
real outcome is a message on a topic, an object in a bucket, or a status
endpoint flipping. If a journey's only assertion is on the response to the
request that started the work, it is not an end-to-end test.

**Reach for `await_*` before `sleep`.** A fixed wait either makes the suite slow
or makes it flaky, usually both — it is tuned to one machine on one day. Polling
for the actual condition is faster *and* more reliable. `sleep` exists for the
rare case where there is genuinely nothing to observe, and the validator warns
every time you use it.

**One journey, one outcome.** A journey that checks upload *and* delete *and*
list will fail on the first problem and tell you nothing about the rest. Small
journeys localize failures.

**Set `from_beginning: true` on `await_message`** (the default) unless you have
a reason not to. Otherwise a message produced before the consumer attached is
never seen — the single most common cause of a flaky event test.

**Ground every journey in the docs.** `inventory.json` has a `docs` section with
mined endpoints, env vars, and workflow candidates. Journeys should come from
there. If a workflow matters but the docs don't describe it, that is worth
telling the user — it is usually a documentation gap, not a testing one.

## Timeouts

`timeout_ms` is required on every `await_*` step, deliberately: an unbounded
wait turns a failing test into a hanging suite. Start at 30000 for async effects
and 10000 for HTTP polling, then tune down once you know the real latency.
