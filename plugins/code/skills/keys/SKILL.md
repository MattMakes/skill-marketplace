---
name: keys
description: Install KEYS, a self-maintaining AGENTS.md hierarchy with child tree and indexes. Merges CLAUDE.md, GEMINI.md, .cursorrules, and similar agent-instruction files into the owning AGENTS.md, deleting them after user confirmation.
---

# keys

KEYS is a hierarchy of AGENTS.md files: one root contract that holds the
framework rules, and one child contract per real boundary in the project, each
indexing its direct children. Agents walk that chain before they edit and update
it after. AGENTS.md is the only instruction file — this skill writes no
CLAUDE.md, no symlinks, and folds the ones it finds. The first run is the
expensive one: it reads the project and writes the tree. Every run after it is a
small refresh.

## Step 1 — Scan

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/keys/scripts/keys.py" scan
```

One JSON object. It lists every AGENTS.md, CLAUDE.md, agent rule file, other
`.md` file and boundary candidate, and the git state. Two fields pick the path:

- `keys_installed` false — first run. Do every step below.
- `keys_installed` true, `root_indexed` false — an earlier build stopped before
  the index was written. Continue from Step 3.
- both true — a refresh. Go to [Refresh runs](#refresh-runs).

Read the output. Do not explore to confirm it.

## Step 2 — Install the root

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/keys/scripts/keys.py" install
```

The framework rules sit between `<!-- KEYS:begin -->` and `<!-- KEYS:end -->`.
A re-run replaces only that block, so project text outside it survives
upgrades. An existing AGENTS.md without markers is kept: the block goes on top,
the old text follows, and `## User Preferences` and `## Child KEYS Index` are
added if missing. An AGENTS.md that is a symlink (often to CLAUDE.md) becomes a
regular file holding the target's text; the target itself is not touched.

## Step 3 — Fold existing instructions

Skip this step when `claude_md` and `agent_rule_files` are empty and no
`other_md` file qualifies.

Read [references/folding.md](references/folding.md) first. It holds the targets,
the section mapping, what to drop, and which `other_md` files qualify.

1. Build the fold plan table: `Source | Target AGENTS.md | Sections | After fold | Reason`.
   Show it to the user.
2. Warn before anything is deleted:
   - `git.clean` false — say so and suggest a commit first, so the deletes can
     be reviewed and reverted.
   - `git.repo` false — say that deleted files cannot be recovered from git.
3. Ask the user to confirm the delete list. They may drop rows from it.
4. Fold the content into the target AGENTS.md files. A target child that does
   not exist yet is written from `assets/AGENTS-child.md`.
5. Delete only the confirmed files, then fix the links that pointed at them.

`CLAUDE.local.md` is personal and never folded or deleted. In a headless run
with nobody to confirm, fold the content, delete nothing, and list each source
as `pending delete`.

## Step 4 — Build the tree

**Choose the boundaries.** Start from three lists: directories that had a
folded CLAUDE.md or scoped rule, `boundary_candidates` from the scan, and areas
with a purpose you can state in one sentence and rules someone could break. Go
as deep as the project needs — nested docs where complexity warrants — but a
doc in every folder is noise that every agent must read on the way down.

**Explore narrowly.** Use file listings, manifests, entry points and targeted
reads. Do not sweep whole directories.

**Write each child** from `assets/AGENTS-child.md`. Fill Purpose, Ownership
and Local Contracts from what you found. Work Guidance and Verification stay
empty when no real standard or check exists yet — that is a KEYS rule, not a
gap to paper over.

**Verify every negative claim.** "Never imports", "only called from", "nothing
else uses" — each gets one grep before it goes in a doc. A contract is believed
by every later session, so a false invariant is worse than a missing one.

**Fill the root.** Write root Purpose, Work Guidance and Verification from the
manifests, the CI config and the folded content. Put them between the
`<!-- KEYS:end -->` line and `## User Preferences`, so `install` never touches
them.

**Write the indexes.** Every AGENTS.md ends with `## Child KEYS Index`, listing
only its direct children, one line each:

```markdown
- [api/AGENTS.md](api/AGENTS.md) — HTTP handlers and request validation.
```

Paths are relative to the folder of the listing doc. Wrap a path that contains spaces in angle brackets: [team docs/AGENTS.md](<team docs/AGENTS.md>). A leaf writes `- None`.
Replace the root placeholder paragraph (`This project is not yet indexed. ...`)
last, once the whole tree exists.

## Step 5 — Check

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/keys/scripts/keys.py" check
```

Fix every `ERROR` and run it again until the last line says `0 errors`. Errors
cover a missing or malformed root, the placeholder, symlinked docs, a missing
index section, index entries that point nowhere or skip a level, and children
missing from their parent's index.

`WARN` lines do not fail the check. They name a CLAUDE.md or agent rule file
that still exists — normally one the user chose to keep or a `pending delete` —
and a child doc that carries a copy of the KEYS block. Mention each in the
report. `--strict` turns warnings into failures.

## Step 6 — Report

Keep it short:

- AGENTS.md files created or changed
- folded sources and their targets, and what was dropped
- deleted files
- kept files, with the reason (`keep`, `keep-unsure`, `pending delete`)
- `CLAUDE.local.md` left in place
- links fixed, and links not fixed
- the final `keys check:` line
- boundaries deliberately left without a doc, and why

## Refresh runs

When `keys_installed` and `root_indexed` are both true:

1. Run `install`. It upgrades the KEYS block only.
2. Fold any new CLAUDE.md or rule files from the scan (Step 3, same confirm rule).
3. Add docs for new boundaries, and update the parent indexes that gain a child.
4. Leave docs whose area did not change alone.
5. Run `check` until it prints `0 errors`, then report as in Step 6.

## Command reference

| Command | Does | Writes |
|---|---|---|
| `keys.py scan [--root DIR]` | JSON inventory: AGENTS.md, CLAUDE.md, rule files, other `.md`, boundary candidates, git state | nothing |
| `keys.py install [--root DIR]` | creates root AGENTS.md, or upgrades/merges the KEYS block; replaces a symlinked AGENTS.md | `<root>/AGENTS.md` only |
| `keys.py check [--root DIR] [--strict]` | validates the tree and indexes; exit 1 on any ERROR (or WARN with `--strict`) | nothing |

`--root` defaults to the git top level, or the current directory outside git.
