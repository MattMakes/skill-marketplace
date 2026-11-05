// e2e-harness runtime. Copied verbatim by `e2e build`; safe to read, not generated.
//
// Generated specs call only these functions. Keeping transport details here is
// what lets a journey spec read like the journey instead of like a Kafka client.
//
// Every await* helper follows the same shape: poll until the predicate holds or
// the timeout expires, then return a result object rather than throwing. The
// generated spec does the asserting, so a failure message names the journey step.

import { resource, ResourceInfo } from './resources';

export type Ctx = Record<string, unknown>;
export const newContext = (): Ctx => ({});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Resolve {{var}} against the journey context so a later step can use an
 *  id captured by an earlier one. */
export function interpolate<T>(value: T, ctx: Ctx): T {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (m, k) =>
      k in ctx ? String(ctx[k]) : m,
    ) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, ctx)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v, ctx);
    return out as unknown as T;
  }
  return value;
}

/** Dotted path with array indices: `items.0.id`, `data.orderId`. */
export function jsonPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    cur = Array.isArray(cur) ? (cur as unknown[])[Number(part)]
                             : (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function baseUrl(r: ResourceInfo): string {
  if (r.baseUrl) return r.baseUrl.replace(/\/$/, '');
  if (r.hostPort) return `http://localhost:${r.hostPort}`;
  throw new Error(
    `Resource '${r.id}' has no base URL or host port in inventory.json. ` +
      `Add one under 'extra_resources' in e2e/config.json, then re-run 'e2e build'.`,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withDeadline<T>(
  label: string,
  timeoutMs: number,
  intervalMs: number,
  attempt: () => Promise<T | null>,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      const got = await attempt();
      if (got !== null) return got;
    } catch (err) {
      last = err;
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `${label} did not succeed within ${timeoutMs}ms` +
      (last ? `. Last error: ${String(last)}` : ''),
  );
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export type HttpResult = { status: number; text: string; json: unknown; headers: Record<string, string> };

export type HttpOpts = {
  method: string;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
};

export async function http(resourceId: string, opts: HttpOpts, ctx: Ctx): Promise<HttpResult> {
  const r = resource(resourceId);
  const o = interpolate(opts, ctx);
  const url = new URL(baseUrl(r) + o.path);
  for (const [k, v] of Object.entries(o.query ?? {})) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  let body: string | undefined;
  if (o.body !== undefined) {
    if (typeof o.body === 'string') {
      body = o.body;
    } else {
      body = JSON.stringify(o.body);
      headers['content-type'] ??= 'application/json';
    }
  }

  const res = await fetch(url.toString(), { method: o.method, headers, body });
  const text = await res.text();
  let json: unknown = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { /* not JSON; fine */ }
  const hdrs: Record<string, string> = {};
  res.headers.forEach((v, k) => { hdrs[k] = v; });
  return { status: res.status, text, json, headers: hdrs };
}

export type HttpChecks = {
  expect_status?: number | number[];
  expect_body_contains?: string | string[];
  expect_json_path?: Record<string, unknown>;
};

function httpSatisfies(res: HttpResult, checks: HttpChecks): boolean {
  if (checks.expect_status !== undefined) {
    const want = checks.expect_status;
    const ok = Array.isArray(want) ? want.includes(res.status) : res.status === want;
    if (!ok) return false;
  }
  if (checks.expect_body_contains !== undefined) {
    const wants = Array.isArray(checks.expect_body_contains)
      ? checks.expect_body_contains : [checks.expect_body_contains];
    if (!wants.every((w) => res.text.includes(w))) return false;
  }
  for (const [p, want] of Object.entries(checks.expect_json_path ?? {})) {
    if (JSON.stringify(jsonPath(res.json, p)) !== JSON.stringify(want)) return false;
  }
  return true;
}

/** Poll until the response satisfies every check. The assertion primitive for
 *  anything the system processes asynchronously. */
export async function awaitHttp(
  resourceId: string, opts: HttpOpts, checks: HttpChecks,
  timeoutMs: number, intervalMs: number, ctx: Ctx,
): Promise<HttpResult> {
  return withDeadline(
    `awaitHttp ${opts.method} ${opts.path} on ${resourceId}`,
    timeoutMs, intervalMs,
    async () => {
      const res = await http(resourceId, opts, ctx);
      return httpSatisfies(res, checks) ? res : null;
    },
  );
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export type MessageMatch = { match_contains?: string | string[]; match_json_path?: Record<string, unknown> };
export type MessageResult = { matched: boolean; count: number; messages: unknown[]; json: unknown };

function messageSatisfies(raw: string, match: MessageMatch): boolean {
  const wants = match.match_contains === undefined ? []
    : Array.isArray(match.match_contains) ? match.match_contains : [match.match_contains];
  if (!wants.every((w) => raw.includes(w))) return false;
  if (match.match_json_path) {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return false; }
    for (const [p, want] of Object.entries(match.match_json_path)) {
      if (JSON.stringify(jsonPath(parsed, p)) !== JSON.stringify(want)) return false;
    }
  }
  return true;
}

async function kafkaClient(r: ResourceInfo) {
  let Kafka: any;
  try {
    ({ Kafka } = await import('kafkajs'));
  } catch {
    throw new Error(
      `Resource '${r.id}' is Kafka but 'kafkajs' is not installed. ` +
        `Run 'e2e setup' (it installs adapter packages) or 'npm i -D kafkajs'.`,
    );
  }
  const broker = r.baseUrl?.replace(/^https?:\/\//, '') ?? `localhost:${r.hostPort ?? 9092}`;
  // kafkajs logs connection chatter at INFO, which buries the actual test output.
  // Set E2E_KAFKA_LOG_LEVEL=INFO when debugging a broker problem.
  const levels: Record<string, number> = { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 };
  const logLevel = levels[process.env.E2E_KAFKA_LOG_LEVEL ?? 'NOTHING'] ?? 0;
  return new Kafka({ clientId: 'e2e-harness', brokers: [broker], logLevel, retry: { retries: 3 } });
}

export async function publish(
  resourceId: string, target: string, payload: unknown,
  opts: { key?: string | null; headers?: Record<string, string> }, ctx: Ctx,
): Promise<void> {
  const r = resource(resourceId);
  const value = typeof payload === 'string'
    ? interpolate(payload, ctx) : JSON.stringify(interpolate(payload, ctx));

  if (r.kind === 'kafka') {
    const producer = (await kafkaClient(r)).producer();
    await producer.connect();
    try {
      await producer.send({
        topic: interpolate(target, ctx),
        messages: [{ key: opts.key ?? undefined, value, headers: opts.headers }],
      });
    } finally {
      await producer.disconnect();
    }
    return;
  }
  throw new Error(
    `publish is not implemented for resource kind '${r.kind}' (${r.id}). ` +
      `Supported: kafka. See references/adapters.md to add one.`,
  );
}

/** Wait for a matching message. Consumes from the beginning by default so a
 *  message produced before the consumer attached is still observed -- that race
 *  is the most common cause of a flaky event-driven test. */
export async function awaitMessage(
  resourceId: string, target: string, match: MessageMatch, timeoutMs: number,
  opts: { from_beginning?: boolean; min_count?: number }, ctx: Ctx,
): Promise<MessageResult> {
  const r = resource(resourceId);
  const topic = interpolate(target, ctx);
  const need = opts.min_count ?? 1;

  if (r.kind !== 'kafka') {
    throw new Error(
      `awaitMessage is not implemented for resource kind '${r.kind}' (${r.id}). ` +
        `Supported: kafka. See references/adapters.md to add one.`,
    );
  }

  // Resolve {{vars}} in the match predicate up front. Forgetting this makes
  // match_json_path: {"id": "{{uploadId}}"} compare against the literal string
  // and never match -- a test that fails for a reason nothing in the output
  // explains.
  const m = interpolate(match, ctx);

  const consumer = (await kafkaClient(r)).consumer({
    groupId: `e2e-harness-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  const seen: unknown[] = [];
  let matchedRaw: string | null = null;

  await consumer.connect();
  try {
    await consumer.subscribe({ topic, fromBeginning: opts.from_beginning !== false });
    await consumer.run({
      eachMessage: async ({ message }: any) => {
        const raw = message.value?.toString() ?? '';
        seen.push(raw);
        if (messageSatisfies(raw, m)) {
          if (matchedRaw === null) matchedRaw = raw;
        }
      },
    });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hits = seen.filter((x) => messageSatisfies(String(x), m)).length;
      if (hits >= need) break;
      await sleep(200);
    }
  } finally {
    // stop() before disconnect() lets the runner unwind its own timers. Skipping
    // it makes kafkajs schedule a heartbeat against an expired deadline, which
    // surfaces as a confusing TimeoutNegativeWarning in the test output.
    await consumer.stop().catch(() => {});
    await consumer.disconnect().catch(() => {});
  }

  const hits = seen.filter((x) => messageSatisfies(String(x), m)).length;
  let json: unknown;
  try { json = matchedRaw ? JSON.parse(matchedRaw) : undefined; } catch { /* not JSON */ }
  return { matched: hits >= need, count: hits, messages: seen, json };
}

// ---------------------------------------------------------------------------
// Blob storage
// ---------------------------------------------------------------------------

export type BlobChecks = { name_pattern?: string; min_size_bytes?: number; content_contains?: string };
export type BlobResult = { found: boolean; names: string[]; content: string | null; json: unknown };

const AZURITE_DEV_CONN =
  'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
  'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;';

async function blobService(r: ResourceInfo) {
  let BlobServiceClient: any;
  try {
    ({ BlobServiceClient } = await import('@azure/storage-blob'));
  } catch {
    throw new Error(
      `Resource '${r.id}' is Azure storage but '@azure/storage-blob' is not installed. ` +
        `Run 'e2e setup' or 'npm i -D @azure/storage-blob'.`,
    );
  }
  const port = r.hostPort ?? 10000;
  const conn =
    process.env.AZURE_STORAGE_CONNECTION_STRING ??
    `${AZURITE_DEV_CONN}BlobEndpoint=http://127.0.0.1:${port}/devstoreaccount1;`;
  return BlobServiceClient.fromConnectionString(conn);
}

export async function uploadBlob(
  resourceId: string, container: string, blobName: string,
  payload: { content?: string | null; content_file?: string | null; content_type?: string | null },
  ctx: Ctx,
): Promise<void> {
  const r = resource(resourceId);
  if (r.kind !== 'azure-storage') {
    throw new Error(
      `uploadBlob is not implemented for resource kind '${r.kind}' (${r.id}). ` +
        `Supported: azure-storage. See references/adapters.md to add one.`,
    );
  }
  const svc = await blobService(r);
  const cc = svc.getContainerClient(interpolate(container, ctx));
  await cc.createIfNotExists();
  let data: Buffer;
  if (payload.content_file) {
    const { readFile } = await import('node:fs/promises');
    data = await readFile(payload.content_file);
  } else {
    data = Buffer.from(interpolate(payload.content ?? '', ctx), 'utf8');
  }
  await cc.getBlockBlobClient(interpolate(blobName, ctx)).upload(data, data.length, {
    blobHTTPHeaders: payload.content_type ? { blobContentType: payload.content_type } : undefined,
  });
}

/** Wait for a blob matching the checks to land in the container. */
export async function awaitBlob(
  resourceId: string, container: string, checks: BlobChecks, timeoutMs: number, ctx: Ctx,
): Promise<BlobResult> {
  const r = resource(resourceId);
  if (r.kind !== 'azure-storage') {
    throw new Error(
      `awaitBlob is not implemented for resource kind '${r.kind}' (${r.id}). ` +
        `Supported: azure-storage. See references/adapters.md to add one.`,
    );
  }
  const svc = await blobService(r);
  const cc = svc.getContainerClient(interpolate(container, ctx));
  const pattern = checks.name_pattern ? new RegExp(interpolate(checks.name_pattern, ctx)) : null;
  const names: string[] = [];

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    names.length = 0;
    try {
      for await (const b of cc.listBlobsFlat()) {
        names.push(b.name);
        if (pattern && !pattern.test(b.name)) continue;
        if (checks.min_size_bytes && (b.properties?.contentLength ?? 0) < checks.min_size_bytes) continue;
        let content: string | null = null;
        if (checks.content_contains !== undefined) {
          const buf = await cc.getBlockBlobClient(b.name).downloadToBuffer();
          content = buf.toString('utf8');
          if (!content.includes(checks.content_contains)) continue;
        }
        let json: unknown;
        if (content) { try { json = JSON.parse(content); } catch { /* not JSON */ } }
        return { found: true, names: [...names], content, json };
      }
    } catch { /* container may not exist yet; keep polling */ }
    await sleep(500);
  }
  return { found: false, names: [...names], content: null, json: undefined };
}
