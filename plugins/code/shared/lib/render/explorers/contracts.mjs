// Contract explorer: one node per cross-party message with its field tree, the
// example value beside every field, request/response halves, negative examples and
// provenance. Schemas and examples are read from the workspace (already parsed);
// nothing is inferred from the Markdown.
import { resolveRef } from "../../jsonschema.mjs";
import {
  esc, slug, chip, fold, dl, ul, h, table, emptyNote, section, toolbar,
  idLink, usedIn, home, inlineJson, isDict, asList,
} from "./html.mjs";
import { relHref } from "./domain.mjs";

// Field rows of a schema, walked in parallel with the example value. Each row:
// { path, depth, type, required, description, example, branch, constraints }.
// Exported so the check can compare the HTML with the same walk.
export function fieldRows(schema, example, root = schema) {
  const rows = [];
  // Cycles through $ref would loop; a schema object is visited once per path. The
  // guard is keyed on the object, not the path alone, because allOf parts share the
  // parent's path and must all be walked.
  const seen = new Map();
  const walk = (node, value, prefix, depth, requiredHere, branch) => {
    node = resolveRef(node, root);
    if (!isDict(node)) return;
    const key = `${prefix}|${branch || ""}`;
    if (!seen.has(node)) seen.set(node, new Set());
    if (seen.get(node).has(key)) return;
    seen.get(node).add(key);
    const props = isDict(node.properties) ? node.properties : {};
    const req = new Set(asList(node.required).map(String));
    for (const [name, sub0] of Object.entries(props)) {
      const sub = resolveRef(sub0, root);
      const path = prefix ? `${prefix}.${name}` : name;
      const ex = isDict(value) ? value[name] : undefined;
      rows.push({ path, name, depth, type: typeOf(sub), required: req.has(name), description: isDict(sub) ? sub.description || "" : "", example: ex, branch, constraints: constraintsOf(sub), hasExample: ex !== undefined });
      descend(sub, ex, path, depth + 1);
    }
    // Branches: each alternative is a labelled sub-tree under the same parent.
    for (const kw of ["oneOf", "anyOf"]) {
      asList(node[kw]).forEach((alt, i) => {
        const a = resolveRef(alt, root);
        const label = `${kw === "oneOf" ? "one of" : "any of"} ${i + 1}${isDict(a) && a.title ? `: ${a.title}` : ""}`;
        rows.push({ path: `${prefix || ""}${prefix ? "." : ""}(${kw} ${i + 1})`, name: label, depth, type: typeOf(a), required: false, description: isDict(a) ? a.description || "" : "", example: undefined, branch: label, isBranch: true, constraints: constraintsOf(a), hasExample: false });
        walk(a, value, prefix, depth + 1, false, label);
      });
    }
    for (const part of asList(node.allOf)) walk(part, value, prefix, depth, false, branch);
  };
  const descend = (sub, ex, path, depth) => {
    if (!isDict(sub)) return;
    if (isDict(sub.properties) || sub.oneOf || sub.anyOf || sub.allOf) walk(sub, ex, path, depth);
    const items = resolveRef(sub.items, root);
    if (isDict(items) && (isDict(items.properties) || items.oneOf || items.anyOf || items.allOf)) {
      walk(items, Array.isArray(ex) ? ex[0] : undefined, `${path}[]`, depth);
    }
  };
  walk(schema, example, "", 0, false, "");
  return rows;
}

function typeOf(s) {
  if (!isDict(s)) return "any";
  if (s.const !== undefined) return `const ${inlineJson(s.const, 40)}`;
  if (Array.isArray(s.enum)) return `one of ${s.enum.map((e) => inlineJson(e, 24)).join(", ")}`;
  let t = Array.isArray(s.type) ? s.type.join(" | ") : s.type || (s.properties ? "object" : s.items ? "array" : s.oneOf ? "one of" : s.anyOf ? "any of" : "any");
  if (t === "array" && isDict(s.items)) {
    const inner = resolveRef(s.items, s);
    const it = isDict(inner) ? (Array.isArray(inner.type) ? inner.type.join("|") : inner.type) : null;
    if (it) t = `${it}[]`;
  }
  if (s.format) t += ` (${s.format})`;
  return t;
}

function constraintsOf(s) {
  if (!isDict(s)) return [];
  const out = [];
  for (const k of ["pattern", "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "multipleOf", "uniqueItems"]) {
    if (s[k] !== undefined) out.push(`${k} ${inlineJson(s[k], 40)}`);
  }
  if (s.additionalProperties === false) out.push("no extra fields");
  return out;
}

export function section_(workspace, gates, opts = {}) {
  const { steps, index, schemas } = workspace;
  const ids = opts.ids;
  const claim = (want) => (ids ? ids.claim(want) : slug(want));
  const ct = steps.contracts;
  if (!ct && !Object.keys(schemas || {}).length) {
    return section({
      id: "contracts", title: "Every message, field by field", empty: true, count: 0,
      lede: "The exact shape of everything that crosses a line.",
      body: emptyNote("contracts", "writes a JSON Schema and one checked example for every message that crosses a party boundary"),
    });
  }
  const entries = asList(ct && ct.entries).filter((e) => isDict(e) && e.id);
  const used = new Set();
  const blocks = entries.map((e) => {
    used.add(String(e.id));
    const rec = schemas[e.id] || null;
    const resp = schemas[`${e.id}.response`] || null;
    if (resp) used.add(`${e.id}.response`);
    return entryNode(e, rec, resp, workspace, claim);
  });
  // Companion schemas that have no entry (a stray .response or an unlisted schema).
  const orphans = Object.values(schemas || {}).filter((r) => !used.has(r.id) && !r.entry);
  for (const r of orphans) {
    used.add(r.id);
    blocks.push(entryNode({ id: r.id, name: (r.schema && r.schema.title) || r.id, description: (r.schema && r.schema.description) || "", _orphan: true }, r, null, workspace, claim));
  }
  // Messages connect lists that have no contract, with the reason when contracts
  // deprecated them.
  const deprecated = new Map(asList(ct && ct.deprecated).filter(isDict).map((d) => [String(d.id), d]));
  const cn = asList(steps.connect && steps.connect.messages).filter((m) => isDict(m) && m.id && !used.has(String(m.id)));
  if (cn.length) {
    const rows = cn.map((m) => {
      const d = deprecated.get(String(m.id));
      return {
        attrs: { id: claim(home.message(m.id)), "data-kind": "message", "data-id": m.id, "data-search-row": `${m.id} ${m.kind || ""}`, "data-search-text": `${m.id} ${m.kind || ""}` },
        cells: [
          `<b>${esc(m.id)}</b> ${chip(m.kind)}`,
          `${esc(m.producer || "?")} → ${asList(m.consumers).map(esc).join(", ")}`,
          asList(m.payload).map((p) => `<code>${esc(p)}</code>`).join(" "),
          d ? `<span class="x-muted">${esc(d.reason || "deprecated")}${d.since ? ` (since ${esc(d.since)})` : ""}</span>` : `<span class="x-muted">${ct ? "no contract written" : "waiting for step 9"}</span>`,
        ],
      };
    });
    blocks.push(fold({ title: "Messages without a written contract", count: cn.length, kind: "no-contract", body: `<p class="x-muted">Listed by step 5 (connect); either inside one deployable, or still to be written.</p>${table(["Message", "From → to", "Payload", "Why no contract"], rows)}` }));
  }
  const n = entries.length + orphans.length;
  return section({
    id: "contracts",
    title: "Every message, field by field",
    lede: `${n} written contract${n === 1 ? "" : "s"}. Each field shows its type, whether it must be there, and the value from the checked example beside it.`,
    body: blocks.join(""),
    count: n,
    toolbar: toolbar("contracts"),
  });
}
export { section_ as section };

function entryNode(e, rec, resp, workspace, claim) {
  const { index } = workspace;
  const chips = [chip(e.kind), chip(e.delivery), e.via ? chip(`via ${e.via}`) : "", chip(e.pattern), e.version ? chip(`v${e.version}`, "mono") : "", chip(e.entityStatus),
    e.inherited ? chip("someone else owns this format", "hot") : "", e.direction ? chip(e.direction) : ""].filter(Boolean).join("");
  const parts = [];
  if (e.description) parts.push(`<p class="x-purpose">${esc(e.description)}</p>`);
  parts.push(`<p class="x-chips">${chips}</p>`);
  parts.push(dl([
    ["From", e.domain ? idLink(index, String(e.domain), "contracts") : e.client ? esc(e.client) : ""],
    ["To", asList(e.consumers).map((c) => idLink(index, String(c), "contracts")).join(", ")],
    ["Owner", asList(e.owners).map(esc).join(", ")],
    ["Reviewers", asList(e.reviewers).map(esc).join(", ")],
  ], "x-dl-inline"));

  const halves = [];
  if (rec || resp) {
    halves.push(half(resp ? "request" : "payload", rec, e, workspace));
    if (resp) halves.push(half("response", resp, e, workspace));
  } else {
    halves.push(`<p class="x-empty">No schema file readable for this message${e.schema ? ` (expected ${esc(e.schema)})` : ""}.</p>`);
  }
  parts.push(`<div class="x-halves${resp ? " x-halves-2" : ""}">${halves.join("")}</div>`);

  if (asList(e.semantics).length) parts.push(h("Rules you can rely on") + ul(asList(e.semantics).map(esc)));
  if (e.termsOfUse) parts.push(h("Terms of use") + `<p>${esc(e.termsOfUse)}</p>`);
  const ch = asList(e.channels).filter(isDict);
  if (ch.length) parts.push(h("Also travels by") + table(["Via", "Sync", "Delivery", "Note"], ch.map((c) => [esc(c.via), c.sync === undefined ? "" : c.sync ? "yes" : "no", esc(c.delivery || ""), esc(c.note || "")])));

  const prov = isDict(e.provenance) ? e.provenance : null;
  const provBits = [];
  if (prov) {
    if (prov.connect) provBits.push(`connect message ${idLink(index, String(prov.connect), "connect")}`);
    if (prov.relationship) provBits.push(`relationship ${idLink(index, String(prov.relationship), "decompose")}`);
    if (asList(prov.flows).length) provBits.push(`flow${prov.flows.length === 1 ? "" : "s"} ${asList(prov.flows).map((f) => idLink(index, String(f), "connect")).join(", ")}`);
  }
  const files = [
    rec && e.schema ? `<a class="x-file" href="${esc(relHref(e.schema, workspace))}">schema</a>` : "",
    rec && e.example ? `<a class="x-file" href="${esc(relHref(e.example, workspace))}">example</a>` : "",
    e.glossary ? `<a class="x-file" href="${esc(relHref(e.glossary, workspace))}">glossary</a>` : "",
  ].filter(Boolean).join(" ");
  parts.push(`<p class="x-foot">${provBits.length ? `<span class="x-prov">from ${provBits.join(" · ")}</span> ` : ""}${files}${usedIn(index, String(e.id))}</p>`);

  const nFields = (rec && rec.schema ? fieldRows(rec.schema, rec.example).length : 0) + (resp && resp.schema ? fieldRows(resp.schema, resp.example).length : 0);
  return fold({
    id: claim(home.message(e.id)), kind: "message", dataId: e.id, open: true, cls: "x-msg-node",
    title: `<b>${esc(e.name || e.id)}</b> <code class="x-id">${esc(e.id)}</code>`,
    sub: [e.kind ? esc(e.kind) : "", nFields ? `${nFields} field${nFields === 1 ? "" : "s"}` : "", resp ? "request + response" : ""].filter(Boolean).join(" · "),
    search: `${e.id} ${e.name || ""} ${e.kind || ""} ${e.domain || ""}`,
    body: parts.join(""),
  });
}

// One half of a contract: the field tree of a schema beside its example, then the
// negative examples with their `why`.
function half(label, rec, e, workspace) {
  const schema = rec && rec.schema;
  const parts = [];
  const title = label === "payload" ? "Fields" : label === "request" ? "Request" : "Response";
  const norm = (s) => String(s || "").toLowerCase().replace(/\s*\(response\)\s*$/, "").replace(/[^a-z0-9]+/g, "");
  const extra = schema && schema.title && label !== "payload" && norm(schema.title) !== norm(e.name) && norm(schema.title) !== norm(e.id);
  const heading = `<h4 class="x-h">${esc(title)}${extra ? ` <span class="x-muted">${esc(schema.title)}</span>` : ""}</h4>`;
  if (!schema) {
    parts.push(heading + `<p class="x-empty">Schema file missing${rec && rec.path ? ` (${esc(relHref(rec.path, workspace))})` : ""}.</p>`);
  } else {
    if (label === "response" && schema.description) parts.push(`<p class="x-muted">${esc(schema.description)}</p>`);
    const rows = fieldRows(schema, rec.example);
    const top = constraintsOf(schema);
    if (!rows.length) parts.push(heading + `<p class="x-empty">The schema declares no properties (type ${esc(typeOf(schema))}).</p>`);
    else {
      parts.push(heading + fieldTable(rows, rec.example !== null && rec.example !== undefined));
    }
    if (top.length) parts.push(`<p class="x-muted x-constraints">${top.map(esc).join(" · ")}</p>`);
    if (rec.example === null || rec.example === undefined) parts.push(`<p class="x-empty">No example file${rec.examplePath ? ` (${esc(relHref(rec.examplePath, workspace))})` : ""}.</p>`);
    else {
      // The old page printed the whole example; the table shows it per field, so the
      // full document stays available but folded.
      let text;
      try { text = JSON.stringify(rec.example, null, 2); } catch { text = String(rec.example); }
      if (text.length > 8000) text = `${text.slice(0, 8000)}\n…`;
      parts.push(fold({ title: "The whole example", kind: "example", body: `<pre class="x-pre x-json">${esc(text)}</pre>` }));
    }
  }
  const bad = asList(rec && rec.invalid).filter(isDict);
  if (bad.length) {
    parts.push(fold({
      title: "Must be rejected", count: bad.length, kind: "negative-examples",
      body: table(["Why it is wrong", "Payload"], bad.map((b) => [esc(b.why || ""), `<code class="x-json">${esc(inlineJson(b.payload, 160))}</code>`])),
    }));
  }
  return `<div class="x-half" data-half="${esc(label)}">${parts.join("")}</div>`;
}

function fieldTable(rows, hasExample) {
  const head = hasExample ? ["Field", "Type", "Example", "Means"] : ["Field", "Type", "Means"];
  return table(head, rows.map((r) => {
    const name = r.isBranch
      ? `<span class="x-branch">${esc(r.name)}</span>`
      : `<code class="x-field">${esc(r.name)}</code>${r.required ? `<abbr class="x-req" title="required">*</abbr>` : `<span class="x-opt-mark" title="optional">?</span>`}`;
    const cells = [
      `<span class="x-indent" style="--d:${r.depth}">${name}</span>`,
      `<span class="x-type">${esc(r.type)}</span>${r.constraints.length ? `<br><span class="x-muted x-small">${r.constraints.map(esc).join(" · ")}</span>` : ""}`,
    ];
    if (hasExample) cells.push(r.isBranch ? "" : r.hasExample ? `<code class="x-json">${esc(inlineJson(r.example, 60))}</code>` : `<span class="x-muted">–</span>`);
    cells.push(esc(r.description));
    return { attrs: { "data-field": r.path, "data-required": r.required ? "true" : "false", "data-type": r.type, "data-search-row": `${r.path} ${r.type}`, "data-search-text": `${r.path} ${r.type}` }, cells };
  }), "x-fields");
}
