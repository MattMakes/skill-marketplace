// ddd code prefill: deterministic per-context briefs for ddd-code, pulled from the
// upstream artifacts. Port of prefill.py; same flags, same wording, same bytes.
//
//   ddd code prefill <ddd-dir>                            write <ddd-dir>/08-code/.prefill/<context>.md (one brief per
//                                                         bounded context, <= ~15 KB each) and print a one-screen index
//   ddd code prefill <ddd-dir> --context <id> [--print]   one context only; --print echoes the brief to stdout
//   ddd code prefill <ddd-dir> --format json [--context <id>]   the same facts as JSON on stdout; writes nothing
//   ddd code prefill <ddd-dir> --detect                   repo language / framework / ORM / bus / layout, plus a stack
//                                                         hint from README / manifest notes / understand constraints
//   ddd code prefill <ddd-dir> --skeleton [--out PATH] [--language L] [--framework F] [--db D] [--mode auto|interactive]
//                                                         first-cut code.json to EDIT, never to ship as-is
//
// A brief answers, per bounded context: which subdomains and therefore which implementation
// pattern (strategize); which deployable and team, and any frontend that hosts its runtime
// (organise); which commands / events / aggregate candidates / policies / read models it owns
// (discover via decompose); every message edge in and out with the transport decided per
// (producer -> consumer) edge; which external systems it calls and which ones initiate a
// command or event toward it (`response` steps never count); local read models vs queries it
// sends to other contexts; its vocabulary, business decisions, quality attributes, hotspots,
// coupling concerns, the upstream notes addressed to ddd-code that name it, and the existing
// design on a re-run.
//
// The brief and index text still say "check_code.py removes the folder" and the skeleton
// still cites references/lang-*.md: the plan keeps Python-era wording verbatim until leaf
// 1.4.1 rewords code and goldens together.
//
// Reads the workspace; writes only .prefill/ briefs and --out. Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { pyDumps } from "../../../shared/lib/jsonschema.mjs";
import {
  ArgError, cmpStr, fill, get, getList, helpText, isDict, loadJson, parseArgs, plen, pyFixed, pyRepr, pyStr, truthy,
} from "./_py.mjs";

const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code"];
const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));
const PATTERN_RANK = { "transaction-script": 0, "active-record": 1, "domain-model": 2, "event-sourced-domain-model": 3 };
const TYPE_RANK = { generic: 0, supporting: 1, core: 2 };
const AGG_PATTERNS = ["domain-model", "event-sourced-domain-model"];
const SKIP_DIRS = new Set([".git", "node_modules", "bin", "obj", "dist", "build", "target", ".venv", "venv", "__pycache__", ".idea", ".vscode", "ddd"]);
const WRAP = 110; // brief line width
const BRIEF_BUDGET = 15000; // bytes per brief; the renderer compacts until it fits
const MECH_VIA = { "in-process-call": "in-process", "sync-api": "http", "async-events": "message-bus", "shared-db": "db", batch: "file" };
const INITIATES = ["command", "event"]; // what an external system can initiate toward us; a `response` never opens a port
const DOC_FILES = ["README.md", "README.rst", "README.txt", "CONTEXT.md", "CLAUDE.md", "AGENTS.md"];
const LANG_HINTS = [
  [/\btypescript\b|\bnode\.js\b|\bnodejs\b|\bdeno\b|\bnestjs\b/, "typescript"], [/\bjavascript\b/, "javascript"],
  [/\bpython\b|\bfastapi\b|\bdjango\b/, "python"], [/\bgolang\b|\bgo\s+1\.\d|\bin\s+go\b/, "go"],
  [/\bkotlin\b|\bktor\b/, "kotlin"], [/\bjava\b|\bspring[ -]?boot\b|\bquarkus\b/, "java"],
  [/c#|\bcsharp\b|\.net\b|\bdotnet\b/, "csharp"], [/\brust\b/, "rust"], [/\bruby\b|\brails\b/, "ruby"],
  [/\belixir\b/, "elixir"], [/\bphp\b|\blaravel\b/, "php"], [/\bswift\b/, "swift"],
];
const FW_HINTS = [
  [/\bnestjs\b/, "nestjs"], [/\bnext\.?js\b/, "nextjs"], [/\bfastify\b/, "fastify"], [/\bexpress\.?js\b/, "express"],
  [/\bhono\b/, "hono"], [/\bfastapi\b/, "fastapi"], [/\bdjango\b/, "django"], [/\bflask\b/, "flask"],
  [/\bspring[ -]?boot\b|\bspringframework\b/, "spring-boot"], [/\bquarkus\b/, "quarkus"], [/\bmicronaut\b/, "micronaut"],
  [/\bktor\b/, "ktor"], [/\basp\.net\b/, "asp.net-core"], [/\bgin-gonic\b/, "gin"], [/\blabstack\/echo\b/, "echo"],
  [/\bgo-chi\b/, "chi"], [/\bgofiber\b/, "fiber"], [/\brails\b/, "rails"], [/\bphoenix\b/, "phoenix"], [/\blaravel\b/, "laravel"],
];

// ---------- small helpers ----------
const S = pyStr; // f-string interpolation: None -> "None", True -> "True", lists -> repr

function pascal(s) {
  return pyStr(s ?? "").split(/[^A-Za-z0-9]+/).filter((w) => w).map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join("");
}

function snake(s) {
  return pyStr(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// 'Job (the work on site)' -> 'Job'; 'Work order — a technician's assignment' -> 'Work order'.
function cleanName(s) {
  let t = pyStr(s ?? "").replace(/\([^)]*\)/g, "");
  t = t.split(/\s+[—–-]\s+|:\s|\s+—\s+/)[0];
  return t.replace(/\s+/g, " ").trim();
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// {x[key]: x for x in items}: a Map so a null key stays distinct from "null", as in Python.
function byId(items, key = "id") {
  const m = new Map();
  for (const x of items ?? []) {
    if (isDict(x) && get(x, key) !== null) m.set(get(x, key), x);
  }
  return m;
}

function uniq(seq) {
  const out = [];
  const seen = new Set();
  for (const x of seq) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function wrap(text, indent = "  ") {
  return fill(pyStr(text).replace(/\s+/g, " "), WRAP, indent);
}

// max(items, key=rank): the first of the highest-ranked, as Python's max returns.
function maxBy(items, rank) {
  let best = null;
  let bestRank = -Infinity;
  for (const it of items) {
    const r = rank[it] ?? -1;
    if (best === null || r > bestRank) {
      best = it;
      bestRank = r;
    }
  }
  return best;
}

function intersects(a, b) {
  const s = new Set(b);
  return a.some((x) => s.has(x));
}

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function exists(p) {
  return fs.existsSync(p);
}

// ---------- workspace ----------
function loadWorkspace(dddDirIn) {
  const dddDir = path.resolve(dddDirIn);
  const projectRoot = path.dirname(dddDir);
  const rel = path.relative(projectRoot, dddDir) || ".";
  const A = {};
  const inputs = [];
  const missing = [];
  const manifest = loadJson(path.join(dddDir, "manifest.json"));
  if (truthy(manifest)) inputs.push(`${rel}/manifest.json`);
  for (const s of STEPS) {
    const d = loadJson(path.join(dddDir, FOLDER[s], `${s}.json`));
    if (d !== null) {
      A[s] = d;
      if (s !== "code") inputs.push(`${rel}/${FOLDER[s]}/${s}.json`);
    } else if (s !== "code") {
      missing.push(s);
    }
  }
  if (exists(path.join(dddDir, "glossary.md"))) inputs.push(`${rel}/glossary.md`);
  for (const c of getList(A.define ?? {}, "canvases")) {
    const cp = get(c, "canvas_path");
    // os.path.join drops the root when the canvas path is absolute; path.resolve does the same.
    if (truthy(cp) && exists(path.resolve(projectRoot, S(cp)))) inputs.push(cp);
  }
  const docs = {};
  for (const fn of DOC_FILES) {
    const p = path.join(projectRoot, fn);
    if (isFile(p)) {
      try {
        // f.read(12000) reads characters, not bytes.
        docs[fn] = [...fs.readFileSync(p, "utf8")].slice(0, 12000).join("");
      } catch {
        // unreadable doc: skipped, as the Python does
      }
    }
  }
  return { ddd_dir: dddDir, project_root: projectRoot, rel, manifest: truthy(manifest) ? manifest : {}, A, inputs, missing, docs };
}

// ---------- repo detection ----------
// os.walk with SKIP_DIRS and dot-directories pruned and a depth cap. Yields [dir, files].
// os.walk lists entries in directory order, which no port can reproduce; sorted order
// is the deterministic stand-in and only decides which .csproj is quoted as evidence.
function* walk(root, maxDepth = 3) {
  root = root.replace(/\/+$/, "");
  const base = (root.match(/\//g) || []).length;
  const visit = function* (dp) {
    let entries;
    try { entries = fs.readdirSync(dp, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => cmpStr(a.name, b.name));
    let dns = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const fns = entries.filter((e) => !e.isDirectory()).map((e) => e.name);
    dns = dns.filter((d) => !SKIP_DIRS.has(d) && !d.startsWith("."));
    if ((dp.match(/\//g) || []).length - base >= maxDepth) dns = [];
    yield [dp, fns];
    for (const d of dns) yield* visit(path.join(dp, d));
  };
  yield* visit(root);
}

function detectRepo(root) {
  const info = { root, language: null, framework: null, orm: null, bus: null, test_framework: null, evidence: [], src_dirs: [], test_dirs: [], hint: null };
  const has = (...p) => exists(path.join(root, ...p));
  const text = (...p) => {
    try { return fs.readFileSync(path.join(root, ...p), "utf8"); } catch { return ""; }
  };
  // `needle in hay`: key membership when hay is the dependency dict, substring on text.
  const pick = (hay, table) => {
    for (const [needle, label] of table) {
      const hit = typeof hay === "string" ? hay.includes(needle) : Object.prototype.hasOwnProperty.call(hay, needle);
      if (hit) return label;
    }
    return null;
  };

  if (has("package.json")) {
    const pkg = loadJson(path.join(root, "package.json")) ?? {};
    const deps = { ...(get(pkg, "dependencies") ?? {}), ...(get(pkg, "devDependencies") ?? {}) };
    info.language = has("tsconfig.json") || Object.prototype.hasOwnProperty.call(deps, "typescript") ? "typescript" : "javascript";
    info.evidence.push("package.json" + (has("tsconfig.json") ? " + tsconfig.json" : ""));
    info.framework = pick(deps, [["@nestjs/core", "nestjs"], ["next", "nextjs"], ["fastify", "fastify"], ["express", "express"], ["hono", "hono"], ["koa", "koa"]]);
    info.orm = pick(deps, [["@prisma/client", "prisma"], ["prisma", "prisma"], ["typeorm", "typeorm"], ["drizzle-orm", "drizzle"], ["@mikro-orm/core", "mikro-orm"], ["knex", "knex"], ["sequelize", "sequelize"], ["mongoose", "mongoose"], ["pg", "pg"]]);
    info.bus = pick(deps, [["kafkajs", "kafka"], ["amqplib", "rabbitmq"], ["@aws-sdk/client-sqs", "sqs"], ["nats", "nats"]]);
    info.test_framework = pick(deps, [["vitest", "vitest"], ["jest", "jest"], ["mocha", "mocha"]]) ?? "node:test";
  } else if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || has("setup.cfg")) {
    const hay = (text("pyproject.toml") + text("requirements.txt") + text("setup.py") + text("setup.cfg")).toLowerCase();
    info.language = "python";
    info.evidence.push("pyproject.toml/requirements.txt");
    info.framework = pick(hay, [["fastapi", "fastapi"], ["django", "django"], ["flask", "flask"], ["litestar", "litestar"]]);
    info.orm = pick(hay, [["sqlalchemy", "sqlalchemy"], ["django", "django-orm"], ["tortoise", "tortoise"], ["peewee", "peewee"], ["psycopg", "psycopg"]]);
    info.bus = pick(hay, [["aiokafka", "kafka"], ["confluent-kafka", "kafka"], ["pika", "rabbitmq"], ["celery", "celery"], ["nats", "nats"]]);
    info.test_framework = hay.includes("pytest") ? "pytest" : "unittest";
  } else if (has("go.mod")) {
    const hay = text("go.mod");
    info.language = "go";
    info.evidence.push("go.mod");
    info.framework = pick(hay, [["gin-gonic/gin", "gin"], ["labstack/echo", "echo"], ["go-chi/chi", "chi"], ["gofiber/fiber", "fiber"]]) ?? "net/http";
    info.orm = pick(hay, [["gorm.io", "gorm"], ["entgo.io", "ent"], ["jmoiron/sqlx", "sqlx"], ["jackc/pgx", "pgx"], ["sqlc", "sqlc"]]);
    info.bus = pick(hay, [["segmentio/kafka-go", "kafka"], ["IBM/sarama", "kafka"], ["nats-io", "nats"], ["ThreeDotsLabs/watermill", "watermill"], ["rabbitmq/amqp091-go", "rabbitmq"]]);
    info.test_framework = "testing" + (hay.includes("stretchr/testify") ? " + testify" : "");
  } else if (has("pom.xml") || has("build.gradle") || has("build.gradle.kts")) {
    const hay = text("pom.xml") + text("build.gradle") + text("build.gradle.kts") + text("settings.gradle.kts");
    let hasKt = hay.includes("kotlin(") || hay.includes("kotlin-");
    if (!hasKt) {
      for (const [, fns] of walk(root, 6)) {
        if (fns.some((fn) => fn.endsWith(".kt"))) { hasKt = true; break; }
      }
    }
    info.language = hasKt ? "kotlin" : "java";
    info.evidence.push("pom.xml/build.gradle");
    info.framework = pick(hay, [["spring-boot", "spring-boot"], ["quarkus", "quarkus"], ["micronaut", "micronaut"], ["ktor", "ktor"]]);
    info.orm = pick(hay, [["spring-boot-starter-data-jpa", "spring-data-jpa"], ["hibernate", "hibernate"], ["jooq", "jooq"], ["exposed", "exposed"], ["spring-jdbc", "jdbc"]]);
    info.bus = pick(hay, [["spring-kafka", "kafka"], ["kafka", "kafka"], ["spring-amqp", "rabbitmq"], ["spring-modulith", "spring-modulith-events"]]);
    info.test_framework = pick(hay, [["kotest", "kotest"], ["junit-jupiter", "junit5"], ["spring-boot-starter-test", "junit5"]]) ?? "junit5";
  } else {
    const cs = [];
    for (const [dp, fns] of walk(root, 3)) {
      for (const fn of fns) if (fn.endsWith(".csproj") || fn.endsWith(".sln")) cs.push(path.join(dp, fn));
    }
    if (cs.length) {
      const hay = cs.filter((p) => p.endsWith(".csproj")).map((p) => text(path.relative(root, p))).join("");
      info.language = "csharp";
      info.evidence.push(path.relative(root, cs[0]));
      info.framework = hay.includes("Microsoft.NET.Sdk.Web") || hay.includes("Microsoft.AspNetCore") ? "asp.net-core" : null;
      info.orm = pick(hay, [["Microsoft.EntityFrameworkCore", "ef-core"], ["Dapper", "dapper"], ["Marten", "marten"]]);
      info.bus = pick(hay, [["MassTransit", "masstransit"], ["Rebus", "rebus"], ["NServiceBus", "nservicebus"], ["Wolverine", "wolverine"]]);
      info.test_framework = pick(hay, [["xunit", "xunit"], ["NUnit", "nunit"], ["MSTest", "mstest"]]) ?? "xunit";
    }
  }
  info.src_dirs = ["src", "app", "apps", "packages", "services", "internal", "cmd", "pkg", "lib", "modules"].filter((d) => isDir(path.join(root, d)));
  info.test_dirs = ["tests", "test", "spec", "__tests__", "src/test"].filter((d) => isDir(path.join(root, d)));
  return info;
}

// A stack named in understand constraints, the manifest notes or the README counts as an
// instruction (medium confidence).
function hintStack(ws) {
  const texts = [];
  for (const c of getList(ws.A.understand ?? {}, "constraints")) {
    const kind = get(c, "kind");
    if ((kind === "technical" || kind === "other" || kind === null) && truthy(get(c, "text"))) {
      texts.push([`understand constraint ${S(get(c, "id"))}`, c.text]);
    }
  }
  const m = ws.manifest;
  for (const [label, t] of [["manifest.notes", get(m, "notes")], ["manifest.scale_target.notes", get(get(m, "scale_target") ?? {}, "notes")]]) {
    if (truthy(t)) texts.push([label, pyStr(t)]);
  }
  for (const [k, v] of Object.entries(ws.docs)) texts.push([k, v]);
  for (const [source, text] of texts) {
    const low = pyStr(text).toLowerCase();
    const langs = [];
    for (const [pat, lang] of LANG_HINTS) {
      const mm = pat.exec(low);
      if (mm) langs.push([mm.index, lang]);
    }
    if (!langs.length) continue;
    const fws = [];
    for (const [pat, fw] of FW_HINTS) {
      const mm = pat.exec(low);
      if (mm) fws.push([mm.index, fw]);
    }
    const byStart = (a, b) => a[0] - b[0] || cmpStr(a[1], b[1]);
    langs.sort(byStart);
    fws.sort(byStart);
    return { language: langs[0][1], framework: fws.length ? fws[0][1] : null, source, others: uniq(langs.slice(1).map((x) => x[1])) };
  }
  return null;
}

// ---------- module path convention (mirrors references/lang-*.md and architecture-and-modules.md §4) ----------
function suggestModulePath(language, project, ctx, deployable, multi) {
  const lang = (language || "typescript").toLowerCase();
  const proj = snake(project || "app");
  const ctxS = snake(ctx);
  const dep = deployable || "app";
  if (lang === "typescript" || lang === "javascript") return multi ? `apps/${S(dep)}/src/${S(ctx)}` : `src/${S(ctx)}`;
  if (lang === "python") return multi ? `services/${snake(dep)}/src/${proj}/${ctxS}` : `src/${proj}/${ctxS}`;
  if (lang === "go") return multi ? `services/${snake(dep)}/internal/${ctxS}` : `internal/${ctxS}`;
  if (lang === "java" || lang === "kotlin") return multi ? `${snake(dep)}/src/main/${lang}/${proj}/${ctxS}` : `src/main/${lang}/${proj}/${ctxS}`;
  if (lang === "csharp") return multi ? `src/${pascal(dep)}/${pascal(project)}.${pascal(ctx)}` : `src/${pascal(project)}.${pascal(ctx)}`;
  return `src/${S(ctx)}`;
}

// Contract §4.8: a context whose runtime a frontend also hosts lives in a shared domain package.
function sharedPackagePath(language, project, ctx) {
  const lang = (language || "typescript").toLowerCase();
  const proj = snake(project || "app");
  const ctxS = snake(ctx);
  if (lang === "python") return `packages/${S(ctx)}/src/${proj}/${ctxS}`;
  if (lang === "go") return `pkg/${ctxS}`;
  if (lang === "java" || lang === "kotlin") return `${S(ctx)}-domain/src/main/${lang}/${proj}/${ctxS}`;
  if (lang === "csharp") return `src/${pascal(project)}.${pascal(ctx)}`;
  return `packages/${S(ctx)}/src`;
}

// ---------- brief ----------
function buildBriefs(ws, only = null) {
  const A = ws.A;
  const disc = A.discover ?? {};
  const dec = A.decompose ?? {};
  const strat = A.strategize ?? {};
  const conn = A.connect ?? {};
  const org = A.organise ?? {};
  const dfn = A.define ?? {};
  const code = A.code ?? {};
  const cmds = byId(get(disc, "commands"));
  const evs = byId(get(disc, "events"));
  const rms = byId(get(disc, "read_models"));
  const externals = byId(get(disc, "external_systems"));
  const actors = byId(get(disc, "actors"));
  for (const p of getList(conn, "parties")) {
    const target = get(p, "kind") === "external-system" ? externals : actors;
    if (!target.has(get(p, "id"))) target.set(get(p, "id"), p);
  }
  const cls = new Map(getList(strat, "classifications").map((c) => [get(c, "subdomain"), c]));
  const canvases = new Map(getList(dfn, "canvases").map((c) => [get(c, "context"), c]));
  const messages = byId(get(conn, "messages"));
  const mechByRel = new Map(getList(conn, "integration_patterns").map((p) => [get(p, "relationship"), p]));
  const existing = new Map(getList(code, "contexts").map((c) => [get(c, "context"), c]));
  const bcs = getList(dec, "bounded_contexts");
  const deployables = getList(org, "deployables");
  const depOf = new Map();
  for (const d of deployables) for (const x of getList(d, "contexts")) depOf.set(x, get(d, "id"));
  const ownerOfCmd = new Map();
  for (const bc of bcs) for (const c of getList(bc, "owns_commands")) ownerOfCmd.set(c, get(bc, "id"));
  const ownerOfEv = new Map();
  for (const bc of bcs) for (const e of getList(bc, "owns_events")) ownerOfEv.set(e, get(bc, "id"));
  const notesAll = [];
  for (const s of STEPS) {
    if (!(s in A)) continue;
    for (const n of getList(A[s], "notes_for_downstream")) {
      if ((get(n, "for") ?? []).includes("code")) notesAll.push([s, n]);
    }
  }
  const mapGet = (m, k, dflt = null) => (m.has(k) ? m.get(k) : dflt);

  // Transport of one (producer -> consumer) edge: flow step > integration decision of the relationship > deployables.
  function resolveVia(src, dst, mid) {
    for (const f of getList(conn, "flows")) {
      for (const st of getList(f, "steps")) {
        if (get(st, "from") === src && get(st, "to") === dst && get(st, "message") === mid && truthy(get(st, "via"))) {
          return [st.via, `flow ${S(get(f, "id"))} step ${S(get(st, "seq"))}`];
        }
      }
    }
    for (const r of getList(dec, "relationships")) {
      const pair = new Set([get(r, "upstream"), get(r, "downstream")]);
      const want = new Set([src, dst]);
      if (pair.size === want.size && [...want].every((x) => pair.has(x))) {
        const mech = get(mapGet(mechByRel, get(r, "id")) ?? {}, "mechanism");
        if (truthy(MECH_VIA[mech])) return [MECH_VIA[mech], `${S(get(r, "id"))} ${S(mech)}`];
      }
    }
    const a = mapGet(depOf, src);
    const b = mapGet(depOf, dst);
    if (truthy(a) && truthy(b)) return a === b ? ["in-process", "same deployable"] : ["message-bus", `different deployables ${S(a)} → ${S(b)}`];
    return [null, "no flow step"];
  }

  function edge(src, dst, mid, kind, delivery = null, payload = null, contract = null, source = "connect") {
    const [via, basis] = resolveVia(src, dst, mid);
    const a = mapGet(depOf, src);
    const b = mapGet(depOf, dst);
    const cross = Boolean(truthy(a) && truthy(b) && a !== b);
    return {
      id: mid, kind, from: src, to: dst, via, via_basis: basis, delivery,
      payload: truthy(payload) ? payload : [], contract, cross_deployable: cross,
      conflict: Boolean(cross && via === "in-process"), source,
    };
  }

  const briefs = [];
  for (const bc of bcs) {
    const cid = get(bc, "id");
    if (truthy(only) && cid !== only) continue;
    const ownCmds = getList(bc, "owns_commands");
    const ownEvs = getList(bc, "owns_events");
    const subs = [];
    for (const s of getList(bc, "subdomains")) {
      const c = mapGet(cls, s) ?? {};
      subs.push({
        id: s, type: get(c, "type"), implementation_pattern: get(c, "implementation_pattern"),
        sourcing: get(c, "sourcing"), investment: get(c, "investment"), evolution: get(c, "evolution"),
        rationale: get(c, "rationale"),
      });
    }
    const types = subs.map((s) => s.type).filter(truthy);
    const pats = subs.map((s) => s.implementation_pattern).filter(truthy);
    const rtype = types.length ? maxBy(types, TYPE_RANK) : null;
    const rpat = pats.length ? maxBy(pats, PATTERN_RANK) : null;
    const sourcing = uniq(subs.map((s) => s.sourcing).filter(truthy));
    const dep = deployables.find((d) => getList(d, "contexts").includes(cid)) ?? null;
    const team = getList(org, "teams").find((t) => getList(t, "owns_contexts").includes(cid)) ?? null;
    const hostedBy = deployables.filter((d) => (get(d, "hosts_runtime_of") ?? []).includes(cid)).map((d) => get(d, "id"));
    const canvas = mapGet(canvases, cid) ?? {};

    // policies: those this context must run (then -> owned command) and those it must feed (when -> owned event)
    const reacts = [];
    const feeds = [];
    for (const p of getList(disc, "policies")) {
      const thenHere = getList(p, "then").filter((c) => ownCmds.includes(c));
      if (thenHere.length) {
        const w = get(p, "when");
        reacts.push({ id: get(p, "id"), name: get(p, "name"), when: w, when_owned_by: mapGet(ownerOfEv, w), then: thenHere, kind: get(p, "kind") });
      }
      if (ownEvs.includes(get(p, "when"))) {
        const elsewhere = getList(p, "then").filter((c) => ![null, cid].includes(mapGet(ownerOfCmd, c)));
        if (elsewhere.length) {
          feeds.push({ id: get(p, "id"), name: get(p, "name"), when: get(p, "when"), then: elsewhere, in_contexts: uniq(elsewhere.map((c) => mapGet(ownerOfCmd, c))) });
        }
      }
    }

    // message edges, one per (producer -> consumer); responses are folded away, never rows
    const inbound = [];
    const outbound = [];
    const seenIn = new Set();
    const seenOut = new Set();
    const key = (a, b) => JSON.stringify([a, b]);
    for (const m of messages.values()) {
      if (get(m, "kind") === "response") continue;
      const mid = get(m, "id");
      if (getList(m, "consumers").includes(cid)) {
        inbound.push(edge(get(m, "producer"), cid, mid, get(m, "kind"), get(m, "delivery"), get(m, "payload"), get(m, "contract")));
        seenIn.add(key(get(m, "producer"), mid));
      }
      if (get(m, "producer") === cid) {
        const consumers = getList(m, "consumers").map((c) => [c, "connect"]);
        // a consumer added at define time has no connect row yet: trust the canvas outbound row
        for (const entry of getList(canvas, "outbound")) {
          if (getList(entry, "messages").some((x) => get(x, "id") === mid) && !consumers.some(([c]) => c === get(entry, "collaborator"))) {
            consumers.push([get(entry, "collaborator"), "define-canvas (no connect consumer row)"]);
          }
        }
        for (const [c, src] of consumers) {
          outbound.push(edge(cid, c, mid, get(m, "kind"), get(m, "delivery"), get(m, "payload"), get(m, "contract"), src));
          seenOut.add(key(c, mid));
        }
      }
    }
    for (const [side, coll, seen] of [["inbound", inbound, seenIn], ["outbound", outbound, seenOut]]) {
      for (const entry of getList(canvas, side)) {
        for (const msg of getList(entry, "messages")) {
          const other = get(entry, "collaborator");
          if (get(msg, "kind") === "response" || seen.has(key(other, get(msg, "id")))) continue;
          const [src, dst] = side === "inbound" ? [other, cid] : [cid, other];
          coll.push(edge(src, dst, get(msg, "id"), get(msg, "kind"), null, get(msg, "payload"), get(entry, "relationship"), "define-canvas"));
          seen.add(key(other, get(msg, "id")));
        }
      }
    }
    for (const f of getList(conn, "flows")) {
      for (const st of getList(f, "steps")) {
        if (get(st, "kind") === "response") continue;
        if (get(st, "to") === cid && !seenIn.has(key(get(st, "from"), get(st, "message")))) {
          inbound.push(edge(get(st, "from"), cid, get(st, "message"), get(st, "kind"), null, null, null, `flow ${S(get(f, "id"))}`));
          seenIn.add(key(get(st, "from"), get(st, "message")));
        }
        if (get(st, "from") === cid && !seenOut.has(key(get(st, "to"), get(st, "message")))) {
          outbound.push(edge(cid, get(st, "to"), get(st, "message"), get(st, "kind"), null, null, null, `flow ${S(get(f, "id"))}`));
          seenOut.add(key(get(st, "to"), get(st, "message")));
        }
      }
    }
    const evIn = inbound.filter((e) => e.kind === "event" && !externals.has(e.from));
    const evOut = outbound.filter((e) => e.kind === "event");
    const qAsked = outbound.filter((e) => e.kind === "query");
    const qAnswered = inbound.filter((e) => e.kind === "query");
    const cmdVias = uniq(inbound.filter((e) => (e.kind === "command" || e.kind === "query") && truthy(e.via) && !externals.has(e.from)).map((e) => e.via));
    const extCalled = uniq(outbound.filter((e) => externals.has(e.to) && (e.kind === "command" || e.kind === "query")).map((e) => e.to));
    const extCalling = uniq(inbound.filter((e) => externals.has(e.from) && INITIATES.includes(e.kind)).map((e) => e.from));
    const askedIds = new Set(qAsked.map((e) => e.id));
    const localRms = [];
    for (const r of rms.values()) {
      if (ownCmds.includes(get(r, "informs")) && !askedIds.has(get(r, "id"))) {
        localRms.push({ id: get(r, "id"), name: get(r, "name"), informs: get(r, "informs"), used_by: get(r, "used_by") });
      }
    }
    for (const e of qAnswered) {
      if (!localRms.some((r) => r.id === e.id)) {
        localRms.push({ id: e.id, name: get(mapGet(rms, e.id) ?? {}, "name") || e.id, informs: null, used_by: e.from });
      }
    }

    const rels = [];
    for (const r of getList(dec, "relationships")) {
      if (get(r, "upstream") === cid || get(r, "downstream") === cid) {
        const ip = mapGet(mechByRel, get(r, "id")) ?? {};
        rels.push({
          ...r, role: get(r, "upstream") === cid ? "upstream" : "downstream",
          other: get(r, "upstream") === cid ? get(r, "downstream") : get(r, "upstream"),
          mechanism: get(ip, "mechanism"), mechanism_rationale: get(ip, "rationale"),
        });
      }
    }
    const aggs = [];
    for (const a of getList(disc, "aggregate_candidates")) {
      const handles = getList(a, "handles");
      const emits = getList(a, "emits");
      if (getList(bc, "owns_aggregates").includes(get(a, "id")) || intersects(handles, ownCmds) || intersects(emits, ownEvs)) {
        aggs.push({
          id: get(a, "id"), name: cleanName(get(a, "name")) || pascal(get(a, "id")), raw_name: get(a, "name"),
          root: pascal(get(a, "id")),
          handles: handles.filter((c) => ownCmds.includes(c)), emits: emits.filter((e) => ownEvs.includes(e)),
          outside_this_context: [...handles, ...emits].filter((x) => !ownCmds.includes(x) && !ownEvs.includes(x)),
        });
      }
    }
    const terms = {};
    const termsHas = (t) => Object.prototype.hasOwnProperty.call(terms, t);
    for (const t of getList(bc, "terms")) terms[get(t, "term")] = get(t, "meaning_here");
    for (const t of getList(canvas, "ubiquitous_language")) if (!termsHas(get(t, "term"))) terms[get(t, "term")] = get(t, "definition");
    const subTerms = new Set();
    for (const s of getList(dec, "subdomains")) {
      if (getList(bc, "subdomains").includes(get(s, "id"))) for (const t of getList(s, "terms")) subTerms.add(t);
    }
    for (const g of getList(disc, "glossary")) {
      const gc = get(g, "context");
      if (gc === cid || ((gc === null || gc === "") && subTerms.has(get(g, "term")))) {
        if (!termsHas(get(g, "term"))) terms[get(g, "term")] = get(g, "definition");
      }
    }
    const ownIds = [...ownCmds, ...ownEvs, ...aggs.map((a) => a.id)];
    const keys = [cid, get(bc, "name") || "", ...ownIds].filter(truthy).map((k) => pyStr(k).toLowerCase());
    const notes = notesAll
      .filter(([, n]) => keys.some((k) => new RegExp(`(?<![a-z0-9-])${escapeRe(k)}(?![a-z0-9-])`).test((get(n, "text") || "").toLowerCase())))
      .map(([s, n]) => ({ step: s, ...n }));
    const conflicts = uniq([...inbound, ...outbound].filter((e) => e.conflict).map((e) =>
      `edge ${S(e.from)} → ${S(e.to)} '${S(e.id)}' is in-process (${S(e.via_basis)}) but they sit in different deployables ` +
      `(${S(mapGet(depOf, e.from))} / ${S(mapGet(depOf, e.to))}) — needs a bus/HTTP transport: record an assumption and an open question for ddd-connect`));
    briefs.push({
      context: cid, name: get(bc, "name"), rationale: get(bc, "rationale"),
      subdomains: subs,
      resolved: { type: rtype, implementation_pattern: rpat, pattern_mixed: new Set(pats).size > 1, sourcing, needs_aggregates: AGG_PATTERNS.includes(rpat) },
      deployable: dep ? { id: get(dep, "id"), name: get(dep, "name"), kind: get(dep, "kind"), data_store: get(dep, "data_store"), independent_deploy: get(dep, "independent_deploy"), contexts: get(dep, "contexts") } : null,
      hosted_by: hostedBy,
      team: team ? { id: get(team, "id"), name: get(team, "name"), type: get(team, "type") } : null,
      purpose: get(canvas, "purpose"), domain_roles: getList(canvas, "domain_roles"),
      strategic_classification: get(canvas, "strategic_classification"),
      commands: ownCmds.map((c) => {
        const cm = mapGet(cmds, c) ?? {};
        return {
          id: c, name: get(cm, "name"), actor: get(cm, "actor"),
          actor_name: get(mapGet(actors, get(cm, "actor")) ?? {}, "name"),
          actor_is_external: externals.has(get(cm, "actor")),
          produces: getList(cm, "produces"), description: get(cm, "description"),
        };
      }),
      events: ownEvs.map((e) => {
        const ev = mapGet(evs, e) ?? {};
        return {
          id: e, name: get(ev, "name"), pivotal: get(ev, "pivotal", false),
          data: getList(ev, "data"), triggered_by: get(ev, "triggered_by"),
          sequence: get(ev, "sequence"), description: get(ev, "description"),
        };
      }),
      aggregate_candidates: aggs,
      policies: { reacts_here: reacts, feeds_elsewhere: feeds },
      read_models: localRms,
      queries_asked: qAsked,
      inbound, outbound,
      event_edges: { in: evIn, out: evOut },
      command_vias: cmdVias,
      external_systems: {
        called: extCalled.map((x) => ({ id: x, name: get(mapGet(externals, x) ?? {}, "name") })),
        calling: extCalling.map((x) => ({ id: x, name: get(mapGet(externals, x) ?? {}, "name") })),
      },
      relationships: rels,
      coupling_concerns: getList(conn, "coupling_concerns").filter((c) => getList(c, "contexts").includes(cid)),
      scenarios: getList(disc, "scenarios").filter((s) => intersects(getList(s, "events"), ownEvs)).map((s) => get(s, "id")),
      hotspots: getList(disc, "hotspots").filter((h) => ownEvs.includes(get(h, "near")) || ownCmds.includes(get(h, "near"))),
      terms,
      business_decisions: getList(canvas, "business_decisions"),
      canvas_assumptions: getList(canvas, "assumptions"),
      verification_metrics: getList(canvas, "verification_metrics"),
      canvas_open_questions: getList(canvas, "open_questions"),
      quality_attributes: getList(dfn, "quality_attributes").filter((q) => get(q, "context") === cid),
      canvas_path: get(canvas, "canvas_path"),
      notes,
      warnings: conflicts,
      existing_design: mapGet(existing, cid),
    });
  }
  return briefs;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Facts shown once, in the index: notes that name no single context and system-wide quality attributes.
function systemFacts(ws, briefs) {
  const A = ws.A;
  const named = new Set();
  for (const b of briefs) for (const n of b.notes) named.add(JSON.stringify([n.step, get(n, "id")]));
  const notes = [];
  for (const s of STEPS) {
    if (!(s in A)) continue;
    for (const n of getList(A[s], "notes_for_downstream")) {
      if ((get(n, "for") ?? []).includes("code") && !named.has(JSON.stringify([s, get(n, "id")]))) notes.push({ step: s, ...n });
    }
  }
  const qas = getList(A.define ?? {}, "quality_attributes").filter((q) => get(q, "context") === "system");
  return [notes, qas];
}

// ---------- markdown rendering ----------
function cell(v, cap) {
  let s;
  if (v === null || v === undefined) s = "";
  else if (typeof v === "boolean") s = v ? "yes" : "no";
  else if (Array.isArray(v)) s = v.map(pyStr).join(", ");
  else s = pyStr(v);
  s = s.replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  if (plen(s) <= cap) return s;
  return [...s].slice(0, cap - 1).join("").trimEnd() + "…";
}

function tbl(rows, cols, cap, labels = null) {
  if (!rows.length) return "_none_\n";
  labels = labels ?? cols;
  let out = "| " + labels.join(" | ") + " |\n|" + "---|".repeat(cols.length) + "\n";
  for (const r of rows) out += "| " + cols.map((c) => cell(get(r, c), cap)).join(" | ") + " |\n";
  return out;
}

function viaCell(e) {
  return `${e.via || "?"} (${S(e.via_basis)})`;
}

// One row per message; every party keeps its own transport: 'billing: in-process (flow F1 step 2); fulfilment: message-bus (…)'.
function groupEdges(edges, side) {
  const rows = [];
  const seen = new Map();
  for (const e of edges) {
    const k = JSON.stringify([e.id, e.kind]);
    if (!seen.has(k)) {
      seen.set(k, { id: e.id, kind: e.kind, parties: [], delivery: get(e, "delivery"), payload: get(e, "payload"), source: get(e, "source") });
      rows.push(seen.get(k));
    }
    seen.get(k).parties.push(`${S(e[side])}: ${viaCell(e)}`);
  }
  for (const r of rows) r.parties = r.parties.join("; ");
  return rows;
}

function capped(rows, limit, where) {
  if (limit && rows.length > limit) return [rows.slice(0, limit), `… ${rows.length - limit} more rows — full list in ${where}\n`];
  return [rows, ""];
}

function renderBrief(ws, b, repo) {
  let text = "";
  for (const level of [0, 1, 2, 3, 4]) {
    text = renderBriefAt(ws, b, repo, level);
    if (Buffer.byteLength(text, "utf8") <= BRIEF_BUDGET) break;
  }
  return text;
}

function renderBriefAt(ws, b, repo, level) {
  const cap = { 0: 160, 1: 100, 2: 70, 3: 50, 4: 40 }[level];
  const maxTerms = { 0: 60, 1: 30, 2: 15, 3: 8, 4: 8 }[level];
  const maxRows = { 0: 0, 1: 0, 2: 0, 3: 30, 4: 15 }[level]; // 0 = unlimited
  const r = b.resolved;
  const dep = b.deployable ?? {};
  const L = [];
  const P = (s) => L.push(s);
  P(`# ${S(b.name)} (\`${S(b.context)}\`) — ${S(r.type)}, pattern **${S(r.implementation_pattern)}**` +
    `${r.pattern_mixed ? " (MIXED across subdomains — most demanding chosen; log an assumption)" : ""}, sourcing ${r.sourcing.join(", ") || "?"}`);
  P(wrap(`Deployable \`${S(get(dep, "id"))}\` (${S(get(dep, "kind"))}, data store ${S(get(dep, "data_store"))}) · team \`${S(get(b.team ?? {}, "id"))}\`` +
    (b.hosted_by.length ? ` · runtime also hosted by frontend ${b.hosted_by.map((x) => "`" + S(x) + "`").join(", ")} → module_path = shared domain package, ` +
      `deployable stays \`${S(get(dep, "id"))}\`, \`also_compiled_into\` (contract §4.8)` : "") +
    ` · canvas \`${b.canvas_path || "-"}\``));
  P(wrap(`Aggregates needed: **${r.needs_aggregates ? "yes" : "NO — use cases + persistence only"}**. ` +
    `Purpose: ${b.purpose || "(no canvas purpose)"} Domain roles: ${b.domain_roles.map(S).join(", ") || "-"}. ` +
    `Scenarios: ${b.scenarios.map(S).join(", ") || "-"}.`));
  if (level < 3) {
    P(wrap("Subdomains: " + (b.subdomains.map((s) => `\`${S(s.id)}\` ${S(s.type)}/${S(s.implementation_pattern)} — ${cell(s.rationale, cap)}`).join("; ") || "-")));
  }
  for (const w of b.warnings) P(wrap(`**Warning:** ${w}`));
  P("");
  let [rows, more] = capped(b.commands, maxRows, "discover.json commands[] / decompose owns_commands");
  P("## Commands owned\n" + tbl(rows, ["id", "actor", "produces", ...(level < 3 ? ["description"] : [])], cap) + more);
  [rows, more] = capped(b.events, maxRows, "discover.json events[] / decompose owns_events");
  P("## Events owned\n" + tbl(rows, ["id", "pivotal", ...(level < 3 ? ["data"] : []), "triggered_by"], cap) + more);
  const aggs = b.aggregate_candidates.map((a) => ({ ...a, note: (a.raw_name || "") !== a.name ? `name cleaned from '${S(a.raw_name)}'` : "" }));
  P("## Aggregate candidates (discover) — root = discover id, pascal-cased\n" + tbl(aggs, ["id", "name", "root", "handles", "emits", "outside_this_context", "note"], cap));
  P("## Policies\nRuns here (when → then):\n" + tbl(b.policies.reacts_here, ["id", "when", "when_owned_by", "then", "kind"], cap) +
    "Feeds elsewhere (owned event → their command):\n" + tbl(b.policies.feeds_elsewhere, ["id", "when", "then", "in_contexts"], cap));
  const extra = level < 3 ? ["delivery", "payload", "source"] : ["delivery"];
  const [inb, moreIn] = capped(groupEdges(b.inbound, "from"), maxRows, "connect.json messages[] / flows[] and the canvas inbound table");
  const [outb, moreOut] = capped(groupEdges(b.outbound, "to"), maxRows, "connect.json messages[] / flows[] and the canvas outbound table");
  P("## Message edges (one row per message; every producer → consumer edge keeps its own transport; `response` steps folded away)\n" +
    "Transport per edge: flow step > integration decision of the relationship > deployables. Only an in-process edge across\n" +
    "deployables is a problem (see Warnings); mixed transports on one context are normal.\n" +
    "### Inbound\n" + tbl(inb, ["id", "kind", "parties", ...extra], cap * 2, ["id", "kind", "from: via (basis)", ...extra]) + moreIn +
    "### Outbound\n" + tbl(outb, ["id", "kind", "parties", ...extra], cap * 2, ["id", "kind", "to: via (basis)", ...extra]) + moreOut);
  const ext = b.external_systems;
  P(wrap(`Command transports in: ${b.command_vias.map(S).join(", ") || "none in flows (human actors → assume http)"} · external systems we call (→ gateway port): ` +
    `${ext.called.map((x) => S(x.id)).join(", ") || "-"} · external systems that initiate a command/event toward us (→ callbacks port): ` +
    `${ext.calling.map((x) => S(x.id)).join(", ") || "none"}`));
  P("");
  P("## Read models\nLocal (owned by this context — become `read_models[]`, fill `source_events`):\n" + tbl(b.read_models, ["id", "name", "informs", "used_by"], cap) +
    "Queries this context sends to others (→ driven gateway port, not a local read model):\n" +
    tbl(groupEdges(b.queries_asked, "to"), ["id", "parties", "payload"], cap * 2, ["id", "to: via (basis)", "payload"]));
  P("## Relationships & integration mechanism\n" + tbl(b.relationships, ["id", "role", "other", "pattern", "mechanism"], cap));
  const terms = Object.entries(b.terms);
  if (level < 3) {
    P("## Language here\n" + (terms.slice(0, maxTerms).map(([t, d]) => wrap(`- **${t}** — ${cell(d, cap)}`)).join("\n") || "_none_") +
      (terms.length > maxTerms ? `\n- … ${terms.length - maxTerms} more in glossary.md / the canvas` : ""));
    P("## Business decisions (canvas)\n" + (b.business_decisions.slice(0, level >= 2 ? 10 : 40).map((x) => wrap(`- ${cell(x, cap * 2)}`)).join("\n") || "_none_"));
  } else {
    P(wrap(`Language: ${terms.length} terms and ${b.business_decisions.length} business decisions — read the canvas \`${S(b.canvas_path)}\`.`));
  }
  [rows, more] = capped(b.quality_attributes, maxRows, "define.json quality_attributes[]");
  P("## Quality attributes (this context; system-wide ones are in the index)\n" +
    tbl(rows, ["attribute", "requirement", "priority", ...(level < 2 ? ["scenario"] : [])], cap) + more);
  [rows, more] = capped(b.hotspots, maxRows, "discover.json hotspots[]");
  P("## Hotspots near owned events/commands\n" + tbl(rows, ["id", "kind", "near", "text"], cap * 2) + more);
  P("## Coupling concerns\n" + tbl(b.coupling_concerns, ["id", "severity", "text"], cap * 2));
  if (b.notes.length) {
    P("## Upstream notes addressed to ddd-code that name this context\n" +
      b.notes.map((n) => wrap(get(n, "kind") === "decision"
        ? `- [${S(n.step)} ${S(get(n, "id"))}] (${S(get(n, "kind") ?? "other")}) ${S(get(n, "text"))} — a \`decision\` note wins: a command it vetoes ` +
          "as aggregate material becomes an application service with `handled_by: \"transaction-script\"`"
        : `- [${S(n.step)} ${S(get(n, "id"))}] (${S(get(n, "kind") ?? "other")}) ${S(get(n, "text"))}`)).join("\n"));
  }
  if (b.canvas_open_questions.length) {
    P("## Open questions carried from the canvas\n" + b.canvas_open_questions.map((x) => wrap(`- ${cell(x, cap * 2)}`)).join("\n"));
  }
  if (truthy(b.existing_design)) {
    const ex = b.existing_design;
    P(wrap(`## Existing design (re-run — keep ids)\naggregates: ${pyRepr(getList(ex, "aggregates").map((a) => get(a, "id")))}; ` +
      `services: ${pyRepr(getList(ex, "application_services").map((s) => get(s, "name")))}; module_path: ${S(get(ex, "module_path"))}`));
  }
  return L.join("\n") + "\n";
}

function repoLine(repo) {
  const h = repo.hint;
  return `repo: language=${S(repo.language)} framework=${S(repo.framework)} orm=${S(repo.orm)} bus=${S(repo.bus)} ` +
    `tests=${S(repo.test_framework)} src_dirs=${pyRepr(repo.src_dirs)} (evidence: ${repo.evidence.join(", ") || "none — no source detected"})` +
    (h ? ` · stack named in ${S(h.source)}: ${S(h.language)}` + (truthy(h.framework) ? `/${S(h.framework)}` : "") +
      (truthy(h.others) ? ` (also mentions ${h.others.join(", ")})` : "") + " — counts as an instruction (medium confidence)"
      : " · no stack named in README / manifest / understand constraints");
}

function renderIndex(ws, briefs, repo, paths) {
  const m = ws.manifest;
  const [notes, qas] = systemFacts(ws, briefs);
  const pre = path.join(ws.ddd_dir, "08-code", ".prefill");
  const L = [
    `# ddd-code pre-fill — ${S(get(m, "title") || get(m, "project") || ws.ddd_dir)}`,
    wrap(`workspace \`${ws.ddd_dir}\` · mode ${S(get(m, "mode"))} · depth ${S(get(m, "depth"))} · scale_target ${pyDumps(get(m, "scale_target"))}`),
    wrap(repoLine(repo)),
  ];
  if (ws.missing.length) L.push(wrap(`**Missing upstream artifacts:** ${ws.missing.join(", ")} — follow modes.md §0.`));
  L.push(wrap(`Briefs: \`${pre}/<context>.md\` — read one at a time, core first. \`--context <id>\` regenerates one (\`--print\` echoes it); ` +
    "`--format json` prints the facts. ddd code check removes the folder once the deliverable passes."));
  L.push("");
  L.push("| context | type | pattern | deployable | cmds/evs/aggs | edges in/out | warn | brief |");
  L.push("|---|---|---|---|---|---|---|---|");
  const order = briefs.map((b, i) => [b, i]).sort((x, y) => {
    const rx = -(TYPE_RANK[x[0].resolved.type] ?? -1);
    const ry = -(TYPE_RANK[y[0].resolved.type] ?? -1);
    return rx - ry || x[1] - y[1];
  }).map(([b]) => b);
  for (const b of order) {
    const r = b.resolved;
    const dep = b.deployable ?? {};
    const [, size] = paths.get(b.context) ?? ["", 0];
    L.push(`| \`${S(b.context)}\` | ${S(r.type)} | ${S(r.implementation_pattern)}${r.pattern_mixed ? " (mixed)" : ""} | ` +
      `\`${S(get(dep, "id"))}\`${b.hosted_by.length ? " +" + b.hosted_by.map(S).join(",") : ""} | ${b.commands.length}/${b.events.length}/${b.aggregate_candidates.length} | ` +
      `${b.inbound.length}/${b.outbound.length} | ${b.warnings.length || "-"} | ${pyFixed(size / 1000, 1)} KB${size > BRIEF_BUDGET ? " (!)" : ""} |`);
  }
  const warnSet = new Set();
  for (const b of briefs) for (const e of [...b.inbound, ...b.outbound]) if (e.conflict) warnSet.add(JSON.stringify([e.from, e.to, e.id]));
  const nWarn = warnSet.size;
  L.push("");
  L.push(wrap(nWarn ? `${nWarn} edge(s) in-process across deployables (see the briefs' Warnings).`
    : "No edge is in-process across deployables — transports need no ddd-connect fix."));
  if (notes.length) {
    L.push("Upstream notes addressed to ddd-code that name no single context:");
    for (const n of notes) L.push(wrap(`- [${S(n.step)} ${S(get(n, "id"))}] (${S(get(n, "kind") ?? "other")}) ${S(get(n, "text"))}`));
  }
  if (qas.length) {
    L.push("System-wide quality attributes:");
    for (const q of qas) L.push(wrap(`- ${S(get(q, "attribute"))} (${S(get(q, "priority"))}): ${S(get(q, "requirement"))}`));
  }
  return L.join("\n") + "\n";
}

// Writes one brief per context; a full run first clears stale briefs so a context
// that no longer exists leaves no orphan behind. Returns Map<context, [path, bytes]>.
function writeBriefs(ws, briefs, repo, only = null) {
  const pre = path.join(ws.ddd_dir, "08-code", ".prefill");
  fs.mkdirSync(pre, { recursive: true });
  if (!truthy(only)) {
    for (const fn of fs.readdirSync(pre)) {
      if (fn.endsWith(".md")) fs.rmSync(path.join(pre, fn), { force: true });
    }
  }
  const paths = new Map();
  for (const b of briefs) {
    const text = renderBrief(ws, b, repo);
    const p = path.join(pre, `${S(b.context)}.md`);
    fs.writeFileSync(p, text);
    paths.set(b.context, [p, Buffer.byteLength(text, "utf8")]);
  }
  return paths;
}

function edgesText(edges, side) {
  const arrow = side === "from" ? "from" : "→";
  return edges.map((e) => `${S(e.id)} ${arrow} ${S(e[side])} via ${e.via || "?"}`).join("; ");
}

// ---------- skeleton code.json ----------
function buildSkeleton(ws, briefs, repo, args) {
  const m = ws.manifest;
  const rel = ws.rel;
  const A = ws.A;
  const org = A.organise ?? {};
  const dfn = A.define ?? {};
  const externals = new Set(getList(A.discover ?? {}, "external_systems").map((x) => get(x, "id")));
  for (const p of getList(A.connect ?? {}, "parties")) if (get(p, "kind") === "external-system") externals.add(get(p, "id"));
  const hint = repo.hint ?? {};
  const prevCode = A.code ?? {};
  // No default language. A guess here does not stay a guess: it becomes every module path, port
  // name and test name in the artifact, so a wrong one costs a rewrite rather than an edit.
  // "undecided" keeps the paths neutral (src/<context>) and turns it into a blocking question.
  const language = args.language || repo.language || get(prevCode, "language") || get(hint, "language") || "undecided";
  const framework = args.framework || repo.framework || get(prevCode, "framework") || (!truthy(repo.language) ? get(hint, "framework") : null) || "none";
  const db = args.db || repo.orm || "postgres";
  const bus = pascal(repo.bus || "MessageBus");
  const multi = getList(org, "deployables").length > 1;
  const assumptions = [...getList(prevCode, "assumptions")];
  const questions = [...getList(prevCode, "open_questions")];
  let nA = assumptions.length;

  function assume(text, conf) {
    if (assumptions.some((x) => get(x, "text") === text)) return;
    nA += 1;
    assumptions.push({ id: `A${nA}`, text, confidence: conf });
  }

  function ask(text, blocking, owner) {
    if (questions.some((x) => get(x, "text") === text)) return;
    let n = questions.length + 1;
    while (questions.some((x) => get(x, "id") === `Q${n}`)) n += 1;
    questions.push({ id: `Q${n}`, text, blocking, owner });
  }

  if (!truthy(repo.language) && !truthy(args.language) && !truthy(get(prevCode, "language"))) {
    if (truthy(get(hint, "language"))) {
      assume(`No source code detected in ${ws.project_root}; language ${language} (framework ${framework}) taken from ${S(hint.source)}, which names it`, "medium");
    } else {
      assume(`No source code detected in ${ws.project_root} and no stack named in README / manifest / ` +
        "understand constraints; language left 'undecided' and module paths kept neutral rather than " +
        "inferred, because a language is baked into every path in this artifact", "high");
      ask("Name the implementation language, framework and persistence. Nothing upstream states them and " +
        "they were deliberately not inferred: every module path, port name and test name in this plan " +
        "depends on the answer", true, "tech lead");
    }
  }
  if (!truthy(repo.orm) && !truthy(args.db)) assume(`Persistence not detected; adapters assume ${db}`, "low");
  if (language === "undecided") {
    assume(`Module paths are language-neutral (src/<context>) until the language is named (${multi ? "multi-deployable" : "single deployable"} layout)`, "high");
  } else {
    assume(`Module paths follow the ${language} default convention from references/lang-${language === "java" || language === "kotlin" ? "java-kotlin" : language}.md (${multi ? "multi-deployable" : "single deployable"} layout)`, "medium");
  }

  const consumerAdapter = (via, Ctx) => ({ "in-process": `InProcess${Ctx}EventConsumer`, "message-bus": `${bus}${Ctx}EventConsumer` })[via] ?? `${pascal(via)}${Ctx}EventConsumer`;
  const publisherAdapter = (via) => ({ "in-process": "InProcessEventPublisher", "message-bus": `${bus}EventPublisher` })[via] ?? `${pascal(via)}EventPublisher`;

  const canvasPayloads = new Map();
  for (const c of getList(dfn, "canvases")) {
    for (const entry of getList(c, "outbound")) {
      for (const msg of getList(entry, "messages")) {
        const k = JSON.stringify([get(c, "context"), get(msg, "id")]);
        if (truthy(get(msg, "payload")) && !canvasPayloads.has(k)) canvasPayloads.set(k, msg.payload);
      }
    }
  }

  const contexts = [];
  const existingCtx = new Map(getList(prevCode, "contexts").map((c) => [get(c, "context"), c]));
  // never re-propose what a run dropped
  const dropped = new Set(getList(prevCode, "deprecated").map((x) => JSON.stringify([get(x, "collection"), get(x, "id")])));
  const isDropped = (coll, id) => dropped.has(JSON.stringify([coll, id]));
  for (const b of briefs) {
    const cid = b.context;
    const Ctx = pascal(cid);
    const r = b.resolved;
    const pattern = r.implementation_pattern || "transaction-script";
    if (r.pattern_mixed) assume(`Context '${S(cid)}' spans subdomains with different implementation patterns; the most demanding (${pattern}) was chosen for the whole context`, "medium");
    if (!truthy(r.implementation_pattern)) assume(`Context '${S(cid)}' has no implementation pattern in strategize; assumed transaction-script`, "low");
    const depId = get(b.deployable ?? {}, "id");
    if (!truthy(depId)) assume(`Context '${S(cid)}' is not placed in any deployable by organise; module path assumes a single deployable`, "low");
    const prev = (existingCtx.has(cid) ? existingCtx.get(cid) : null) ?? {};
    const prevSvcAll = new Map(getList(prev, "application_services").map((x) => [get(x, "command"), x]));
    let modulePath;
    if (b.hosted_by.length) {
      modulePath = get(prev, "module_path") || sharedPackagePath(language, get(m, "project"), cid);
      assume(`'${S(cid)}' runtime is also hosted by ${b.hosted_by.map(S).join(", ")} (organise hosts_runtime_of): module_path is the shared domain package '${modulePath}', deployable stays '${S(depId)}' (contract §4.8)`, "medium");
    } else {
      modulePath = get(prev, "module_path") || suggestModulePath(language, get(m, "project"), cid, depId, multi);
    }
    const aggregates = [];
    if (r.needs_aggregates) {
      const prevAggs = new Map(getList(prev, "aggregates").map((a) => [get(a, "id"), a]));
      for (const a of b.aggregate_candidates) {
        if (isDropped("aggregate_candidates", a.id)) continue;
        const pa = prevAggs.get(a.id) ?? {};
        aggregates.push({
          id: a.id, name: get(pa, "name") || a.name, root_entity: get(pa, "root_entity") || a.root,
          entities: getList(pa, "entities"), value_objects: getList(pa, "value_objects"),
          invariants: getList(pa, "invariants"), commands: a.handles, events: a.emits,
          state_transitions: getList(pa, "state_transitions"),
          canvas_path: `${rel}/08-code/${S(cid)}/aggregate-canvas-${S(a.id)}.md`,
        });
      }
      const handledBy = (id) => get(prevSvcAll.get(id) ?? {}, "handled_by");
      const unhandled = b.commands.filter((c) => !aggregates.some((a) => a.commands.includes(c.id)) && !truthy(handledBy(c.id))).map((c) => c.id);
      if (!aggregates.length && b.commands.length && b.commands.every((c) => truthy(handledBy(c.id)))) {
        ask(`'${S(cid)}' is a ${pattern} context but every owned command is handled by a transaction script (upstream decision) — ask ddd-strategize whether the pattern should change`, false, "ddd-strategize");
      } else if (!aggregates.length) {
        ask(`'${S(cid)}' is a ${pattern} context but discover has no aggregate candidate for it — name the aggregate after the noun its commands act on`, true, "ddd-code");
      } else if (unhandled.length) {
        ask(`Commands ${pyRepr(unhandled)} in '${S(cid)}' are handled by no aggregate candidate — assign them to an aggregate, or record each as an application service with handled_by: "transaction-script" when an upstream decision note vetoes an aggregate (contract §4.8)`, false, "ddd-code");
      }
    }
    const prevSvc = new Map(getList(prev, "application_services").map((x) => [get(x, "command"), x]));
    let services = b.commands.map((c) => (prevSvc.has(c.id) ? prevSvc.get(c.id) : {
      name: pascal(c.id), command: c.id,
      description: c.description || `${c.name || pascal(c.id)} (${truthy(c.actor) ? "actor: " + S(c.actor_name || c.actor) : "policy-triggered"}) → emits ${c.produces.map(S).join(", ") || "nothing"}`,
    }));
    const cmdIds = new Set(b.commands.map((c) => c.id));
    services = services.concat(getList(prev, "application_services").filter((x) => !cmdIds.has(get(x, "command"))));
    const evIn = b.event_edges.in;
    const evOut = b.event_edges.out;
    const humanCmds = b.commands.filter((c) => truthy(c.actor) && !c.actor_is_external);
    let cmdVias = [...b.command_vias];
    if (humanCmds.length && !cmdVias.length) {
      cmdVias = ["http"];
      assume(`'${S(cid)}' commands from ${uniq(humanCmds.map((c) => c.actor_name || c.actor)).map(S).join(", ")} enter over HTTP — no flow step names a transport`, "medium");
    }
    let ports = [];
    let adapters = [];
    const implementations = () => new Set(adapters.map((a) => a.implementation));
    if (services.length) {
      const actorsHere = uniq(b.commands.filter((c) => truthy(c.actor)).map((c) => c.actor_name || c.actor));
      ports.push({ name: `${Ctx}Commands`, kind: "driving", description: `use cases ${services.map((s) => S(get(s, "name"))).join(", ")}; driven by ${actorsHere.map(S).join(", ") || "policies"} via ${cmdVias.map(S).join(", ") || "policies only"}` });
      if (cmdVias.includes("http")) adapters.push({ port: `${Ctx}Commands`, implementation: `Http${Ctx}Controller` });
      if (cmdVias.includes("grpc")) adapters.push({ port: `${Ctx}Commands`, implementation: `Grpc${Ctx}Service` });
    }
    if (b.read_models.length) {
      ports.push({ name: `${Ctx}Queries`, kind: "driving", description: `read models ${b.read_models.map((x) => pascal(x.id)).join(", ")}` });
      if (cmdVias.includes("http")) adapters.push({ port: `${Ctx}Queries`, implementation: `Http${Ctx}QueryController` });
    }
    if (evIn.length) {
      const viasIn = uniq(evIn.map((e) => e.via || "message-bus"));
      ports.push({
        name: `${Ctx}EventHandlers`, kind: "driving",
        description: `reacts to ${uniq(evIn.map((e) => e.id)).map(S).join(", ")} (policies ${b.policies.reacts_here.map((p) => S(p.id)).join(", ") || "-"}); ` +
          `transports: ${edgesText(evIn, "from")}`,
      });
      for (const via of viasIn) adapters.push({ port: `${Ctx}EventHandlers`, implementation: consumerAdapter(via, Ctx) });
      for (const e of evIn) {
        if (e.conflict) {
          assume(`'${S(cid)}' consumes '${S(e.id)}' from '${S(e.from)}' in-process (${S(e.via_basis)}) although they sit in different deployables; the consumer adapter assumes a message bus`, "medium");
          ask(`Edge ${S(e.from)} → ${S(cid)} '${S(e.id)}' is in-process across deployables — ddd-connect should decide the transport (bus/HTTP)`, false, "ddd-connect");
          if (!implementations().has(`${bus}${Ctx}EventConsumer`)) adapters.push({ port: `${Ctx}EventHandlers`, implementation: `${bus}${Ctx}EventConsumer` });
        }
      }
    }
    for (const ext of b.external_systems.calling) {
      ports.push({ name: `${Ctx}Callbacks`, kind: "driving", description: `commands/events initiated by ${S(ext.name || ext.id)} (webhooks); responses to our own calls are not callbacks` });
      adapters.push({ port: `${Ctx}Callbacks`, implementation: `${pascal(ext.id)}WebhookHandler` });
    }
    for (const a of aggregates) {
      const root = a.root_entity;
      ports.push({ name: `${S(root)}Repository`, kind: "driven", description: `load/save ${S(a.name)} by id; optimistic concurrency` + (pattern === "event-sourced-domain-model" ? "; event stream per instance" : "") });
      adapters.push({ port: `${S(root)}Repository`, implementation: `InMemory${S(root)}Repository` });
      adapters.push({ port: `${S(root)}Repository`, implementation: `${pattern === "event-sourced-domain-model" ? "EventStore" : pascal(db)}${S(root)}Repository` });
    }
    if (!r.needs_aggregates && services.length) {
      ports.push({ name: `${Ctx}Store`, kind: "driven", description: `data access for the ${pattern} use cases (tables/records of this context only)` });
      adapters.push({ port: `${Ctx}Store`, implementation: `InMemory${Ctx}Store` });
      adapters.push({ port: `${Ctx}Store`, implementation: `${pascal(db)}${Ctx}Store` });
    }
    if (evOut.length || b.policies.feeds_elsewhere.length) {
      const evIds = uniq([...evOut.map((e) => e.id), ...b.policies.feeds_elsewhere.map((p) => p.when)]);
      const deliveries = uniq(evOut.filter((e) => truthy(get(e, "delivery"))).map((e) => get(e, "delivery")));
      ports.push({
        name: "EventPublisher", kind: "driven",
        description: `publishes ${evIds.map(S).join(", ")} (delivery: ${deliveries.map(S).join(", ") || "unspecified"}); ` +
          `edges: ${edgesText(evOut, "to") || "policies elsewhere"}`,
      });
      adapters.push({ port: "EventPublisher", implementation: "InMemoryEventPublisher" });
      const viasOut = uniq(evOut.map((e) => e.via || "message-bus"));
      for (const via of viasOut.length ? viasOut : ["in-process"]) adapters.push({ port: "EventPublisher", implementation: publisherAdapter(via) });
      for (const e of evOut) {
        if (e.conflict) {
          assume(`'${S(cid)}' publishes '${S(e.id)}' to '${S(e.to)}' in-process (${S(e.via_basis)}) although they sit in different deployables; the publisher adapter assumes a message bus`, "medium");
          ask(`Edge ${S(cid)} → ${S(e.to)} '${S(e.id)}' is in-process across deployables — ddd-connect should decide the transport (bus/HTTP)`, false, "ddd-connect");
          if (!implementations().has(`${bus}EventPublisher`)) adapters.push({ port: "EventPublisher", implementation: `${bus}EventPublisher` });
        }
      }
    }
    for (const ext of b.external_systems.called) {
      ports.push({ name: `${pascal(ext.id)}Gateway`, kind: "driven", description: `anti-corruption layer to ${S(ext.name || ext.id)} — rename by purpose (e.g. PaymentGateway); translate their model to ours here`, _ext: [ext.id, ext.name || ext.id] });
      adapters.push({ port: `${pascal(ext.id)}Gateway`, implementation: `Fake${pascal(ext.id)}Gateway` });
      adapters.push({ port: `${pascal(ext.id)}Gateway`, implementation: `Http${pascal(ext.id)}Gateway` });
    }
    for (const other of uniq(b.queries_asked.filter((e) => !externals.has(e.to)).map((e) => e.to))) {
      const qs = b.queries_asked.filter((e) => e.to === other);
      const via = qs[0].via || "http";
      ports.push({ name: `${pascal(other)}Gateway`, kind: "driven", description: `asks ${S(other)} for ${uniq(qs.map((q) => q.id)).map(S).join(", ")} (sync query via ${S(via)}) — ACL: translate their answer into our terms; rename by purpose`, _ext: [other] });
      adapters.push({ port: `${pascal(other)}Gateway`, implementation: `Fake${pascal(other)}Gateway` });
      adapters.push({ port: `${pascal(other)}Gateway`, implementation: `${via === "in-process" ? "InProcess" : pascal(via)}${pascal(other)}Gateway` });
    }
    const tests = [...getList(prev, "tests")];
    const have = new Set(tests.map((t) => get(t, "invariant")));
    for (const eid of uniq(evOut.map((e) => e.id))) {
      if (have.has(`contract: ${S(eid)}`)) continue;
      let payload = evOut.find((e) => e.id === eid && truthy(e.payload))?.payload ?? null;
      let src = "connect.json";
      const ck = JSON.stringify([cid, eid]);
      if (!truthy(payload) && truthy(canvasPayloads.get(ck))) {
        payload = canvasPayloads.get(ck);
        src = `the ${S(cid)} canvas`;
      }
      if (truthy(payload)) {
        tests.push({ invariant: `contract: ${S(eid)}`, test: `published ${S(eid)} carries exactly ${payload.map(S).join(", ")} (${src} payload) and nothing consumers did not ask for` });
      } else {
        tests.push({ invariant: `contract: ${S(eid)}`, test: `published ${S(eid)} — payload: TBD — ask ddd-connect (no message row in connect.json and no payload on the ${S(cid)} canvas)` });
        ask(`Payload of '${S(eid)}' published by '${S(cid)}' is in neither connect.json nor the canvas — ask ddd-connect to add the message row`, false, "ddd-connect");
      }
    }
    for (const e of evIn) {
      const d = get(e, "delivery");
      if ((d === "at-least-once" || d === null) && !have.has(`idempotent: ${S(e.id)}`)) {
        tests.push({ invariant: `idempotent: ${S(e.id)}`, test: `handling ${S(e.id)} twice (same message id) has the same effect as once` });
        have.add(`idempotent: ${S(e.id)}`);
      }
    }
    // re-run merge: previously designed ports/adapters/read models win; generated ones fill the gaps
    const portNames = new Set(getList(prev, "ports").map((p) => get(p, "name")));
    const prevDesc = getList(prev, "ports").filter((p) => get(p, "kind") === "driven").map((p) => (S(get(p, "name") ?? "") + " " + S(get(p, "description") ?? "")).toLowerCase()).join(" ");
    ports = [...getList(prev, "ports"), ...ports.filter((p) => !portNames.has(p.name) && !isDropped("ports", p.name) &&
      !(truthy(p._ext) && p._ext.some((x) => prevDesc.includes(pyStr(x).toLowerCase()))))];
    for (const p of ports) delete p._ext;
    const knownPorts = new Set(ports.map((p) => get(p, "name")));
    const pairs = new Set(getList(prev, "adapters").map((a) => JSON.stringify([get(a, "port"), get(a, "implementation")])));
    adapters = [...getList(prev, "adapters"), ...adapters.filter((a) => !pairs.has(JSON.stringify([a.port, a.implementation])) && knownPorts.has(a.port) &&
      !isDropped("adapters", a.implementation))];
    const prevRm = new Map(getList(prev, "read_models").map((x) => [get(x, "name"), x]));
    const rmNames = new Set(b.read_models.map((x) => pascal(x.id)));
    let readModels = b.read_models.filter((x) => !isDropped("read_models", pascal(x.id)))
      .map((x) => (prevRm.has(pascal(x.id)) ? prevRm.get(pascal(x.id)) : { name: pascal(x.id), source_events: [] }));
    readModels = readModels.concat([...prevRm.entries()].filter(([n]) => !rmNames.has(n)).map(([, x]) => x));
    const ctx = {
      context: cid, implementation_pattern: pattern, deployable: depId || "", module_path: modulePath,
      aggregates, domain_services: getList(prev, "domain_services"),
      application_services: services, ports, adapters,
      read_models: readModels,
      tests, design_path: `${rel}/08-code/${S(cid)}/design.md`,
    };
    if (b.hosted_by.length) ctx.also_compiled_into = pyOrList(get(prev, "also_compiled_into"), b.hosted_by);
    contexts.push(ctx);
  }
  const roots = uniq(contexts.map((c) => pyStr(c.module_path).split("/")[0] + "/"));
  const style = contexts.some((c) => AGG_PATTERNS.includes(c.implementation_pattern)) ? "hexagonal" : "vertical-slice";
  return {
    schema_version: 1, step: "code", produced_by: "ddd-code", produced_at: nowIso(),
    mode: args.mode || get(m, "mode") || "auto", depth: get(m, "depth") || "standard",
    inputs: [...ws.inputs, ...(Object.prototype.hasOwnProperty.call(ws.docs, get(hint, "source")) && !truthy(repo.language) ? [hint.source] : [])],
    assumptions, open_questions: questions,
    language, framework, architecture_style: get(prevCode, "architecture_style") || style,
    contexts,
    coined_terms: getList(prevCode, "coined_terms"),
    scaffold: pyOrDict(get(prevCode, "scaffold"), { generated: false, root: roots.length === 1 ? roots[0] : "", files: [] }),
    handoff: {
      plan_path: `${rel}/08-code/implementation-plan.md`,
      suggested_next: ["superpowers:writing-plans", "dev-create-plan", "superpowers:test-driven-development"],
    },
    deprecated: getList(prevCode, "deprecated"),
  };
}

// `a or b` where a is a JSON list / dict: empty ones are falsy in Python.
function pyOrList(a, b) {
  return Array.isArray(a) && a.length ? a : b;
}

function pyOrDict(a, b) {
  return truthy(a) ? a : b;
}

// ---------- main ----------
const SPEC = {
  usage: "ddd code prefill [ddd_dir] [--context ID] [--format {md,json}] [--print] [--detect] [--skeleton] [--language L] [--framework F] [--db D] [--mode {auto,interactive}] [--out PATH]",
  description: "deterministic per-context briefs for ddd-code, pulled from the upstream artifacts",
  options: {
    "--context": { dest: "context", help: "one bounded context id" },
    "--format": { dest: "format", choices: ["md", "json"], default: "md" },
    "--print": { dest: "print", action: "store_true", help: "echo the written brief(s) to stdout" },
    "--detect": { dest: "detect", action: "store_true" },
    "--skeleton": { dest: "skeleton", action: "store_true" },
    "--language": { dest: "language" },
    "--framework": { dest: "framework" },
    "--db": { dest: "db" },
    "--mode": { dest: "mode", choices: ["auto", "interactive"] },
    "--out": { dest: "out" },
  },
  positional: { dest: "ddd_dir", default: "ddd" },
};

export async function main(argv) {
  const out = (s) => process.stdout.write(s);
  const err = (s) => process.stderr.write(s);
  let a;
  try {
    a = parseArgs(SPEC, argv);
  } catch (e) {
    if (e instanceof ArgError) {
      err(`usage: ${SPEC.usage}\nddd code prefill: error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (a.help) {
    out(helpText(SPEC));
    return 0;
  }
  if (!isDir(a.ddd_dir)) {
    err(`error: ${a.ddd_dir} is not a directory\n`);
    return 2;
  }
  const ws = loadWorkspace(a.ddd_dir);
  const repo = detectRepo(ws.project_root);
  repo.hint = hintStack(ws);
  let text;
  if (a.detect) {
    text = pyDumps(repo, { indent: 2 }) + "\n";
  } else {
    const needed = ["discover", "decompose"].filter((s) => !(s in ws.A));
    if (needed.length) {
      err(`error: cannot pre-fill without ${needed.join(", ")}.json — run those steps first (modes.md §0)\n`);
      return 2;
    }
    const briefs = buildBriefs(ws, a.context);
    if (truthy(a.context) && !briefs.length) {
      err(`error: no bounded context '${a.context}' in decompose.json\n`);
      return 2;
    }
    if (a.skeleton) {
      text = pyDumps(buildSkeleton(ws, briefs, repo, a), { indent: 2 }) + "\n";
    } else if (a.format === "json") {
      const [notes, qas] = systemFacts(ws, briefs);
      text = pyDumps({
        workspace: ws.ddd_dir, manifest: ws.manifest, missing_upstream: ws.missing,
        repo, system_notes_for_code: notes, system_quality_attributes: qas, contexts: briefs,
      }, { indent: 2 }) + "\n";
    } else {
      const paths = writeBriefs(ws, briefs, repo, a.context);
      if (truthy(a.context)) {
        const [p, size] = paths.get(a.context);
        text = `wrote ${p} (${pyFixed(size / 1000, 1)} KB)\n`;
      } else {
        text = renderIndex(ws, briefs, repo, paths);
      }
      if (a.print) {
        for (const [p] of paths.values()) text += fs.readFileSync(p, "utf8");
      }
    }
  }
  if (truthy(a.out)) {
    const abs = path.resolve(a.out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(a.out, text);
    out(`wrote ${abs}\n`);
  } else {
    out(text);
  }
  return 0;
}
