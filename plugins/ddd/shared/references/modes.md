# Facilitation protocol for `ddd-*` skills (interactive vs auto)

> **Paths:** `${CLAUDE_PLUGIN_ROOT}` below means this plugin's install directory — the absolute
> path already resolved in the SKILL.md that sent you here. Supporting files like this one are
> read raw, so substitute that path yourself; never paste the literal token into a shell.
>
> **Toolchain:** every command is one Node CLI, `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`
> (Node 18 or newer, nothing to install). `ddd <cmd>` below is that call, shortened; run
> `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs --help` for the full list and
> `… <cmd> --help` for a command's flags.


Every DDD step is, in the original process, a workshop: people with domain knowledge stand at a
wall and argue with sticky notes. In Claude Code the wall is a Markdown file and the sticky notes
are JSON ids, but the *shape* of the work is the same: gather what is known, draft fast, then get
the humans to correct it. This file defines how each `ddd-*` skill runs that loop so all nine
behave consistently and can be chained by `ddd-workflow`.

## 0. Resolve the workspace and mode first

1. Find the DDD folder: the user's instruction > `ddd_dir` in an existing `ddd/manifest.json` > `./ddd`.
   Print the absolute path. If there is no manifest, create one with
   `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir <ddd-dir> --project <slug> …`
   (ask for the project name/scale in interactive mode; infer from the repo in auto mode).
2. Decide the mode, in this priority order:
   - The user said "auto", "no questions", "just draft", "don't ask" → `auto`.
   - You are running as a subagent / in a non-interactive run (you cannot ask the user) → `auto`.
   - `manifest.mode` is set → use it.
   - Otherwise → `interactive`.
3. Read `depth` from the manifest (`light` | `standard` | `deep`) and size the work to it.
4. Check the predecessor artifact exists (`inputs` for your step per `artifact-contract.md`).
   - Missing + interactive → say which step is missing and offer three choices: run that step now
     (invoke its skill), bootstrap this step from project docs + a description the user gives, or stop.
   - Missing + auto → if the `Skill` tool can invoke the predecessor, do so; otherwise follow
     `${CLAUDE_PLUGIN_ROOT}/skills/ddd-<step>/SKILL.md` for that step yourself, then continue.
   - Present but `stale` (per `ddd validate --status`) → warn, and in interactive mode ask whether
     to proceed against the stale input or re-run upstream first.

## 1. Gather inputs before drafting (both modes)

Read, in this order, and list what you read in the artifact's `inputs`:

1. The predecessor step JSON (the chain) and `ddd/glossary.md` if present — including every
   `notes_for_downstream[]` entry in *any* earlier step whose `for` names your step (contract §3;
   `ddd validate --status` prints them). Pass-through notes are not re-emitted; only sharpened ones are.
2. `manifest.sources` and obvious project knowledge: `README*`, `CONTEXT.md`, `docs/`, `brainstorm/`,
   ADRs, existing schemas/migrations, API specs, and — for brownfield — the code's module names.
   Existing vocabulary in the repo is evidence for the ubiquitous language; do not invent synonyms.
3. Anything the user pasted or pointed at in the conversation.

Do not ask the user for things the repo already tells you.

## 2. Draft first, then ask (interactive mode)

The draft is the conversation starter. Produce a complete first draft from the inputs, then present
it **in sections of roughly 150–300 words** (one section per major part of the artifact), and after
each section ask what is wrong. Use `AskUserQuestion` with concrete, multiple-choice options where a
real decision exists; use open questions only for domain knowledge you cannot infer.

Question budget: at most **3–4 questions per checkpoint**, and prefer one checkpoint per section. Ask
about hotspots, boundaries, and business rules — never about formatting. If the user says "looks
good" or "continue", stop asking and finish. If they say "just finish it" mid-way, switch to auto for
the rest of the step and log the unasked questions as `open_questions`.

Interactive checkpoints, in order:
1. **Inputs check** — one message: what you read, what you inferred about mode/depth/scale, anything
   surprising. (No question needed unless something is contradictory.)
2. **Section reviews** — the draft, section by section, each ending in ≤4 targeted questions.
3. **Final confirmation** — the list of assumptions and open questions you are about to record,
   and where the files will be written. Then write.

## 3. Auto mode

No questions at all. Proceed on the most reasonable interpretation and make every guess visible:

- Every inference that a domain expert might overturn goes in `assumptions[]` with a confidence.
- Every question you would have asked goes in `open_questions[]` with `blocking: true|false`.
- Prefer the conservative option when a boundary is ambiguous (fewer, larger contexts; a modular
  monolith before services; supporting rather than core when in doubt). It is cheaper for a human
  to split later than to merge.
- Still print the same three checkpoints as short status lines so a human reading the transcript
  can follow — just do not wait for answers.
- **A foundational choice nothing upstream states is a blocking question, not an assumption.** If a
  step has to invent something cross-cutting — the implementation language, the framework, the
  datastore, the cloud — it must go in `open_questions[]` with `blocking: true`, and the artifact
  must stay neutral about it. The failure mode is specific and expensive: a plausible-looking
  inference gets recorded at `high` confidence and then baked into every module path, port name and
  test name in the artifact, so overturning it means rewriting the step rather than editing a field.
  A real run inferred "the platform is C#" from a document that said the opposite, and every path in
  the implementation plan carried it. Being unable to name the language is not a failure of the
  step; naming the wrong one silently is.
- **Be honest about `blocking`.** Across one nine-step run only 1 of 92 open questions was flagged
  blocking, which told the reader nothing. `blocking: true` means *a later step or the build cannot
  proceed correctly until a human answers this*, not *this would be nice to confirm*. Two or three
  real blockers a human can act on beat ninety they will skim past. A step that has one stays
  `draft` (section 4) — `ddd validate` errors on `done` with an unanswered blocking question.

## 3b. Hard decisions: the decision strategist

Some calls cannot be read off an upstream artifact. They have to be argued: where a boundary goes,
whether two contexts merge, core vs supporting, build vs buy, how many deployables, sync vs async,
which context owns an invariant, whether a question is really `blocking`, and above all anything
cross-cutting that nothing upstream states.

For those, dispatch the **`ddd-decision-strategist`** subagent rather than
deciding alone (`subagent_type: "ddd-decision-strategist"`; if the Agent tool reports that name
unknown, use the namespaced `"ddd:ddd-decision-strategist"`, the form a plugin install registers;
the agent file is at `${CLAUDE_PLUGIN_ROOT}/agents/`). Give it: the decision in one sentence, the absolute `<ddd-dir>`, your step name,
and any preference you or the user already hold (it is built to disagree with a stated preference
when the evidence says so). It reads the workspace itself.

It returns three real options with cited pros and cons, the hidden risks, short vs long term, what
information is still missing, one recommendation with the strongest argument against it, three
questions that would change it, and a block telling you exactly what to record.

Use it when:
- the step must invent something foundational (language, framework, datastore, cloud) - **always**
- two or more defensible answers exist and the artifacts do not settle it
- a decision would overturn an upstream note or a canvas `business_decisions` rule
- the user pushes back on a call, or asks "should we", "is it better to", "help me decide"
- you are about to merge, split, or move a boundary

Do not use it for something an artifact already answers, for formatting, or to re-open a decision an
approved `docs/` record has already settled. In interactive mode its three questions are good
material for a checkpoint; in auto mode, record its recommendation with an honest confidence and its
open questions as your own. It never writes artifacts: you record, it advises.

What you record when it returns: a `decisions[]` entry in your step JSON (artifact-contract.md §3)
with the question, its `kind`, and every option it gave you (normally three), each with its pros,
cons and risks, not only the one you took. Add `chosen`, `confidence`, `rationale` and
`would_flip_if` (its three questions, restated as conditions) if you commit; leave `chosen` out if
the call is open. Set `made_by` to `strategist` when you take its recommendation, `user` when a
human chose at a checkpoint, `step` when you decided alone. Then record the call the way you
already do: the chosen option as an `assumptions[]` entry, or a `blocking: true` `open_questions[]`
entry if a human must answer first, and link it from `records.assumption` or
`records.open_question` so the decision and the entry that travels downstream stay tied together.

Before you choose between options that differ in shape (a boundary, a topology, an integration or
a message flow), draw them. Write one diagram spec per option at
`<ddd-dir>/<NN-step>/decisions/<Did>-<opt>.json` (a type suffix such as `D1-C.sequence.json` is
fine) and point `options[].diagram` at it (project-relative, `ddd/03-decompose/decisions/D1-A.json`).
A spec is JSON in the `ddd-diagram-spec` format: `{ "format": "ddd-diagram-spec", "version": 1,
"id": "<diagram id>", "kind": "architecture" | "sequence", "title": "Option A: …", "graph": { "nodes":
[{ "id", "label", "sublabel", "kind" }], "edges": [{ "id", "from", "to", "label", "kind" }], "groups":
[] } }`. The quickest way to one is to copy a generated spec and edit it: the example workspace ships
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json` (a context map),
`06-organise/decisions/D1-B.json` (teams and deployables) and `03-decompose/decisions/D1-C.sequence.json`
(a message flow); every diagram generator's `spec()` output has the same shape, and a blueprint
`architecture` or `sequence` JSON is accepted as-is. Then run
`ddd decision render <ddd-dir> <Did>` (`<step>:<Did>`, for example `organise:D1`, when two steps
reuse an id): it draws every option side by side, a card per option, into
`ddd/diagrams/decisions/<Did>.svg` (`<step>-<Did>.svg` for the qualified form) plus
`ddd/diagrams/decisions/<Did>.png` when a local Chrome is found. If that `.png` exists, Read it before choosing. The Read tool renders
PNG, not SVG, so that file is the same picture the human reviewer sees; without Chrome the SVG is
still on the review page and the JSON is still the truth. `ddd validate` warns when an
`options[].diagram` path does not exist.

The same rule holds for the step's own diagrams. Every `ddd mark` rebuilds `<ddd-dir>/review.html`
and `<ddd-dir>/diagrams/` (`context-map`, `core-domain-chart`, `flow-<id>`, `teams-deployables`,
`c4-context`, `aggregates-<context>`, `event-storm`, as SVG always and PNG when Chrome is found);
`ddd review <ddd-dir>` rebuilds them on demand. Before the checkpoint that settles your step's shape,
Read the PNG for your step if it exists. Diagrams keep their layout from run to run
(`diagrams/<id>.layout.json`); `ddd review <ddd-dir> --relayout` starts the layout afresh.

## 4. Write artifacts and close the step (both modes)

0. Write `plain_words` (envelope, §3) — the step in language someone outside the domain can check.
   Four short strings: `what` this step did, what it `decided`, what it `assumed`, and what is
   `riskiest` if that assumption is wrong. Write it **last**, from the finished artifact, in both
   modes. Rules: short sentences, common words, one idea per sentence; gloss any term the first time
   ("bounded context - the slice of the system where one word keeps one meaning"); give numbers where
   there are numbers; no hedging. Hyphens, not em dashes.
   This is not decoration. These artifacts are dense by design, and a reviewer who cannot read them
   cannot catch what they got wrong - on a real run the expensive mistakes (a language nobody chose,
   contracts for calls that never cross a process) were invisible to the human who asked for the work
   and surfaced only because a second model read all 121 files. Four honest sentences per step is the
   cheapest way to put the human back in the loop. Say the uncomfortable thing plainly: "we guessed
   the language" beats "language selection pending confirmation".
1. Write the Markdown artifact(s) and the step JSON exactly where `artifact-contract.md` says.
   Update `ddd/glossary.md` if your step touches vocabulary (discover seeds it; define refines it;
   any step may add a term it had to coin — mark those as assumptions).
2. Validate: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step <step>`.
   Fix errors before closing; warnings go into the final summary.
3. Mark the step: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> <step> done --mode <mode>`.
   Do not pass `--artifacts` or `--open-questions` — the command derives both from the step folder and its JSON.
   `mark` then rebuilds `<ddd-dir>/review.html` and `<ddd-dir>/diagrams/` (a `review:` line on stderr says so;
   a render problem is reported there and never changes the exit code).
   Use `draft` instead of `done` if the user stopped early or blocking questions remain in auto mode.
4. Finish with a short summary a reader who sees only that message can act on: absolute paths written,
   the 3–6 most important findings (e.g. "4 bounded contexts; `billing` is generic — buy"), the
   open questions, validation result, and the exact next step
   (`/ddd-<next>` or "run `ddd-workflow` to continue").

## 5. Tone and judgement

- Prefer fewer, sharper artifacts over exhaustive ones. A `light` run of a step should fit on a
  screen; a `deep` run should still not repeat itself.
- Name things in the domain's language, never in technical jargon (`order-placed`, not `order-created-event`).
- When the same word means different things to different people, that is a finding (a boundary),
  not a problem to smooth over.
- When you are unsure whether something belongs in this step or the next, put it in this step's
  `open_questions` or `hotspots` and move on — the chain will pick it up.
