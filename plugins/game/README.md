# game

A review board for game work. Each skill scores what you bring it against a rubric and proposes
concrete fixes, citing rules distilled from a shelf of game-development books rather than
improvising taste.

```bash
claude plugin install game@skill-marketplace
```

## Skills

| Skill | Ask it | Backed by |
|---|---|---|
| `game-studio-cpo` | "Is this fun?" "Is this a good mechanic?" "Make this game better." The generalist entry point — routes across player experience, mechanics, balance, level design, narrative, game feel, production, AI, code and performance. | ~2,970 rules from 38 books |
| `game-systems-reviewer` | "Review this system." Economy, progression, combat, loot, crafting, inventory, quests, AI behavior, save/load, spawning — scored on 10 qualities. | ~1,814 rules |
| `game-balance-auditor` | "Is there a dominant strategy?" "Why does the leader always snowball?" Internal economies, feedback loops, difficulty curves, reward schedules, randomness vs skill. | ~330 rules |
| `game-code-reviewer` | "Is this architecture any good?" C#/Unity scripts, decoupling, state machines, event systems, ECS structure — scored on 9 qualities. | ~340 rules |
| `game-performance-auditor` | "Why is this slow?" "Will this hit 60fps?" CPU vs GPU bound, GC and allocations, pooling, draw calls, culling, LOD, memory layout, jobs. | ~390 rules |
| `game-qa-reviewer` | "Are we ready to ship?" Test plans, bug triage, severity bars, regression and soak testing, milestone gates, release and certification. | ~300 rules |

Engine-agnostic, with Unity-leaning specifics where it matters (the performance and code skills
assume C#/Unity idioms most readily).

## Invoking

Namespaced under the plugin: `game:game-studio-cpo`, and so on. When you are not sure
which auditor you want, start at `game-studio-cpo` — it will point you at the right one.
