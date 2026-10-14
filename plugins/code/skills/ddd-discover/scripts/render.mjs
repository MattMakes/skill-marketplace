// `ddd discover render <discover.json> [-o <event-storm.md>] [--split auto|always|never]
// [--title "Project title"] [--stdout]`: the port of render_event_storm.py.
//
// Renders ddd/02-discover/event-storm.md from discover.json: a timeline table per phase,
// a mermaid flowchart in sticky-note colours, and every other collection, so the Markdown
// never drifts from the JSON. The output is byte-identical to the Python's (the goldens
// compare the file), which is why the layout code below follows the Python line by line,
// including the `render_event_storm.py` mention in the banner (leaf 1.4.1 rewords).
//
// Exit 0 on success, 2 on usage/IO problems.
import fs from "node:fs";
import path from "node:path";
import { pyDumps } from "../../../shared/lib/jsonschema.mjs";
import {
  byId, cmpTuple, dicts, get, has, isDict, listOr, manifestTitle, pyStr, readJson, runCommand,
  sortedBy, strOrEmpty, truthy,
} from "./_args.mjs";

const DEPTH_BANDS = { light: [10, 25], standard: [25, 60], deep: [60, 150] };
const SPLIT_THRESHOLD = 40;

const LEGEND = [
  ["Domain event (orange)", "A business fact that happened, past tense: *Order Placed*. The spine of the board."],
  ["Command (blue)", "The decision or intent that caused an event, imperative: *Place Order*. Issued by an actor or a policy."],
  ["Actor (yellow)", "A person, role or team issuing commands."],
  ["External system (pink)", "A system outside our control that we call or that calls us (payment provider, courier)."],
  ["Policy (lilac)", "\"Whenever *event* then *command*\" - an automatic or manual reaction. Business rules live here."],
  ["Read model (green)", "What the actor needs to see to decide on a command."],
  ["Hotspot (magenta; shown as [H1] next to the event)", "A disagreement, unknown, risk or gap. A finding, not a failure."],
  ["Pivotal event (marked *(pivotal)*; bold border in the diagram)", "Marks a phase change; a boundary candidate for ddd-decompose."],
];

const DOC = `The JSON is the chain; this command renders the human view of the board (a timeline table per
phase, a mermaid flowchart in sticky-note colours, and every other collection) so the Markdown
never drifts from the JSON. Re-run it after every edit to discover.json.

  --split   auto (default): one flowchart for the whole board up to 40 events, otherwise one
            diagram per phase. \`always\` / \`never\` force the choice.
  --title   override the title (default: title/project from the manifest.json next to the
            ddd folder, i.e. <ddd-dir>/manifest.json).
  --stdout  print instead of writing.`;

// A table cell: pipes escaped, newlines flattened, trimmed.
function cell(s) {
  return strOrEmpty(s).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

// A mermaid label: no double quotes or bracket-ish characters, whitespace collapsed,
// optionally cut to `limit` code points with an ellipsis.
function label(s, limit = null) {
  let t = strOrEmpty(s).replace(/"/g, "'");
  t = t.replace(/[\[\]{}()`|<>#;]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (limit && [...t].length > limit) t = [...t].slice(0, limit - 1).join("").replace(/\s+$/, "") + "...";
  return t;
}

function nid(prefix, raw) {
  return prefix + "_" + pyStr(raw).replace(/[^A-Za-z0-9]/g, "_");
}

function code(x) {
  return truthy(x) ? `\`${pyStr(x)}\`` : "";
}

// Python's `list or [fallback]`: an empty rendered list falls back to a placeholder row.
const orElse = (rows, fallback) => (rows.length ? rows : fallback);

// "In plain words" (envelope `plain_words`, artifact-contract.md section 3).
function plainWordsBlock(doc) {
  const pw = get(isDict(doc) ? doc : {}, "plain_words");
  if (!isDict(pw)) return [];
  const [what, decided, assumed, riskiest] = ["what", "decided", "assumed", "riskiest"].map((k) => strOrEmpty(get(pw, k)).trim());
  if (!(what || decided || assumed || riskiest)) return [];
  const block = ["## In plain words", ""];
  if (what) block.push(what, "");
  for (const [lab, value] of [["Decided", decided], ["Assumed", assumed], ["Riskiest", riskiest]]) {
    if (value) block.push(`**${lab}:** ${value}`, "");
  }
  return [...block, "---", ""];
}

class Board {
  constructor(d) {
    this.d = d;
    this.actors = byId(get(d, "actors"));
    this.externals = byId(get(d, "external_systems"));
    this.who = new Map();
    for (const [k, v] of this.actors) this.who.set(k, get(v, "name", k));
    for (const [k, v] of this.externals) this.who.set(k, get(v, "name", k));
    this.events = byId(get(d, "events"));
    this.commands = byId(get(d, "commands"));
    this.policies = dicts(get(d, "policies"));
    this.readModels = dicts(get(d, "read_models"));
    this.hotspots = dicts(get(d, "hotspots"));
    this.scenarios = dicts(get(d, "scenarios"));
    this.glossary = dicts(get(d, "glossary"));
    this.aggregates = dicts(get(d, "aggregate_candidates"));
    this.phases = sortedBy(dicts(get(d, "phases")), (p) => [get(p, "order", 0), pyStr(get(p, "id"))]);
    this.phaseOrder = new Map(this.phases.map((p, i) => [get(p, "id"), i]));
    this.phaseName = new Map(this.phases.map((p) => [get(p, "id"), get(p, "name", get(p, "id"))]));
    // set(pivotal_events) | {flagged events}: a JS Set keeps insertion order, and the
    // only place order matters sorts the set by event key anyway.
    this.pivotal = new Set([...listOr(get(d, "pivotal_events")), ...[...this.events.values()].filter((e) => truthy(get(e, "pivotal"))).map((e) => e.id)]);
    this.polByWhen = groupBy(this.policies, (p) => get(p, "when"));
    this.rmByCmd = groupBy(this.readModels, (r) => get(r, "informs"));
    this.hsByNear = groupBy(this.hotspots, (h) => get(h, "near"));
    this.cmdPhase = new Map();
    for (const c of this.commands.values()) {
      const prod = listOr(get(c, "produces")).filter((e) => this.events.has(e)).map((e) => this.events.get(e));
      if (prod.length) {
        // min(prod, key=ekey): the first of the smallest.
        let first = prod[0];
        for (const e of prod.slice(1)) if (cmpTuple(this.ekey(e), this.ekey(first)) < 0) first = e;
        this.cmdPhase.set(c.id, get(first, "phase"));
      }
    }
  }

  ekey(e) {
    const ph = get(e, "phase");
    return [this.phaseOrder.has(ph) ? this.phaseOrder.get(ph) : 10 ** 9, get(e, "sequence", 0), pyStr(get(e, "id"))];
  }

  phaseEvents(pid) {
    return sortedBy([...this.events.values()].filter((e) => get(e, "phase") === pid), (e) => this.ekey(e));
  }

  unphased() {
    return sortedBy([...this.events.values()].filter((e) => !this.phaseOrder.has(get(e, "phase"))), (e) => this.ekey(e));
  }

  allEvents() {
    return sortedBy([...this.events.values()], (e) => this.ekey(e));
  }

  // ---------- mermaid ----------
  diagram(phases, split) {
    const subset = new Set(phases.map((p) => get(p, "id")));
    const lines = ["```mermaid", "flowchart LR",
      "  classDef event fill:#F6A623,stroke:#8A5A00,color:#000",
      "  classDef pivotal fill:#F6A623,stroke:#000,stroke-width:3px,color:#000",
      "  classDef command fill:#8FB8FF,stroke:#1F4E9C,color:#000",
      "  classDef policy fill:#C9A7EB,stroke:#5B2D8E,color:#000",
      "  classDef readmodel fill:#9EDF9C,stroke:#2E7D32,color:#000",
      "  classDef hotspot fill:#FF3B8D,stroke:#8B0040,color:#fff",
      "  classDef external fill:#F8C6DF,stroke:#A3325F,color:#000"];
    const edges = [];
    const declared = new Set();
    const wantedCmds = new Set();
    for (const p of phases) {
      const pid = get(p, "id");
      lines.push(`  subgraph ${nid("ph", pid)}["${strOrEmpty(get(p, "order", ""))} - ${label(get(p, "name", pid))}"]`);
      lines.push("    direction LR");
      let prev = null;
      for (const e of this.phaseEvents(pid)) {
        const eid = nid("e", e.id);
        const cls = this.pivotal.has(e.id) ? "pivotal" : "event";
        lines.push(`    ${eid}["${label(get(e, "name", e.id))}"]:::${cls}`);
        if (prev) edges.push(`  ${prev} ~~~ ${eid}`);
        prev = eid;
        const cmd = this.commands.get(get(e, "triggered_by"));
        if (cmd) {
          const cid = nid("c", cmd.id);
          if (!declared.has(cid)) {
            const actorName = this.who.get(get(cmd, "actor"));
            const lab = truthy(actorName)
              ? `${label(actorName)}<br/>${label(get(cmd, "name", cmd.id))}`
              : label(get(cmd, "name", cmd.id));
            lines.push(`    ${cid}["${lab}"]:::command`);
            declared.add(cid);
            for (const r of this.rmByCmd.get(cmd.id) ?? []) {
              const rid = nid("r", get(r, "id"));
              if (!declared.has(rid)) {
                lines.push(`    ${rid}(["${label(get(r, "name", get(r, "id")))}"]):::readmodel`);
                declared.add(rid);
              }
              edges.push(`  ${rid} -.-> ${cid}`);
            }
          }
          edges.push(`  ${cid} --> ${eid}`);
        } else if (this.externals.has(get(e, "actor"))) {
          const xid = nid("x", e.actor);
          if (!declared.has(xid)) {
            lines.push(`    ${xid}[["${label(this.who.get(e.actor))}"]]:::external`);
            declared.add(xid);
          }
          edges.push(`  ${xid} --> ${eid}`);
        }
        for (const h of this.hsByNear.get(e.id) ?? []) {
          const hid = nid("h", get(h, "id"));
          lines.push(`    ${hid}>"${label(get(h, "id"))}: ${label(get(h, "text"), 60)}"]:::hotspot`);
          edges.push(`  ${eid} -.- ${hid}`);
        }
        for (const pol of this.polByWhen.get(e.id) ?? []) {
          const polid = nid("p", get(pol, "id"));
          lines.push(`    ${polid}{{"${label(get(pol, "name", get(pol, "id")), 70)}"}}:::policy`);
          edges.push(`  ${eid} --> ${polid}`);
          for (const t of listOr(get(pol, "then"))) {
            const tc = this.commands.get(t);
            if (!tc) continue;
            const targetPhase = this.cmdPhase.has(t) ? this.cmdPhase.get(t) : null;
            if (split && !subset.has(targetPhase)) {
              const stub = nid("stub", t);
              if (!declared.has(stub)) {
                lines.push(`    ${stub}["${label(get(tc, "name", t))} -> ${label(this.phaseName.has(targetPhase) ? this.phaseName.get(targetPhase) : "later")}"]:::command`);
                declared.add(stub);
              }
              edges.push(`  ${polid} --> ${stub}`);
            } else {
              wantedCmds.add(t);
              edges.push(`  ${polid} --> ${nid("c", t)}`);
            }
          }
        }
      }
      lines.push("  end");
    }
    for (const t of [...wantedCmds].sort(cmpStr)) {
      const cid = nid("c", t);
      if (!declared.has(cid)) {
        const tc = this.commands.get(t);
        const actorName = this.who.get(get(tc, "actor"));
        const lab = truthy(actorName)
          ? `${label(actorName)}<br/>${label(get(tc, "name", t))}`
          : label(get(tc, "name", t));
        lines.push(`  ${cid}["${lab}"]:::command`);
        declared.add(cid);
      }
    }
    lines.push(...edges);
    lines.push("```");
    return lines;
  }

  // ---------- markdown ----------
  phaseTable(events) {
    const out = ["| # | Event | Triggered by | Actor | Read model | Whenever this, then | Notes |",
      "|---|---|---|---|---|---|---|"];
    for (const e of events) {
      const cmd = this.commands.get(get(e, "triggered_by"));
      let name = `**${cell(get(e, "name", e.id))}**`;
      if (this.pivotal.has(e.id)) name += " (pivotal)";
      for (const h of this.hsByNear.get(e.id) ?? []) name += ` [${cell(get(h, "id"))}]`;
      name += " " + code(e.id);
      let trig;
      if (cmd) trig = `${cell(get(cmd, "name", cmd.id))} ${code(cmd.id)}`;
      else if (this.externals.has(get(e, "actor"))) trig = `external: ${cell(this.who.get(e.actor))}`;
      else trig = "(no command)";
      const actor = firstTruthy(this.who.get(get(e, "actor")), cmd ? this.who.get(get(cmd, "actor")) : null, "");
      const rms = cmd ? (this.rmByCmd.get(cmd.id) ?? []).map((r) => cell(get(r, "name", get(r, "id")))).join(", ") : "";
      const pols = [];
      for (const pol of this.polByWhen.get(e.id) ?? []) {
        const thens = listOr(get(pol, "then")).map((t) => cell(get(this.commands.get(t) ?? {}, "name", t))).join(", ");
        pols.push(`${thens}${get(pol, "kind", "automatic") === "automatic" ? "" : " (manual)"}`);
      }
      let notes = cell(get(e, "description", ""));
      if (truthy(get(e, "data"))) notes = (notes ? notes + " - " : "") + "data: " + listOr(e.data).map(cell).join(", ");
      out.push(`| ${cell(get(e, "sequence", ""))} | ${name} | ${trig} | ${cell(actor)} | ${rms} | ${pols.join("; ") || ""} | ${notes} |`);
    }
    return out;
  }

  hotspotLines(events) {
    const out = [];
    for (const e of events) {
      for (const h of this.hsByNear.get(e.id) ?? []) {
        out.push(`- **${cell(get(h, "id"))}** (${cell(get(h, "kind"))}, near ${code(e.id)}): ${cell(get(h, "text"))}`);
      }
    }
    return out;
  }

  render(title, splitMode) {
    const d = this.d;
    const evAll = this.allEvents();
    const nEv = evAll.length;
    const split = splitMode === "always" || (splitMode === "auto" && nEv > SPLIT_THRESHOLD);
    const depth = get(d, "depth", "standard");
    const out = [`# Event storm - ${title}`, "",
      `_Step 2 (discover) - produced by \`${pyStr(get(d, "produced_by", "ddd-discover"))}\` - mode \`${pyStr(get(d, "mode", "?"))}\` - depth \`${pyStr(depth)}\` - ${pyStr(get(d, "produced_at", "?"))}_`,
      `_Inputs: ${listOr(get(d, "inputs")).map(code).join(", ")}_`, "",
      "> Rendered from `discover.json` by `ddd discover render`. The JSON is the chain: edit it " +
      "(or re-run `/ddd-discover`) and re-render rather than editing this file by hand.", ""];
    out.push("## How to read this board", "", "| Sticky | Meaning |", "|---|---|");
    out.push(...LEGEND.map(([a, b]) => `| ${a} | ${b} |`));
    out.push("", "## Summary", "");
    let bandNote = "";
    if (has(DEPTH_BANDS, depth)) {
      const [lo, hi] = DEPTH_BANDS[depth];
      bandNote = ` (depth \`${pyStr(depth)}\` expects roughly ${lo}-${hi})`;
    }
    const pivSorted = sortedBy([...this.pivotal], (i) => (this.events.has(i) ? this.ekey(this.events.get(i)) : [10 ** 9, 0, i]));
    out.push(`- **${nEv} events** in **${this.phases.length} phases**${bandNote}; **${this.pivotal.size} pivotal**: ${
      pivSorted.map((p) => (this.events.has(p) ? `${cell(get(this.events.get(p), "name"))} (${cell(p)})` : cell(p))).join(", ") || "none"}`);
    out.push(`- ${this.commands.size} commands, ${this.policies.length} policies, ${this.readModels.length} read models, ${this.actors.size} actors, ${this.externals.size} external systems, ${this.aggregates.length} aggregate candidates`);
    const oq = listOr(get(d, "open_questions"));
    out.push(`- ${this.hotspots.length} hotspots, ${this.scenarios.length} scenarios, ${this.glossary.length} glossary terms, ${listOr(get(d, "assumptions")).length} assumptions, ${oq.length} open questions (${oq.filter((q) => truthy(get(q, "blocking"))).length} blocking)`);
    out.push("");
    out.push("## Timeline", "");
    if (this.phases.length) {
      out.push(this.phases.map((p) => `${strOrEmpty(get(p, "order", ""))}. ${cell(get(p, "name", get(p, "id")))}`).join(" -> "));
      out.push("");
    }
    for (const p of this.phases) {
      const evs = this.phaseEvents(get(p, "id"));
      out.push(`### Phase ${cell(get(p, "order", ""))} - ${cell(get(p, "name", get(p, "id")))}`);
      out.push("");
      out.push(`_${evs.length} events - id ${code(get(p, "id"))}_`);
      out.push("");
      out.push(...(evs.length ? this.phaseTable(evs) : ["(no events in this phase yet)"]));
      const hs = this.hotspotLines(evs);
      if (hs.length) out.push("", "Hotspots in this phase:", "", ...hs);
      out.push("");
      if (split && evs.length) out.push(...this.diagram([p], true), "");
    }
    const un = this.unphased();
    if (un.length) {
      out.push("### Unphased events", "", "_Events whose `phase` is not in `phases[]` - fix the JSON._", "");
      out.push(...this.phaseTable(un), "");
    }
    if (!split && evAll.length) {
      out.push("## Board (mermaid)", "",
        "_Orange = event (bold border = pivotal), blue = command (actor on the first line), lilac = policy, " +
        "green = read model, pink = external system, magenta = hotspot._", "");
      out.push(...this.diagram(this.phases, false), "");
    }
    // collections
    out.push("## Actors", "", "| Actor | id | From understand |", "|---|---|---|");
    out.push(...orElse([...this.actors.values()].map((a) => `| ${cell(get(a, "name"))} | ${code(get(a, "id"))} | ${code(get(a, "from_understand")) || "(new)"} |`), ["| (none) | | |"]));
    out.push("", "## External systems", "", "| System | id | Description |", "|---|---|---|");
    out.push(...orElse([...this.externals.values()].map((x) => `| ${cell(get(x, "name"))} | ${code(get(x, "id"))} | ${cell(get(x, "description", ""))} |`), ["| (none) | | |"]));
    out.push("", "## Commands", "", "| Command | id | Actor | Produces | Description |", "|---|---|---|---|---|");
    for (const c of this.commands.values()) {
      const who = this.who.get(get(c, "actor"));
      const actor = truthy(who) ? who : (get(c, "actor") === null ? "(policy / system)" : cell(get(c, "actor")));
      out.push(`| ${cell(get(c, "name"))} | ${code(c.id)} | ${cell(actor)} | ${listOr(get(c, "produces")).map(code).join(", ")} | ${cell(get(c, "description", ""))} |`);
    }
    out.push("", "## Policies", "", "| Policy | Whenever | Then | Kind |", "|---|---|---|---|");
    out.push(...orElse(this.policies.map((pol) => `| ${cell(get(pol, "name"))} ${code(get(pol, "id"))} | ${code(get(pol, "when"))} | ${listOr(get(pol, "then")).map(code).join(", ")} | ${cell(get(pol, "kind", ""))} |`), ["| (none) | | | |"]));
    out.push("", "## Read models", "", "| Read model | id | Informs | Used by |", "|---|---|---|---|");
    out.push(...orElse(this.readModels.map((r) => {
      const ub = get(r, "used_by");
      return `| ${cell(get(r, "name"))} | ${code(get(r, "id"))} | ${code(get(r, "informs"))} | ${cell(this.who.has(ub) ? this.who.get(ub) : (truthy(ub) ? ub : ""))} |`;
    }), ["| (none) | | | |"]));
    if (this.aggregates.length) {
      out.push("", "## Aggregate candidates", "",
        "_Outside-in: the thing that receives these commands and decides, then emits these events. " +
        "Candidates only - ddd-code designs them._", "",
        "| Aggregate | id | Handles | Emits |", "|---|---|---|---|");
      out.push(...this.aggregates.map((a) => `| ${cell(get(a, "name"))} | ${code(get(a, "id"))} | ${listOr(get(a, "handles")).map(code).join(", ")} | ${listOr(get(a, "emits")).map(code).join(", ")} |`));
    }
    out.push("", "## Pivotal events", "");
    const piv = evAll.filter((e) => this.pivotal.has(e.id));
    out.push(...orElse(piv.map((e) => `- **${cell(get(e, "name"))}** ${code(e.id)} - seq ${cell(get(e, "sequence"))}, phase ${cell(this.phaseName.has(get(e, "phase")) ? this.phaseName.get(get(e, "phase")) : get(e, "phase"))}`),
      ["(none marked - decompose will struggle to find boundaries)"]));
    out.push("", "## Hotspots", "", "| id | Kind | Near | Finding |", "|---|---|---|---|");
    out.push(...orElse(this.hotspots.map((h) => `| ${cell(get(h, "id"))} | ${cell(get(h, "kind"))} | ${code(get(h, "near")) || ""} | ${cell(get(h, "text"))} |`), ["| (none) | | | |"]));
    out.push("", "## Scenarios", "");
    for (const s of this.scenarios) {
      const actors = listOr(get(s, "actors")).map((a) => cell(this.who.has(a) ? this.who.get(a) : a)).join(", ");
      out.push(`**${cell(get(s, "id"))} - ${cell(get(s, "name"))}**${actors ? ` (${actors})` : ""}${truthy(get(s, "loops")) ? " _(loops)_" : ""}`);
      out.push("");
      out.push(listOr(get(s, "events")).map((e) => cell(get(this.events.get(e) ?? {}, "name", e))).join(" -> "));
      out.push("");
    }
    if (!this.scenarios.length) out.push("(none)", "");
    out.push("## Glossary seed (system-wide, context: null)", "", "| Term | Definition | Avoid |", "|---|---|---|");
    out.push(...orElse(this.glossary.map((g) => `| **${cell(get(g, "term"))}** | ${cell(get(g, "definition"))} | ${listOr(get(g, "avoid")).map(cell).join(", ")} |`), ["| (none) | | |"]));
    out.push("", "## Assumptions", "");
    out.push(...orElse(listOr(get(d, "assumptions")).map((a) => `- **${cell(get(a, "id"))}** (${cell(get(a, "confidence"))}): ${cell(get(a, "text"))}`), ["(none)"]));
    out.push("", "## Open questions", "");
    out.push(...orElse(oq.map((q) => `- **${cell(get(q, "id"))}**${truthy(get(q, "blocking")) ? " (blocking)" : ""}: ${cell(get(q, "text"))}${truthy(get(q, "owner")) ? ` - owner: ${cell(get(q, "owner"))}` : ""}`), ["(none)"]));
    out.push("", "## Notes for downstream", "",
      "_Findings addressed to later steps (contract section 3). Only the JSON reaches them; this list is the human view._", "");
    out.push(...orElse(dicts(get(d, "notes_for_downstream")).map((n) => `- **${cell(get(n, "id"))}** (${cell(get(n, "kind", "other"))} -> ${listOr(get(n, "for")).map(cell).join(", ")}): ${cell(get(n, "text"))}`), ["(none)"]));
    if (truthy(get(d, "deprecated"))) {
      out.push("", "## Deprecated (kept for id stability)", "");
      for (const x of listOr(d.deprecated)) out.push(`- ${cell(isDict(x) || Array.isArray(x) ? pyDumps(x) : x)}`);
    }
    out.push("");
    out.splice(2, 0, ...plainWordsBlock(d));
    return out.join("\n");
  }
}

function groupBy(items, keyOf) {
  const m = new Map();
  for (const x of items) {
    const k = keyOf(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

// `a or b or c` on strings and None.
function firstTruthy(...xs) {
  for (const x of xs) if (truthy(x)) return x;
  return xs[xs.length - 1];
}

function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const SPEC = {
  options: {
    "--output": { dest: "output", aliases: ["-o"] },
    "--split": { dest: "split", choices: ["auto", "always", "never"], default: "auto" },
    "--title": { dest: "title" },
    "--stdout": { dest: "stdout", action: "store_true" },
  },
  positionals: [{ dest: "discover_json" }],
};

export async function main(argv) {
  return runCommand({
    prog: "ddd discover render",
    usage: "<discover.json> [-o <event-storm.md>] [--split auto|always|never] [--title \"Project title\"] [--stdout]",
    doc: DOC, spec: SPEC,
  }, argv, (a) => {
    const err = (s) => process.stderr.write(s);
    const { doc: d, error } = readJson(a.discover_json);
    if (error !== undefined) { err(`error: cannot read ${a.discover_json}: ${error}\n`); return 2; }
    if (!isDict(d)) { err("error: discover.json must be an object\n"); return 2; }
    // The manifest sits next to the ddd folder that holds 02-discover/, two levels up.
    const dddDir = path.dirname(path.dirname(path.resolve(a.discover_json)));
    const text = new Board(d).render(manifestTitle(dddDir, a.title), a.split);
    if (a.stdout) { process.stdout.write(text); return 0; }
    const out = truthy(a.output) ? a.output : path.join(path.dirname(path.resolve(a.discover_json)), "event-storm.md");
    try {
      fs.writeFileSync(out, text);
    } catch (e) {
      err(`error: cannot write ${out}: ${e.message}\n`);
      return 2;
    }
    process.stdout.write(`wrote ${path.resolve(out)} (${(text.match(/\n/g) || []).length} lines)\n`);
    return 0;
  });
}

export default main;
