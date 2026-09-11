// Data stores: deployable -> store (own | shared | none) -> contexts hosted ->
// aggregates persisted (code.json) -> which contexts write them. A `shared` store is
// flagged with a one-line "so what"; a store two contexts write gets a softer note.
// Libraries and frontends that host another deployable's runtime say so.
import {
  esc, slug, chip, ctxChip, fold, dl, ul, h, table, emptyNote, section, toolbar,
  idLink, usedIn, home, isDict, asList,
} from "./html.mjs";
import { contexts } from "./domain.mjs";

const STORE_WORDS = {
  own: "its own store",
  shared: "a shared store",
  none: "no store",
};

// The store view as data: one row per deployable, so the check and the page agree.
export function storeRows(workspace) {
  const { steps } = workspace;
  const org = steps.organise || {};
  const ctxs = contexts(workspace);
  const byId = new Map(ctxs.map((c) => [c.id, c]));
  const deployables = asList(org.deployables).filter((d) => isDict(d) && d.id);
  const rows = deployables.map((d) => {
    const hosted = asList(d.contexts).map((id) => byId.get(String(id)) || { id: String(id), name: String(id), deployables: [], color: null });
    const store = STORE_WORDS[d.data_store] ? d.data_store : d.data_store ? String(d.data_store) : "unknown";
    const aggregates = hosted.flatMap((c) => asList(c.code && c.code.aggregates).filter(isDict).map((a) => ({ ...a, context: c.id })));
    // Writers: the context that owns the aggregate, plus any code context whose
    // aggregate list names it (a second writer is a boundary leak worth seeing).
    const writersOf = (agg) => {
      const w = new Set([agg.context]);
      for (const c of ctxs) if (c.id !== agg.context && asList(c.code && c.code.aggregates).some((x) => isDict(x) && x.id === agg.id)) w.add(c.id);
      return [...w];
    };
    const persisted = aggregates.map((a) => ({ id: a.id, name: a.name || a.id, context: a.context, writers: writersOf(a) }));
    const writingContexts = [...new Set(persisted.flatMap((p) => p.writers))];
    const sharedWith = store === "shared" ? deployables.filter((o) => o.id !== d.id && o.data_store === "shared").map((o) => o.id) : [];
    const flags = [];
    if (store === "shared") {
      flags.push({
        kind: "shared",
        text: sharedWith.length
          ? `Shared store: ${[d.id, ...sharedWith].join(", ")} read and write the same database, so a schema change in one is a deploy for all of them and the boundary between them is only a convention.`
          : `Shared store: this deployable writes a database it does not own, so a schema change there is a change for everyone who reads it.`,
      });
    }
    if (store !== "shared" && hosted.length > 1 && writingContexts.length > 1) {
      flags.push({ kind: "two-writers", text: `${writingContexts.length} contexts write the one store of ${d.id}; keep them in separate schemas or tables so the boundary stays visible when the deployable is split.` });
    }
    if (store === "none" && persisted.length) {
      flags.push({ kind: "no-store", text: `${d.id} says it has no store but hosts ${persisted.length} aggregate${persisted.length === 1 ? "" : "s"} that must be persisted somewhere.` });
    }
    return { deployable: d, store, hosted, persisted, writingContexts, flags, hostsRuntimeOf: asList(d.hosts_runtime_of).map(String) };
  });
  return rows;
}

export function section_(workspace, gates, opts = {}) {
  const { steps, index } = workspace;
  const ids = opts.ids;
  const claim = (want) => (ids ? ids.claim(want) : slug(want));
  if (!steps.organise) {
    return section({
      id: "stores", title: "Where the data lives", empty: true, count: 0,
      lede: "Deployables, their stores, and who writes what.",
      body: emptyNote("organise", "decides the deployables and whether each has its own store"),
    });
  }
  const rows = storeRows(workspace);
  const org = steps.organise;
  const teams = asList(org.teams).filter((t) => isDict(t) && t.id);
  const flagged = rows.filter((r) => r.flags.length);
  const blocks = rows.map((r) => deployableNode(r, workspace, claim));
  if (teams.length) {
    blocks.push(fold({
      title: "Teams", count: teams.length, kind: "teams",
      body: table(["Team", "Type", "Size", "Owns", "Load"], teams.map((t) => ({
        attrs: { id: claim(home.team(t.id)), "data-kind": "team", "data-id": t.id, "data-search-row": `${t.id} ${t.name || ""}`, "data-search-text": `${t.id} ${t.name || ""}` },
        cells: [`<b>${esc(t.name || t.id)}</b> <code class="x-id">${esc(t.id)}</code>`, chip(t.type), esc(t.size ?? ""), asList(t.owns_contexts).map((c) => idLink(index, String(c), "organise")).join(", "), chip(t.cognitive_load, t.cognitive_load === "ok" ? "ok" : "warn")],
      }))),
    }));
  }
  const scale = isDict(org.scale_check) ? org.scale_check : null;
  const lede = [
    `${rows.length} deployable${rows.length === 1 ? "" : "s"}${org.topology_style ? ` (${esc(org.topology_style)})` : ""}`,
    scale ? `${scale.within_target ? "within" : "outside"} the ${esc(scale.target_min)}–${esc(scale.target_max)} target` : "",
    flagged.length ? `<b>${flagged.length} store${flagged.length === 1 ? "" : "s"} worth a look</b>` : "no shared stores",
  ].filter(Boolean).join(" · ") + ".";
  const code = steps.code ? "" : emptyNote("code", "adds the aggregates each store persists");
  return section({
    id: "stores", title: "Where the data lives", lede, body: blocks.join("") + code, count: rows.length, toolbar: toolbar("stores"),
  });
}
export { section_ as section };

function deployableNode(r, workspace, claim) {
  const { index } = workspace;
  const d = r.deployable;
  const parts = [];
  for (const f of r.flags) parts.push(`<p class="x-flag x-flag-${esc(f.kind)}" data-flag="${esc(f.kind)}">${esc(f.text)}</p>`);
  parts.push(`<p class="x-chips">${chip(d.kind)}${chip(STORE_WORDS[r.store] || r.store, r.store === "shared" ? "hot" : r.store === "none" ? "" : "ok")}${d.independent_deploy === true ? chip("deploys on its own") : d.independent_deploy === false ? chip("deploys with others", "warn") : ""}${d.team ? `<a class="x-chip" href="#${esc(home.team(d.team))}">team ${esc(d.team)}</a>` : ""}</p>`);
  if (d.rationale) parts.push(`<p class="x-muted">${esc(d.rationale)}</p>`);
  if (r.hostsRuntimeOf.length) {
    parts.push(dl([["Hosts the runtime of", r.hostsRuntimeOf.map((x) => idLink(index, x, "organise")).join(", ") + ` <span class="x-muted">(${esc(d.kind || "this deployable")} runs code that belongs to those)</span>`]]));
  }
  const hostedHtml = r.hosted.map((c) => {
    const persisted = r.persisted.filter((p) => p.context === c.id);
    const inner = persisted.length
      ? table(["Aggregate", "Written by"], persisted.map((p) => ({
        attrs: { "data-kind": "persisted", "data-id": p.id, "data-search-row": p.id, "data-search-text": p.id },
        cells: [`<a href="#${esc(home.aggregate(p.id))}"><b>${esc(p.name)}</b></a> <code class="x-id">${esc(p.id)}</code>`, p.writers.map((w) => idLink(index, w, "code")).join(", ") + (p.writers.length > 1 ? ` ${chip("two writers", "hot")}` : "")],
      })))
      : `<p class="x-muted">${c.code ? "No aggregates recorded; nothing of its own to persist here." : "Step 8 (code) has not listed its aggregates yet."}</p>`;
    return fold({
      title: c.color ? ctxChip(c.id, c.name, c.color.slot) : esc(c.id), kind: "hosted-context", dataId: c.id, open: true, cls: c.color ? `ctx-${c.color.slot}` : "",
      sub: persisted.length ? `${persisted.length} aggregate${persisted.length === 1 ? "" : "s"} persisted` : "",
      search: `${c.id} ${c.name || ""}`, body: inner,
    });
  }).join("");
  parts.push(h("Contexts hosted", r.hosted.length) + (hostedHtml || `<p class="x-muted">No contexts; ${esc(d.kind || "it")} ships without a domain of its own.</p>`));
  parts.push(`<p class="x-foot">${usedIn(index, d.id)}</p>`);
  return fold({
    id: claim(home.deployable(d.id)), kind: "deployable", dataId: d.id, open: true, cls: `x-dep-node x-store-${esc(r.store)}`,
    title: `<b>${esc(d.name || d.id)}</b> <code class="x-id">${esc(d.id)}</code>`,
    sub: [esc(STORE_WORDS[r.store] || r.store), `${r.hosted.length} context${r.hosted.length === 1 ? "" : "s"}`, r.flags.length ? "flagged" : ""].filter(Boolean).join(" · "),
    search: `${d.id} ${d.name || ""} ${r.store}`,
    body: parts.join(""),
  });
}
