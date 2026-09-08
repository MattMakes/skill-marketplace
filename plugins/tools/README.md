# tools

Seventeen skills that do not belong to any one domain: nine of the owner's cross-cutting tools,
and eight engineering disciplines vendored from upstream and maintained here. Install the whole
thing or copy out the one you want.

```bash
claude plugin install tools@skill-marketplace
```

## Skills

| Skill | Use it when |
|---|---|
| `adhd` | An open-ended design, naming or API question where the first three answers will be correct and forgettable. Spawns parallel branches under different cognitive frames, scores them, prunes traps, deepens the survivors. Skip it for lookups and bugs with a known cause. |
| `humanize` | Writing or editing prose a person will read — docs, articles, commit messages, posts. Composes for clarity, then scrubs AI tells. Not for text written for models to consume. |
| `mochi-deck` | "Teach me X" or "turn this into flashcards." Teaches the concept, then packages it as a `.mochi` file for [Mochi](https://mochi.cards). Uploading needs `MOCHI_API_KEY`; without it you get a local file. |
| `model-router` | Before starting substantive work — decides whether Haiku or Sonnet should do the mechanical parts, whether to escalate hard reasoning, and whether the work fans out across parallel subagents. |
| `persona` | Building software or planning to. A senior staff engineer who applies SLC (Simple, Lovable, Complete) and refuses to ship phases. |
| `pre-flight` | After writing an implementation plan, before executing it. Catches wiring, contract, behavior-preservation and configuration gaps while they are still cheap. |
| `post-flight` | After executing a plan. Verifies the code against both the plan and the original codebase — static checks, runtime checks, then reflection. |
| `unlazy` | Long autonomous runs that stall at 80%. Writes acceptance gates before execution, decomposes with the Depth Tree, runs approved checks, re-verifies evidence before reporting done. |
| `unlazy-lite` | The same discipline with less ceremony. |

### Engineering disciplines (vendored, see Credits)

| Skill | Use it when |
|---|---|
| `systematic-debugging` | Any bug, test failure or unexpected behaviour, before proposing a fix. Four phases from reproduce to verify; refuses to guess. Carries `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md` and a `find-polluter.sh` bisection script. |
| `test-driven-development` | Any feature or bugfix, before writing implementation code. Red, green, refactor, with `writing-good-tests.md` for the rules that keep tests honest. |
| `receiving-code-review` | Review feedback arrives, especially when it is unclear or technically questionable. Verify before implementing; no performative agreement. |
| `using-git-worktrees` | Feature work that needs isolation from the current workspace. Prefers a native worktree tool, falls back to `git worktree`. |
| `git-advanced-workflows` | Complex histories: rebase, cherry-pick, bisect, worktrees, reflog recovery. |
| `error-handling-patterns` | Designing error handling across languages: exceptions, Result types, propagation, graceful degradation. |
| `code-review-excellence` | Reviewing a change or setting review standards. Constructive, catches bugs early, keeps morale. |
| `api-design-principles` | Designing or reviewing a REST or GraphQL API. Includes a checklist and a FastAPI template. |

## Credits

Vendored skills are supply-chain-controlled copies: each is maintained here.
Upstream is re-pulled deliberately, not automatically.

Third-party work:

- **`systematic-debugging`, `test-driven-development`, `receiving-code-review`,
  `using-git-worktrees`** — [obra/superpowers](https://github.com/obra/superpowers) by Jesse
  Vincent; copied from commit `b36e082` (2026-08-12). `superpowers:` cross-references were
  repointed at `tools:` and `dev:` skills; the author's eval scratch files were dropped.
- **`git-advanced-workflows`, `error-handling-patterns`, `code-review-excellence`,
  `api-design-principles`** — [wshobson/agents](https://github.com/wshobson/agents) by Seth
  Hobson; copied from commit `a30778f` (2026-09-01), from the `developer-essentials` and
  `backend-development` plugins.

- **`unlazy` and `unlazy-lite`** — [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy).
- **`adhd`** — based on [UditAkhourii/adhd](https://github.com/UditAkhourii/adhd).
- **`humanize`** — its AI-pattern catalog and voice guidance are adapted from
  [blader/humanizer](https://github.com/blader/humanizer) by Siqi Chen, itself based on
  Wikipedia's "Signs of AI writing" (CC BY-SA). Its clarity principles are adapted from
  softaworks/agent-tools, credited in `skills/humanize/refs/compose-instructions.md`.

`mochi-deck`, `model-router`, `persona`, `pre-flight` and `post-flight` are the marketplace
owner's.

## A note on `unlazy`

`unlazy` and `unlazy-lite` spawn subprocesses — they run the verification commands you put in a
gate file. That is what they are for, but it means you should read a gate file before letting one
run. Their `scripts/install-hooks.mjs` writes hook entries into a settings file, and only when you
invoke it directly. Installing this plugin wires no hooks.

`systematic-debugging` ships `find-polluter.sh`, a bisection script that runs `npm test` per
test file to find which one leaves state behind. It runs only when you invoke it.

## Invoking

Namespaced under the plugin: `tools:adhd`, `tools:humanize`, `tools:systematic-debugging`, and so on.
