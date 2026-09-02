// `ddd contracts render [dir]`: write 09-contracts/contracts.md from contracts.json.
//
// Port of contracts.py `cmd_render`. Per context: publishes / calls out / accepts from
// clients / receives from external systems (each in full), plus what it consumes (linked
// to the section that holds the contract). The file carries a generated marker with a
// hash of entries[] (+ plain_words) that `check` verifies, so the summary a human reads
// can never drift from the JSON. Never hand-write it.
//
// Exit 0 ok, 2 usage/IO (contracts.json missing or corrupt, directory missing).
import fs from "node:fs";
import path from "node:path";
import {
  IoError, asDict, asList, channelLines, channelNames, crossParty, entriesHash, exists, get, has,
  isDict, loadJson, loadJsonOrNull, loadWorkspace, or, partySets, plainWordsBlock, pyDumps, pyStr,
  relPrefix, resolvePath, runVerb, slug, sorted, sortedEntries, titlecase, truthy,
} from "./lib.mjs";

const USAGE = "[ddd_dir]";

const GROUPS = [["publishes", "Publishes"], ["calls", "Calls out to external systems"],
  ["clients", "Accepts from clients"], ["externals", "Receives from external systems"]];

function typeStr(sub) {
  if (!isDict(sub)) return "any";
  const t = get(sub, "type");
  let s = Array.isArray(t) ? t.map(pyStr).join(" | ") : or(t, "any");
  s = pyStr(s);
  if (s === "array" && isDict(get(sub, "items"))) {
    const it = sub.items;
    s = `array of ${pyStr(or(get(it, "type"), "any"))}`;
    if (truthy(get(it, "format"))) s += ` (${pyStr(it.format)})`;
  } else if (truthy(get(sub, "format"))) {
    s += ` (${pyStr(sub.format)})`;
  }
  if (has(sub, "enum")) s += " — one of " + asList(sub.enum).map((v) => `\`${pyStr(v)}\``).join(", ");
  return s;
}

function payloadRows(schema, prefix = "") {
  const rows = [];
  const props = asDict(get(asDict(schema), "properties"));
  const required = new Set(asList(get(asDict(schema), "required")));
  for (const [name, sub] of Object.entries(props)) {
    const label = `${prefix}${name}`;
    const desc = isDict(sub) ? pyStr(or(get(sub, "description"), "")).replace(/\|/g, "\\|").replace(/\n/g, " ") : "";
    rows.push([label, typeStr(sub), required.has(name) ? "yes" : "no", desc]);
    if (isDict(sub)) {
      if (get(sub, "type") === "object" && truthy(get(sub, "properties"))) rows.push(...payloadRows(sub, `${label}.`));
      const items = get(sub, "items");
      if (get(sub, "type") === "array" && isDict(items) && truthy(get(items, "properties"))) rows.push(...payloadRows(items, `${label}[].`));
    }
  }
  return rows;
}

const joinIds = (xs) => asList(xs).map(pyStr).join(", ");

// `travel-times` is produced by dispatch and "consumed by" Google Maps only in connect's
// bookkeeping sense: it is a call we make. Say so.
function routeLine(e, producer) {
  const to = joinIds(get(e, "consumers"));
  let lead;
  if (get(e, "direction") === "outbound") lead = `called by ${pyStr(producer)} → ${to}`;
  else if (get(e, "direction") === "inbound") lead = `received by ${to} ← ${pyStr(producer)}`;
  else if (truthy(get(e, "client"))) lead = producer === get(e, "client") ? `sent by client ${pyStr(producer)} → ${to}` : `${pyStr(producer)} → client ${to}`;
  else lead = `${pyStr(producer)} → ${to}`;
  const also = truthy(get(e, "channels")) ? `, also via ${channelLines(e.channels)}` : "";
  return `- ${lead} · ${pyStr(get(e, "pattern"))} · ${pyStr(get(e, "delivery"))} via ${pyStr(get(e, "via"))}${also}`;
}

function entryBody(e, producer, dddDir, manifest) {
  const L = [];
  const status = get(e, "entityStatus", "Draft");
  L.push(`#### ${pyStr(get(e, "name"))} (\`${pyStr(get(e, "id"))}\`) — ${pyStr(get(e, "kind"))} v${pyStr(get(e, "version"))}, ${pyStr(status)}`);
  L.push("");
  L.push(pyStr(get(e, "description", "")));
  if (truthy(get(e, "inherited"))) {
    L.push("");
    L.push(`_Inherited contract: ${joinIds(get(e, "owners"))} owns the wire format ` +
      `(${pyStr(get(e, "pattern"))}); this schema is our view of the message at the ACL boundary` +
      (get(e, "direction") === "outbound" ? " — what we send." : ".") + "_");
  }
  L.push("");
  L.push(routeLine(e, producer));
  L.push(`- owners: ${joinIds(get(e, "owners"))} · reviewers: ${joinIds(get(e, "reviewers"))}` +
    (truthy(get(e, "client")) ? ` · client: ${pyStr(e.client)}` : "") +
    (truthy(get(e, "glossary")) ? ` · glossary: ${pyStr(e.glossary)}` : ""));
  L.push(`- schema: \`${pyStr(get(e, "schema"))}\` · example: \`${pyStr(get(e, "example"))}\``);
  const sp = resolvePath(get(e, "schema"), dddDir, manifest);
  let schema = null;
  if (sp && exists(sp)) schema = loadJsonOrNull(sp);
  if (isDict(schema)) {
    const closed = get(schema, "additionalProperties") === false ? ", closed (`additionalProperties: false`)" : "";
    L.push("");
    L.push(`Payload (JSON Schema 2020-12${closed}):`);
    L.push("");
    L.push("| Field | Type | Required | Description |");
    L.push("|---|---|---|---|");
    const rows = payloadRows(schema);
    if (rows.length) for (const r of rows) L.push("| " + r.join(" | ") + " |");
    else L.push("| _(no payload fields)_ | | | |");
  }
  const ep = resolvePath(get(e, "example"), dddDir, manifest);
  if (ep && exists(ep)) {
    let example;
    let ok = true;
    try { example = loadJson(ep); } catch { ok = false; }
    if (ok) {
      L.push("");
      L.push("Example:");
      L.push("");
      L.push("```json");
      L.push(pyDumps(example, { indent: 2, ensureAscii: false }));
      L.push("```");
    }
  }
  const sem = or(get(e, "semantics"), []);
  if (truthy(sem)) {
    L.push("");
    L.push("Semantics:");
    L.push("");
    for (const s of asList(sem)) L.push(`- ${pyStr(s)}`);
  }
  if (truthy(get(e, "termsOfUse"))) {
    L.push("");
    L.push(`Terms of use: ${pyStr(e.termsOfUse)}`);
  }
  L.push("");
  return L;
}

export function cmdRender(a, dddDir, print) {
  const A = loadWorkspace(dddDir);
  const manifest = asDict(get(A, "manifest"));
  const rel = relPrefix(A, dddDir);
  const outDir = path.join(dddDir, "09-contracts");
  const cpath = path.join(outDir, "contracts.json");
  if (!exists(cpath)) throw new IoError(`error: ${cpath} not found — run ddd contracts prefill first`);
  let doc;
  try {
    doc = loadJson(cpath);
  } catch (e) {
    throw new IoError(`error: invalid JSON in ${cpath}: ${e.message}`);
  }
  const rawEntries = get(doc, "entries", []);
  const entries = asList(or(rawEntries, [])).filter(isDict);
  const { xp, inproc } = crossParty(A);
  const { contexts, names, externals, actors } = partySets(A);
  const ctxSet = new Set(contexts);
  const producerOf = new Map();
  for (const e of entries) {
    const mid = or(get(asDict(get(e, "provenance")), "connect"), get(e, "id"));
    producerOf.set(get(e, "id"), or(get(asDict(xp.get(mid)), "producer"), get(e, "domain")));
  }
  const extra = new Set(entries.map((e) => get(e, "domain")));
  for (const c of ctxSet) extra.delete(c);
  extra.delete(null);
  const ordered = [...contexts, ...sorted(extra)];
  // pass 1: where does each contract's full body live? (so a back-link never points at a
  // section that does not exist, and a human producer is not filed under "external systems")
  const place = new Map();
  for (const e of entries) {
    const eid = get(e, "id");
    const p = producerOf.get(eid) ?? null;
    const dom = get(e, "domain");
    const home = ctxSet.has(dom) ? dom : null;
    if (ctxSet.has(p)) place.set(eid, [p, get(e, "direction") === "outbound" ? "calls" : "publishes"]);
    else if (actors.has(p)) place.set(eid, [home, "clients"]);
    else if (externals.has(p)) place.set(eid, [home, "externals"]);
    else place.set(eid, [home, "publishes"]);
  }
  const byCtx = new Map(ordered.map((ctx) => [ctx, Object.fromEntries(GROUPS.map(([g]) => [g, []]))]));
  for (const e of entries) {
    const [ctx, grp] = place.get(get(e, "id")) ?? [null, "publishes"];
    if (byCtx.has(ctx)) byCtx.get(ctx)[grp].push(e);
  }
  const homeOf = (e) => (place.get(get(e, "id")) ?? [null])[0];
  const consumed = new Map(ordered.map((ctx) => [ctx,
    entries.filter((e) => asList(get(e, "consumers")).includes(ctx) && homeOf(e) !== ctx)]));
  const haveSection = new Set(ordered.filter((ctx) => Object.values(byCtx.get(ctx)).some((g) => g.length) || consumed.get(ctx).length));
  const title = or(get(manifest, "title"), or(get(manifest, "project"), "system"));
  const h = entriesHash(rawEntries, get(doc, "plain_words"));
  const L = [`# Message contracts — ${pyStr(title)}`, "",
    `<!-- generated by ddd contracts render from ${rel}/09-contracts/contracts.json ` +
    `entries-sha256: ${h} — do not edit by hand; edit contracts.json and re-run render -->`, "",
    "Every message that crosses a party boundary, with its payload schema, a validated example, an " +
    "owner and the business rules that hold for it. Per context: what it publishes, what it calls " +
    "out to, what it accepts from clients, what it receives from external systems (all in full), " +
    "and what it consumes (linked to the section that holds the contract).", "",
    "| Contract | Kind | Producer → consumers | Delivery | Version | Status |",
    "|---|---|---|---|---|---|"];
  L.splice(2, 0, ...plainWordsBlock(doc));
  const nameOf = (ctx) => (names.has(ctx) ? pyStr(names.get(ctx)) : titlecase(ctx));
  for (const e of entries) {
    const p = or(producerOf.get(get(e, "id")) ?? null, "?");
    const tags = truthy(get(e, "inherited")) ? ["inherited"] : [];
    if (get(e, "direction") === "outbound") tags.push("outbound call");
    if (truthy(get(e, "client"))) tags.push(`client: ${pyStr(e.client)}`);
    const tag = tags.length ? ` (${tags.join("; ")})` : "";
    const also = truthy(get(e, "channels")) ? ` (+ ${channelNames(e.channels)})` : "";
    L.push(`| ${pyStr(get(e, "name"))} (\`${pyStr(get(e, "id"))}\`)${tag} | ${pyStr(get(e, "kind"))} | ${pyStr(p)} → ` +
      `${joinIds(get(e, "consumers"))} | ${pyStr(get(e, "delivery"))} via ${pyStr(get(e, "via"))}${also} | ` +
      `${pyStr(get(e, "version"))} | ${pyStr(get(e, "entityStatus"))} |`);
  }
  L.push("");
  const rendered = new Set();
  for (const ctx of ordered) {
    if (!haveSection.has(ctx)) continue;
    L.push(`## ${nameOf(ctx)} context`);
    L.push("");
    for (const [grp, heading] of GROUPS) {
      const group = byCtx.get(ctx)[grp];
      if (!group.length) continue;
      L.push(`### ${heading}`);
      L.push("");
      for (const e of group) {
        L.push(...entryBody(e, or(producerOf.get(get(e, "id")) ?? null, ctx), dddDir, manifest));
        rendered.add(get(e, "id"));
      }
    }
    if (consumed.get(ctx).length) {
      L.push("### Consumes");
      L.push("");
      for (const e of consumed.get(ctx)) {
        const p = or(producerOf.get(get(e, "id")) ?? null, "?");
        const home = homeOf(e);
        let target;
        if (haveSection.has(home)) {
          const label = nameOf(home);
          target = `[${label} context](#${slug(label + " context")})`;
        } else {
          target = "[Unplaced contracts](#unplaced-contracts)";
        }
        const also = truthy(get(e, "channels")) ? `, also via ${channelNames(e.channels)}` : "";
        L.push(`- **${pyStr(get(e, "name"))}** (\`${pyStr(get(e, "id"))}\`) — ${pyStr(get(e, "kind"))} from ${pyStr(p)} ` +
          `(${pyStr(get(e, "delivery"))} via ${pyStr(get(e, "via"))}${also}); full contract under ${target}.`);
      }
      L.push("");
    }
  }
  const missing = entries.filter((e) => !rendered.has(get(e, "id")));
  if (missing.length) {
    L.push("## Unplaced contracts");
    L.push("");
    const missingIds = new Set(missing.map((e) => get(e, "id")));
    for (const e of entries) {
      if (missingIds.has(get(e, "id"))) L.push(...entryBody(e, or(producerOf.get(get(e, "id")) ?? null, "?"), dddDir, manifest));
    }
  }
  if (inproc.size) {
    L.push("## In-process calls (no wire contract)");
    L.push("");
    L.push("These messages cross a context boundary in the model but not a process boundary in the " +
      "build: ddd-organise puts the producer and every consumer in one deployable, so the call " +
      "is a function call the compiler checks. They are listed so the omission is a decision on " +
      "the record, not a gap. Cover each with a code-level test against the producing module; if " +
      "one of them really is a seam, split the deployable in ddd-organise and re-run this step.");
    L.push("");
    L.push("| Message | Producer → consumers | Deployable |");
    L.push("|---|---|---|");
    for (const [mid, i] of sortedEntries(inproc)) {
      L.push(`| \`${pyStr(mid)}\` | ${pyStr(i.producer)} → ${joinIds(i.consumers)} | \`${pyStr(i.deployable)}\` |`);
    }
    L.push("");
  }
  fs.mkdirSync(outDir, { recursive: true });
  const mdpath = path.join(outDir, "contracts.md");
  fs.writeFileSync(mdpath, L.join("\n").trimEnd() + "\n");
  const nCtx = haveSection.size;
  print(`render: wrote ${mdpath} — ${entries.length} contract(s) across ${nCtx} context section(s)` +
    (inproc.size ? `, ${inproc.size} in-process call(s) listed` : ""));
  return 0;
}

export function main(argv, ctx) {
  return runVerb({ argv, ctx, verb: "render", options: {}, usage: USAGE, body: cmdRender });
}
