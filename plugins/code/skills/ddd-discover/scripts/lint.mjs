// `ddd discover lint <discover.json> [--depth light|standard|deep]`: the port of
// lint_discover.py. Method lint for discover.json: review notes only, never a gate.
//
// It checks the EventStorming grammar a schema cannot: past-tense event names,
// imperative commands, "whenever ... then" policies, kebab-case ids, sequence order
// across phases, pivotal-flag consistency, trigger rules, glossary hygiene, depth
// bands, and whether every conflict hotspot also travels as a notes_for_downstream
// entry. Every note is printed word for word as the Python printed it. Always exits 0,
// even when the input cannot be read (the Python prints the error and returns 0).
import {
  byId, dicts, get, has, listOr, pyRepr, pyStr, readJson, runCommand, sortedBy, truthy,
} from "./_args.mjs";

// Python's `$` also matches just before a trailing newline, hence the `\n?`.
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*\n?$/;
const NOTE_KINDS = ["language", "boundary", "process", "risk", "decision", "other"];
const DEPTH_BANDS = { light: [10, 25], standard: [25, 60], deep: [60, 150] };
const SCENARIO_BANDS = { light: [1, 2], standard: [2, 4], deep: [3, 6] };
const IRREGULAR = new Set([
  "chosen", "sent", "paid", "built", "made", "won", "lost", "sold", "bought", "taken", "given", "left",
  "put", "set", "cut", "split", "held", "kept", "met", "read", "run", "begun", "written", "seen", "found",
  "told", "shown", "withdrawn", "done", "gone", "become", "broken", "frozen", "hidden", "forgotten", "got",
  "hit", "let", "shut", "spent", "spread", "lent", "bound", "bent", "fed", "led", "laid", "said", "sought",
  "taught", "caught", "brought", "thought", "fought", "understood", "stood", "struck", "stuck", "swept",
  "torn", "worn", "drawn", "flown", "thrown", "blown", "grown", "known", "sworn", "risen", "rung", "sung",
  "sunk", "shrunk", "overdue", "due", "reset", "quit", "upset", "rerun", "overridden", "undone", "redone",
  "resent", "reopened", "born", "woken", "lit", "fit", "sat", "slid", "sped", "wound", "unpaid",
  "upheld", "withheld", "overrun", "overtaken", "undertaken", "retaken", "mistaken", "rewritten", "overwritten",
  "underwritten", "rebuilt", "resold", "unsold", "oversold", "unmet", "unread", "unseen", "unsent", "unset",
  "unspent", "unbound", "unfrozen", "outbid", "forgiven", "arisen", "fallen", "foreseen", "overseen", "stolen",
  "spun", "sprung", "swung", "stung", "hung", "clung", "flung", "strung", "dealt", "felt", "meant", "burnt",
  "learnt", "spoilt", "leapt", "crept", "slept", "misled", "mislaid", "overlaid", "overthrown", "overdrawn",
  "overpaid", "underpaid", "prepaid", "repaid", "overspent", "foregone", "forgone", "forsaken", "proven",
  "cast", "forecast", "recast", "broadcast", "offset", "outgrown", "shed", "shot", "won", "dug", "shone",
]);
// "<Noun> Marked <Adjective>" is a past-tense fact even though the last word is an adjective.
const MARKED_AS = new Set(["marked", "deemed", "declared", "flagged", "judged", "ruled", "found", "rated", "classified", "considered"]);
const LATER_STEPS = ["decompose", "strategize", "connect", "organise", "define", "code"];
const STOP = new Set([
  "the", "that", "this", "with", "what", "when", "which", "from", "does", "mean", "means", "same", "thing",
  "things", "word", "words", "term", "whether", "they", "them", "their", "there", "have", "been", "into", "than",
  "then", "also", "only", "each", "both", "some", "more", "most", "after", "before", "because", "about", "between",
  "while", "where", "every", "will", "would", "should", "could", "must", "people", "nobody", "agree", "agrees",
  "different", "differently", "matter", "matters", "boundary", "context", "decompose", "define", "treat",
]);
const QUOTED = /["'*‘’“”]([A-Za-z][A-Za-z -]{0,30}?)["'*‘’“”]/g;
const TECHNICAL = new Set([
  "inserted", "updated", "deleted", "saved", "persisted", "stored", "fetched", "loaded", "rendered",
  "clicked", "synced", "cached", "record", "row", "table", "database", "db", "api", "endpoint", "json",
  "button", "screen", "page", "payload", "dto", "entity", "serialized", "queued",
]);
const SOLUTION_WORDS = ["fix ", "implement ", "add ", "use ", "build ", "refactor ", "migrate "];
const PARTICLES = new Set(["up", "in", "out", "off", "on", "over", "down", "back", "away", "through"]);

const DOC = `ddd validate is the pass/fail gate (schema + cross-references). This command checks the
EventStorming grammar that a schema cannot: past-tense event names, imperative commands,
"whenever ... then" policies, kebab-case ids, sequence order across phases, pivotal-flag
consistency, trigger rules, glossary hygiene, depth bands, and whether every conflict hotspot
also travels as a notes_for_downstream entry (prose does not reach decompose). Every line is a
note for the author to judge; the tense heuristics can be wrong for irregular verbs. Always exits 0.`;

// `[x.get(key) for x in items if isinstance(x, dict) and x.get(key) is not None]`
function ids(items, key = "id") {
  return dicts(items).map((x) => get(x, key)).filter((v) => v !== null);
}

// re.split(r"[^A-Za-z0-9']+", str(name or "")) without the empty pieces.
function words(name) {
  return (truthy(name) ? pyStr(name) : "").split(/[^A-Za-z0-9']+/).filter(Boolean);
}

function contentWords(text) {
  const out = new Set();
  for (const m of (truthy(text) ? pyStr(text) : "").toLowerCase().matchAll(/[a-z]{4,}/g)) {
    if (!STOP.has(m[0])) out.add(m[0]);
  }
  return out;
}

function quoted(text) {
  return new Set([...text.matchAll(QUOTED)].map((m) => m[1].toLowerCase()));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}

// A downstream note covers a hotspot if it names the hotspot id, shares a quoted term, or shares two content words.
function noteCovers(n, h) {
  const nt = pyStr(get(n, "text", ""));
  const ht = pyStr(get(h, "text", ""));
  if (truthy(get(h, "id")) && new RegExp(`\\b${escapeRe(pyStr(h.id))}\\b`).test(nt)) return true;
  const qn = quoted(nt);
  for (const q of quoted(ht)) if (qn.has(q)) return true;
  const cn = contentWords(nt);
  let shared = 0;
  for (const w of contentWords(ht)) if (cn.has(w)) shared++;
  return shared >= 2;
}

// Python `x in <set of ids>` where both sides are raw JSON values.
const inSet = (set, v) => set.has(v);

function lint(d, depthFlag) {
  const notes = [];
  const note = (where, msg) => notes.push(`note: ${where}: ${msg}`);

  const depth = truthy(depthFlag) ? depthFlag : get(d, "depth", "standard");
  const actors = byId(get(d, "actors"));
  const externals = byId(get(d, "external_systems"));
  // by_id keeps ids that are not None; the Python's dict comprehensions here keep truthy ids only.
  for (const m of [actors, externals]) for (const k of [...m.keys()]) if (!truthy(k)) m.delete(k);
  const knownWho = new Set([...actors.keys(), ...externals.keys()]);
  const events = dicts(get(d, "events"));
  const commands = dicts(get(d, "commands"));
  const policies = dicts(get(d, "policies"));
  const readModels = dicts(get(d, "read_models"));
  const hotspots = dicts(get(d, "hotspots"));
  const scenarios = dicts(get(d, "scenarios"));
  const glossary = dicts(get(d, "glossary"));
  const phases = sortedBy(dicts(get(d, "phases")), (p) => [get(p, "order", 0), pyStr(get(p, "id"))]);
  const evById = new Map(events.map((e) => [get(e, "id"), e]));
  const cmdById = new Map(commands.map((c) => [get(c, "id"), c]));
  const policyTargets = new Set(policies.flatMap((p) => listOr(get(p, "then"))));

  // ids
  for (const coll of ["actors", "external_systems", "phases", "events", "commands", "policies", "read_models", "aggregate_candidates"]) {
    for (const i of ids(get(d, coll))) {
      if (!KEBAB.test(pyStr(i))) note(`${coll}[${pyStr(i)}]`, "id is not a kebab-case slug (downstream steps reference it verbatim)");
    }
  }
  for (const [coll, prefix] of [["hotspots", "H"], ["scenarios", "S"], ["assumptions", "A"], ["open_questions", "Q"], ["notes_for_downstream", "N"]]) {
    for (const i of ids(get(d, coll))) {
      if (!new RegExp(`^${prefix}\\d+\\n?$`).test(pyStr(i))) note(`${coll}[${pyStr(i)}]`, `expected a short code like ${prefix}1`);
    }
  }

  // events
  for (const e of events) {
    const eid = get(e, "id");
    const w = words(get(e, "name"));
    if (w.length) {
      let last = w[w.length - 1].toLowerCase();
      if (PARTICLES.has(last) && w.length >= 2) last = w[w.length - 2].toLowerCase(); // phrasal verbs: Signed Up, Checked In
      let past = last.endsWith("ed") || IRREGULAR.has(last);
      if (!past && w.length >= 3 && w.slice(1, -1).some((x) => MARKED_AS.has(x.toLowerCase()))) past = true; // Job Marked Incomplete
      if (!past) note(`events[${pyStr(eid)}]`, `name '${pyStr(get(e, "name"))}' does not read as past tense - events are facts that happened (Order Placed)`);
      const tech = w.filter((x) => TECHNICAL.has(x.toLowerCase()));
      if (tech.length) note(`events[${pyStr(eid)}]`, `sounds technical (${tech.join(", ")}) - what is the business fact behind it?`);
    }
    if (!truthy(get(e, "triggered_by"))) {
      if (externals.has(get(e, "actor"))) {
        // external fact: allowed
      } else {
        note(`events[${pyStr(eid)}]`, "no triggered_by command and actor is not an external system - time-based? " +
          "give it a command whose actor is the clock (external_systems[] id 'clock'), or set actor to the external system that reports it");
      }
    }
    const actor = get(e, "actor");
    if (actor !== null && !inSet(knownWho, actor)) {
      note(`events[${pyStr(eid)}]`, `actor '${pyStr(actor)}' is not declared in actors[] or external_systems[]${
        actor === "clock" ? " - declare {id: clock, name: Clock} in external_systems[] once" : ""}`);
    }
    if (truthy(get(e, "pivotal")) && !listOr(get(d, "pivotal_events")).includes(eid)) {
      note(`events[${pyStr(eid)}]`, "pivotal: true but missing from pivotal_events[]");
    }
    if (!truthy(get(e, "data"))) note(`events[${pyStr(eid)}]`, "no data[] - ddd-code will want to know what this event carries (ids at least)");
  }
  for (const p of listOr(get(d, "pivotal_events"))) {
    if (evById.has(p) && !truthy(get(evById.get(p), "pivotal"))) {
      note("pivotal_events", `'${pyStr(p)}' listed but events[${pyStr(p)}].pivotal is not true`);
    }
  }
  const piv = listOr(get(d, "pivotal_events")).filter((p) => evById.has(p));
  if (events.length) {
    const ordered = sortedBy(events, (e) => [get(e, "sequence", 0), pyStr(get(e, "id"))]);
    const first = get(ordered[0], "id");
    const last = get(ordered[ordered.length - 1], "id");
    if (piv.length && piv.includes(first)) note("pivotal_events", `'${pyStr(first)}' is the very first event - pivotal events split the flow, so they sit in the middle`);
    if (piv.length && piv.includes(last)) note("pivotal_events", `'${pyStr(last)}' is the very last event - pivotal events split the flow, so they sit in the middle`);
  }
  if (piv.length > 9) note("pivotal_events", `${piv.length} pivotal events - keep the 3-7 that really change the phase; the rest are just important`);

  // sequences across phases
  const isInt = (v) => typeof v === "boolean" || (typeof v === "number" && Number.isInteger(v));
  const seqs = events.map((e) => get(e, "sequence")).filter(isInt);
  const counts = new Map();
  for (const s of seqs) counts.set(Number(s), (counts.get(Number(s)) ?? 0) + 1);
  const dup = [...counts].filter(([, n]) => n > 1).map(([s]) => s).sort((a, b) => a - b);
  if (dup.length) note("events", `duplicate sequence numbers ${pyRepr(dup)} - the timeline must be a total order`);
  let prevMax = null;
  let prevName = null;
  for (const p of phases) {
    const ps = events.filter((e) => get(e, "phase") === get(p, "id")).map((e) => get(e, "sequence")).filter(isInt).map(Number);
    if (!ps.length) { note(`phases[${pyStr(get(p, "id"))}]`, "phase has no events"); continue; }
    const lo = Math.min(...ps);
    if (prevMax !== null && lo < prevMax) {
      note(`phases[${pyStr(get(p, "id"))}]`, `sequence ${lo} is lower than ${prevMax} in the earlier phase '${pyStr(prevName)}' - sequences are global and must follow phase order`);
    }
    prevMax = Math.max(...ps);
    prevName = get(p, "id");
  }
  if (seqs.length > 2) {
    const s = seqs.map(Number).sort((a, b) => a - b);
    if (s.slice(1).every((b, i) => b - s[i] === 1)) note("events", "sequences are consecutive - use gaps (10, 20, 30) so inserts are cheap");
  }

  // commands
  const eventNames = new Set(events.map((e) => pyStr(get(e, "name", "")).trim().toLowerCase()));
  for (const c of commands) {
    const cid = get(c, "id");
    const w = words(get(c, "name"));
    if (w.length && (w[0].toLowerCase().endsWith("ed") || w[0].toLowerCase().endsWith("ing"))) {
      note(`commands[${pyStr(cid)}]`, `name '${pyStr(get(c, "name"))}' does not read as an imperative (Place Order)`);
    }
    if (eventNames.has(pyStr(get(c, "name", "")).trim().toLowerCase())) {
      note(`commands[${pyStr(cid)}]`, `command and event share the name '${pyStr(get(c, "name"))}' - command is the intent, event the fact`);
    }
    if (!truthy(get(c, "produces"))) note(`commands[${pyStr(cid)}]`, "produces nothing - every command must lead to at least one event (or it is not a command)");
    const actor = get(c, "actor");
    if (actor === null && !policyTargets.has(cid)) note(`commands[${pyStr(cid)}]`, "no actor and no policy issues it - who or what decides to run this?");
    if (actor !== null && !inSet(knownWho, actor)) {
      note(`commands[${pyStr(cid)}]`, `actor '${pyStr(actor)}' is not declared in actors[] or external_systems[]${
        actor === "clock" ? " - declare {id: clock, name: Clock} in external_systems[] once" : ""}`);
    }
  }

  // policies
  for (const p of policies) {
    const name = pyStr(get(p, "name", "")).trim().toLowerCase();
    if (!(name.startsWith("whenever") || name.startsWith("when "))) {
      note(`policies[${pyStr(get(p, "id"))}]`, "name should read 'Whenever <event>, <do command>' so the rule is explicit");
    }
    if (!truthy(get(p, "then"))) note(`policies[${pyStr(get(p, "id"))}]`, "then[] is empty - a policy that does nothing is a hotspot, not a policy");
  }

  // read models
  for (const r of readModels) {
    if (!cmdById.has(get(r, "informs"))) {
      note(`read_models[${pyStr(get(r, "id"))}]`, `informs '${pyStr(get(r, "informs"))}' is not a command - a read model exists to inform a decision`);
    }
    const usedBy = get(r, "used_by");
    if (usedBy !== null && !inSet(knownWho, usedBy)) note(`read_models[${pyStr(get(r, "id"))}]`, `used_by '${pyStr(usedBy)}' is not a declared actor`);
  }

  // hotspots
  for (const h of hotspots) {
    const near = get(h, "near");
    if (near !== null && !evById.has(near)) note(`hotspots[${pyStr(get(h, "id"))}]`, `near '${pyStr(near)}' is not an event id`);
    const t = pyStr(get(h, "text", "")).trim().toLowerCase();
    if (SOLUTION_WORDS.some((s) => t.startsWith(s))) note(`hotspots[${pyStr(get(h, "id"))}]`, "reads like a solution - record the question, disagreement or risk instead");
    if ([...t].length < 15) note(`hotspots[${pyStr(get(h, "id"))}]`, "text is very short - say what is unclear/contested and why it matters");
  }
  if (!hotspots.length) note("hotspots", "none recorded - a storm with no disagreements or unknowns is unusual; check the assumptions list");

  // notes for downstream (contract section 3): the JSON reaches decompose, the Markdown prose does not
  const downstream = dicts(get(d, "notes_for_downstream"));
  for (const n of downstream) {
    const nid = get(n, "id");
    if (!pyStr(get(n, "text", "")).trim()) note(`notes_for_downstream[${pyStr(nid)}]`, "empty text - the note is all the next step will see");
    const fr = get(n, "for");
    if (!truthy(fr) || listOr(fr).some((s) => !LATER_STEPS.includes(s))) {
      note(`notes_for_downstream[${pyStr(nid)}]`, `for[] should name later steps only (${LATER_STEPS.join("|")}); got ${pyStr(fr)}`);
    }
    if (!NOTE_KINDS.includes(get(n, "kind"))) {
      note(`notes_for_downstream[${pyStr(nid)}]`, `kind ${pyRepr(get(n, "kind"))} is not one of ${NOTE_KINDS.join("|")} - it tells the next step how to use the note`);
    }
  }
  for (const h of hotspots) {
    if (get(h, "kind") === "conflict" && !downstream.some((n) => noteCovers(n, h))) {
      note(`hotspots[${pyStr(get(h, "id"))}]`, "conflict hotspot with no notes_for_downstream entry - decompose never sees hotspot prose; " +
        "name the hotspot id in a note, or add one with kind: language, for: [decompose, define] if it is about vocabulary");
    }
  }

  // scenarios
  {
    const [lo, hi] = has(SCENARIO_BANDS, depth) ? SCENARIO_BANDS[depth] : [1, 6];
    if (scenarios.length < lo) {
      note("scenarios", `${scenarios.length} scenarios; depth ${pyStr(depth)} expects ${lo}-${hi} (happy path + alternatives that exercise policies)`);
    }
  }
  for (const s of scenarios) {
    const seq = listOr(get(s, "events")).filter((e) => evById.has(e)).map((e) => get(evById.get(e), "sequence", 0));
    if (seq.slice(1).some((b, i) => b < seq[i]) && !truthy(get(s, "loops"))) {
      note(`scenarios[${pyStr(get(s, "id"))}]`, "events are not in timeline order - a deliberate loop/retry? say so with \"loops\": true; otherwise a mistake");
    }
    if (listOr(get(s, "events")).length < 2) note(`scenarios[${pyStr(get(s, "id"))}]`, "fewer than two events - a scenario is a story, not a single fact");
  }

  // glossary
  const boardText = ["events", "commands", "read_models", "aggregate_candidates", "actors", "external_systems"]
    .flatMap((coll) => dicts(get(d, coll)).map((x) => pyStr(get(x, "name", "")) + " " + pyStr(get(x, "description", ""))))
    .join(" ").toLowerCase();
  const seen = new Set();
  for (const g of glossary) {
    const term = pyStr(get(g, "term", "")).trim();
    const ctx = get(g, "context");
    if (!(ctx === null || ctx === "")) note(`glossary[${term}]`, "context must be null at this stage (ddd-define assigns contexts)");
    if (seen.has(term.toLowerCase())) note(`glossary[${term}]`, "duplicate term");
    seen.add(term.toLowerCase());
    const stem = term.toLowerCase().replace(/s+$/, "");
    if (stem && !boardText.includes(stem)) note(`glossary[${term}]`, "term does not appear in any event/command/read model name or description - is it really on the board?");
    if (!truthy(get(g, "avoid"))) note(`glossary[${term}]`, "no avoid[] words - if nobody ever uses a synonym, fine; otherwise record the words to avoid");
  }
  if (glossary.length < 5) note("glossary", `${glossary.length} terms - the nouns in your events/commands usually give 5-15 shared terms`);

  // depth band
  {
    const [lo, hi] = has(DEPTH_BANDS, depth) ? DEPTH_BANDS[depth] : [10, 150];
    if (events.length < lo) {
      note("events", `${events.length} events; depth ${pyStr(depth)} usually needs ${lo}-${hi} - missing failure paths, time-based events, or the ends of the timeline?`);
    } else if (events.length > hi) {
      note("events", `${events.length} events; depth ${pyStr(depth)} usually stays within ${lo}-${hi} - merge design-level detail into single business facts`);
    }
  }
  return notes;
}

const SPEC = {
  options: { "--depth": { dest: "depth", choices: ["light", "standard", "deep"] } },
  positionals: [{ dest: "discover_json" }],
};

export async function main(argv) {
  return runCommand({ prog: "ddd discover lint", usage: "<discover.json> [--depth light|standard|deep]", doc: DOC, spec: SPEC }, argv, (a) => {
    const { doc: d, error } = readJson(a.discover_json);
    if (error !== undefined) {
      process.stderr.write(`error: cannot read ${a.discover_json}: ${error}\n`);
      return 0;
    }
    const notes = lint(d, a.depth);
    process.stdout.write(notes.map((n) => n + "\n").join("") +
      `lint: ${notes.length} notes (review notes, not a gate; ddd validate decides pass/fail)\n`);
    return 0;
  });
}

export default main;
