<!-- CORE is adapted from DOX (github.com/agent0ai/dox, MIT), rewritten around
     CLAUDE.md as the real file so contracts load on demand instead of being
     traversed by hand. HTML comments are stripped before this file reaches the
     context window, so notes like this one are free. -->

# CORE

CORE is a tree of contracts. Each `CLAUDE.md` in this repository is binding for
its own directory and everything under it, and an `AGENTS.md` symlink sits
beside it so every other agent reads the same bytes.

There is a second layer next to this one: a code knowledge graph in
`graphify-out/`. The graph knows what calls what; CORE knows what things are
for and what you are not allowed to break. Neither answers the other's
question, which is why both exist.

## How a contract reaches you

You do not have to walk this tree. Claude Code loads a subdirectory's
`CLAUDE.md` the moment you read a file in that directory, so the local contract
arrives on its own, exactly when it becomes relevant.

Two cases still need you to go looking:

- You are about to **create** a file in a directory you have not read from yet.
  Read that directory's `CLAUDE.md` first — nothing will have loaded it for you.
- You are an agent that does **not** auto-load nested instruction files. Then
  walk from the repository root down to your target and read every `AGENTS.md`
  on the way.

When contracts disagree, the closer one wins on local detail. No child may
loosen a rule its parents set.

## What a contract owns

Root holds what is true everywhere: how to build, how to test, conventions that
do not vary, and the index of direct children. Child docs hold what is only
true in their own subtree. Broad rules live high, concrete detail lives low, and
nothing is stated twice.

## Keeping it true

A contract that describes last month's code is worse than no contract, because
it will be believed. Update the closest owning `CLAUDE.md` in the same change
that made it wrong — when you alter a directory's purpose, ownership, public
contract, workflow, inputs or outputs, constraints, or the set of CORE docs
itself. Refactors that leave behaviour and contracts intact need no edit.

Delete stale lines rather than annotating them. These files are contracts, not
a changelog — git already remembers what used to be true.

## Before you call the work done

1. For each path you changed, check the contract that owns it still holds.
2. Update that doc, and any parent whose structure or index moved.
3. Run `python3 .claude/core/core.py index` if you added, removed, moved or
   renamed a CORE doc. It rewrites every Child CORE Index from what is on disk,
   so nobody maintains those lists by hand.
4. Run `graphify update .` if you changed code, so the graph matches the tree.
5. Say which docs you deliberately left alone, and why.

A note on the graph's limits, because it is easy to over-trust: it records the
edges its parser resolved. A missing edge can mean "no such dependency" or it
can mean a dynamic import, a template path or a string reference it could not
follow. So it settles what *is* connected and stays silent on what is not.
Before writing a rule of the form "must not depend on", "nothing else uses" or
"is only reached from", confirm it with a grep. A false invariant in a contract
is worse than no contract, because everything downstream believes it.

## Preferences

Durable instructions the user gives — how to work here, what to avoid, what
they want by default — belong in this section or in the child doc they apply to.
A preference repeated in chat is a preference that should have been written down.

## Child CORE Index

This repository has not been indexed yet. Scan it, decide which directories are
durable boundaries, give each one a `CLAUDE.md`, and replace this paragraph
with the index.
