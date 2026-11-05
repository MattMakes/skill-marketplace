// The domain tree: context -> aggregates -> invariants / commands / events /
// transitions, then services, ports with adapters and read models. Joined from
// decompose (which contexts exist), define (purpose, classification, canvas facts),
// organise (team, deployable), strategize (classification when define is missing)
// and code (everything below the context). Two levels open by default.
import { contextColor } from "../core/palette.mjs";
import {
  esc, slug, chip, ctxChip, fold, row, dl, ul, h, table, emptyNote, section, toolbar,
  idLink, usedIn, home, entryFor, isDict, asList,
} from "./html.mjs";

// The contexts of a workspace in decompose order, each with what every step says
// about it. Exported so the stores explorer and the checks share one join.
export function contexts(workspace) {
  const { steps, index } = workspace;
  const dec = steps.decompose || {};
  const def = steps.define || {};
  const org = steps.organise || {};
  const str = steps.strategize || {};
  const code = steps.code || {};
  const order = [];
  const byId = new Map();
  const add = (id) => {
    if (!byId.has(id)) { byId.set(id, { id, name: id }); order.push(id); }
    return byId.get(id);
  };
  for (const bc of asList(dec.bounded_contexts)) if (isDict(bc) && bc.id) Object.assign(add(String(bc.id)), { name: bc.name || bc.id, decompose: bc });
  for (const c of asList(def.canvases)) if (isDict(c) && c.context) { const e = add(String(c.context)); e.define = c; if (c.name) e.name = c.name; }
  for (const c of asList(code.contexts)) if (isDict(c) && c.context) add(String(c.context)).code = c;

  const classBySub = new Map(asList(str.classifications).filter(isDict).map((c) => [String(c.subdomain), c]));
  for (const ctx of byId.values()) {
    ctx.team = asList(org.teams).find((t) => isDict(t) && asList(t.owns_contexts).includes(ctx.id)) || null;
    ctx.deployables = asList(org.deployables).filter((d) => isDict(d) && asList(d.contexts).includes(ctx.id));
    // Classification: define's canvas wins; otherwise strategize's line for the
    // context's first subdomain.
    const sc = ctx.define && isDict(ctx.define.strategic_classification) ? ctx.define.strategic_classification : null;
    const sub = ctx.decompose ? asList(ctx.decompose.subdomains).map((s) => classBySub.get(String(s))).find(Boolean) : null;
    ctx.classification = sc ? sc.domain : sub ? sub.type : null;
    ctx.pattern = (ctx.code && ctx.code.implementation_pattern) || (sub && sub.implementation_pattern) || null;
    ctx.color = contextColor(ctx.id);
    ctx.entry = entryFor(index, "decompose", "bounded_contexts", ctx.id)
      || entryFor(index, "define", "canvases", ctx.id)
      || entryFor(index, "code", "contexts", ctx.id);
  }
  return order.map((id) => byId.get(id));
}

export function section_(workspace, gates, opts = {}) {
  const { steps, index } = workspace;
  const ids = opts.ids;
  const claim = (want) => (ids ? ids.claim(want) : slug(want));
  const has = steps.decompose || steps.define || steps.code;
  if (!has) {
    return section({
      id: "domain", title: "The domain, as a tree", empty: true, count: 0,
      lede: "Every context, what it owns and how it is built.",
      body: emptyNote("decompose", "draws the bounded contexts this tree starts from"),
    });
  }
  const list = contexts(workspace);
  const body = list.map((ctx) => contextNode(ctx, workspace, claim)).join("");
  const deep = steps.code ? "" : ` ${emptyNote("code", "adds the aggregates, invariants, ports and adapters below each context")}`;
  return section({
    id: "domain",
    title: "The domain, as a tree",
    lede: `${list.length} context${list.length === 1 ? "" : "s"}. Open a context for what it promises; open an aggregate for the rules it protects. Every name links to where it is used.`,
    body: body + deep,
    count: list.length,
    toolbar: toolbar("domain"),
  });
}
export { section_ as section };

function contextNode(ctx, workspace, claim) {
  const { index } = workspace;
  const def = ctx.define || {};
  const code = ctx.code || {};
  const dec = ctx.decompose || {};
  const chips = [
    chip(ctx.classification, ctx.classification === "core" ? "core" : ""),
    chip(ctx.pattern),
    ctx.team ? `<a class="x-chip" href="#${esc(home.team(ctx.team.id))}">team ${esc(ctx.team.name || ctx.team.id)}</a>` : "",
    ...ctx.deployables.map((d) => `<a class="x-chip" href="#${esc(home.deployable(d.id))}">ships in ${esc(d.name || d.id)}</a>`),
    code.module_path ? chip(code.module_path, "mono") : "",
  ].filter(Boolean).join("");

  const parts = [];
  if (def.purpose) parts.push(`<p class="x-purpose">${esc(def.purpose)}</p>`);
  parts.push(`<p class="x-chips">${chips}</p>`);
  if (def.domain_roles_rationale || asList(def.domain_roles).length) {
    parts.push(dl([["Kind of context", `${asList(def.domain_roles).map((r) => chip(r)).join("")}${def.domain_roles_rationale ? ` <span class="x-muted">${esc(def.domain_roles_rationale)}</span>` : ""}`]]));
  }

  // Aggregates, or an honest line when there are none.
  const aggs = asList(code.aggregates).filter(isDict);
  if (aggs.length) {
    parts.push(h("Aggregates", aggs.length));
    parts.push(aggs.map((a) => aggregateNode(a, ctx, workspace, claim)).join(""));
  } else if (ctx.code) {
    const owned = asList(dec.owns_aggregates);
    parts.push(`<p class="x-muted">No aggregates recorded${ctx.pattern ? ` (${esc(ctx.pattern)})` : ""}${owned.length ? `; decompose named ${owned.map((a) => `<code>${esc(a)}</code>`).join(", ")}` : ""}.</p>`);
  }

  // Commands and events the context owns, from decompose, so a context without
  // aggregates still shows what it handles and emits.
  const ownsC = asList(dec.owns_commands);
  const ownsE = asList(dec.owns_events);
  if (ownsC.length || ownsE.length) {
    parts.push(dl([
      ["Owns commands", ownsC.map((c) => leaf("command", c, index, "decompose")).join("")],
      ["Owns events", ownsE.map((e) => leaf("event", e, index, "decompose")).join("")],
    ]));
  }

  // Canvas facts (define): rules, metrics, collaborators, words.
  if (asList(def.business_decisions).length) parts.push(h("Rules it decides") + ul(asList(def.business_decisions).map((x) => esc(x))));
  for (const side of ["inbound", "outbound"]) {
    const rows = asList(def[side]).filter(isDict).map((x) => [
      esc(x.collaborator), esc(x.relationship || ""),
      asList(x.messages).map((m) => leaf(m.kind || "message", m.id, index, "define", m.kind)).join(""),
    ]);
    if (rows.length) parts.push(h(side === "inbound" ? "Comes in from" : "Goes out to") + table(["Who", "Relationship", "Messages"], rows));
  }
  if (asList(def.verification_metrics).length) parts.push(h("How you know it is healthy") + ul(asList(def.verification_metrics).map((x) => esc(x))));

  // Services, ports, adapters, read models (code).
  const svc = [...asList(code.domain_services).map((s) => ({ ...s, _k: "domain" })), ...asList(code.application_services).map((s) => ({ ...s, _k: "application" }))].filter(isDict);
  if (svc.length) {
    parts.push(fold({
      title: "Services", count: svc.length, kind: "services",
      body: table(["Service", "Kind", "Handles", "Does"], svc.map((s) => ({
        attrs: { "data-kind": "service", "data-id": s.name, "data-search-row": `${s.name} ${s.command || ""}`, "data-search-text": `${s.name} ${s.command || ""}` },
        cells: [`<b>${esc(s.name)}</b>`, esc(s._k), s.command ? leaf("command", s.command, index, "code") : "", esc(s.description || "")],
      }))),
    }));
  }
  const ports = asList(code.ports).filter(isDict);
  if (ports.length) {
    const adapters = asList(code.adapters).filter(isDict);
    parts.push(fold({
      title: "Ports and adapters", count: ports.length, kind: "ports",
      body: table(["Port", "Side", "Adapter", "Purpose"], ports.map((p) => ({
        attrs: { "data-kind": "port", "data-id": p.name, "data-search-row": `${p.name} ${p.kind || ""}`, "data-search-text": `${p.name} ${p.kind || ""}` },
        cells: [
          `<b>${esc(p.name)}</b>`,
          chip(p.kind, p.kind === "driving" ? "driving" : "driven"),
          adapters.filter((a) => a.port === p.name).map((a) => `<code>${esc(a.implementation)}</code>`).join(", ") || `<span class="x-muted">none yet</span>`,
          esc(p.description || ""),
        ],
      }))),
    }));
  }
  const rms = asList(code.read_models).filter(isDict);
  if (rms.length) {
    parts.push(fold({
      title: "Read models", count: rms.length, kind: "read-models",
      body: table(["Read model", "Built from"], rms.map((r) => ({
        attrs: { "data-kind": "read-model", "data-id": r.name, "data-search-row": r.name, "data-search-text": r.name },
        cells: [`<b>${esc(r.name)}</b>`, asList(r.source_events).map((e) => leaf("event", e, index, "code")).join("")],
      }))),
    }));
  }
  const tests = asList(code.tests).filter(isDict);
  if (tests.length) {
    parts.push(fold({
      title: "Tests that guard it", count: tests.length, kind: "tests",
      body: table(["Guards", "The test"], tests.map((t) => [esc(t.invariant), esc(t.test)])),
    }));
  }
  const words = asList(def.ubiquitous_language).filter(isDict).concat(asList(dec.terms).filter(isDict).map((t) => ({ term: t.term, definition: t.meaning_here })));
  if (words.length) parts.push(fold({ title: "Its words", count: words.length, kind: "words", body: table(["Term", "Means here"], words.map((w) => [`<b>${esc(w.term)}</b>`, esc(w.definition || "")])) }));

  const links = [
    def.canvas_path ? `<a class="x-file" href="${esc(relHref(def.canvas_path, workspace))}">canvas</a>` : "",
    code.design_path ? `<a class="x-file" href="${esc(relHref(code.design_path, workspace))}">design</a>` : "",
  ].filter(Boolean).join(" ");
  parts.push(`<p class="x-foot">${links}${ctx.entry ? usedIn(index, ctx.id) : ""}</p>`);

  const sub = [ctx.classification ? esc(ctx.classification) : "", aggs.length ? `${aggs.length} aggregate${aggs.length === 1 ? "" : "s"}` : "", ports.length ? `${ports.length} ports` : ""].filter(Boolean).join(" · ");
  return fold({
    id: claim(home.context(ctx.id)), kind: "context", dataId: ctx.id, open: true, cls: `x-ctx-node ctx-${ctx.color.slot}`,
    title: ctxChip(ctx.id, ctx.name, ctx.color.slot, false) + (ctx.name !== ctx.id ? ` <code class="x-id">${esc(ctx.id)}</code>` : ""),
    sub, search: `${ctx.id} ${ctx.name} ${ctx.classification || ""}`,
    body: parts.join(""),
  });
}

function aggregateNode(a, ctx, workspace, claim) {
  const { index } = workspace;
  const inv = asList(a.invariants);
  const cmds = asList(a.commands);
  const evs = asList(a.events);
  const parts = [];
  parts.push(dl([
    ["Root entity", `<b>${esc(a.root_entity || "")}</b>`],
    ["Entities", asList(a.entities).map((e) => chip(e)).join("")],
    ["Value objects", asList(a.value_objects).map((e) => chip(e)).join("")],
  ]));
  if (inv.length) parts.push(h("Invariants it protects", inv.length) + ul(inv.map((x) => `<span data-kind="invariant" data-id="${esc(x)}" data-search-row="${esc(x)}" data-search-text="${esc(x)}">${esc(x)}</span>`), "x-inv"));
  parts.push(dl([
    ["Handles", cmds.map((c) => leaf("command", c, index, "code")).join("")],
    ["Emits", evs.map((e) => leaf("event", e, index, "code")).join("")],
    ["State", asList(a.state_transitions).map((t) => `<code class="x-trans">${esc(t)}</code>`).join(" ")],
  ]));
  const links = a.canvas_path ? `<a class="x-file" href="${esc(relHref(a.canvas_path, workspace))}">aggregate canvas</a>` : "";
  parts.push(`<p class="x-foot">${links}${usedIn(index, a.id)}</p>`);
  return fold({
    id: claim(home.aggregate(a.id)), kind: "aggregate", dataId: a.id, open: false, cls: "x-agg-node",
    title: `<b>${esc(a.name || a.id)}</b> <code class="x-id">${esc(a.id)}</code>`,
    sub: [inv.length ? `${inv.length} invariant${inv.length === 1 ? "" : "s"}` : "", cmds.length ? `${cmds.length} commands` : "", evs.length ? `${evs.length} events` : ""].filter(Boolean).join(" · "),
    search: `${a.id} ${a.name || ""} ${a.root_entity || ""}`,
    body: parts.join(""),
  });
}

// A command / event / message leaf: a searchable chip linking to the id's home.
function leaf(kind, id, index, step, cls) {
  const k = cls || kind;
  return `<span class="x-leaf x-leaf-${esc(k)}"${` data-kind="${esc(kind)}" data-id="${esc(id)}" data-search-row="${esc(id)}" data-search-text="${esc(id)}"`}>${idLink(index, String(id), step, { cls: "x-leaf-a" })}</span>`;
}

// Project-relative artifact path -> href relative to the page in ddd/. Pages live at
// ddd/review.html, so "ddd/07-define/x.md" becomes "07-define/x.md".
export function relHref(p, workspace) {
  const rel = String((workspace.manifest && workspace.manifest.ddd_dir) || "ddd").replace(/^\/+|\/+$/g, "");
  const s = String(p);
  return s.startsWith(rel + "/") ? s.slice(rel.length + 1) : s;
}
