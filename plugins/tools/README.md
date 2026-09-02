# tools

Nine small skills that do not belong to any one domain. Install the whole thing or copy out the
one you want.

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

## Credits

Three of these are third-party work, bundled with their licenses intact:

- **`unlazy` and `unlazy-lite`** — [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy). MIT;
  see `skills/unlazy/LICENSE` and `skills/unlazy-lite/LICENSE`.
- **`adhd`** — based on [UditAkhourii/adhd](https://github.com/UditAkhourii/adhd). MIT, declared
  in the skill's own frontmatter.
- **`humanize`** — its clarity principles are adapted from softaworks/agent-tools, credited in
  `skills/humanize/refs/compose-instructions.md`.

`mochi-deck`, `model-router`, `persona`, `pre-flight` and `post-flight` are the marketplace
owner's, MIT.

## A note on `unlazy`

`unlazy` and `unlazy-lite` spawn subprocesses — they run the verification commands you put in a
gate file. That is what they are for, but it means you should read a gate file before letting one
run. Their `scripts/install-hooks.mjs` writes hook entries into a settings file, and only when you
invoke it directly. Installing this plugin wires no hooks.

## Invoking

Namespaced under the plugin: `tools:adhd`, `tools:humanize`, and so on.
