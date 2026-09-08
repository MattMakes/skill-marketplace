# meta — Skill Authoring

Three skills for making more skills and tools: build and measure a skill, build an MCP server,
and pull skills in from a repository you trust.

```bash
claude plugin install meta@skill-marketplace
```

## Skills

| Skill | Use it when |
|---|---|
| `skill-creator` | Start here. Creating a skill from scratch, tightening an existing one, or proving it works: writes the `SKILL.md`, runs evals against it with `claude -p`, benchmarks with variance analysis, and tunes the description for triggering accuracy. Python 3 with `pyyaml`; the eval runner needs the `claude` CLI on your PATH. |
| `mcp-builder` | Building an MCP server that wraps an external API, in Python (FastMCP) or TypeScript (MCP SDK). Design guidance, reference implementations, and an evaluation harness. The harness (`scripts/evaluation.py`) needs `anthropic` and `mcp` from `scripts/requirements.txt` and an `ANTHROPIC_API_KEY`; the guidance needs nothing. |
| `harvest` | You have a GitHub URL to a repository of skills and want them installed locally. Clones it, finds every `SKILL.md`, detects name collisions with what you already have, and copies the rest into `~/.claude/skills`. Node with `npx ts-node`, plus `gh` or `git`. |

## What these write and where they reach

`harvest` is the one skill here that reaches out and writes outside its own directory, and it does
both only for a repository you name:

- It clones `https://github.com/<owner>/<repo>` into a temp directory (`gh repo clone`, falling
  back to `git clone`), copies the skill folders it finds into `~/.claude/skills`
  (`CLAUDE_SKILLS_DIR` overrides), and deletes the temp clone. It never overwrites an existing
  skill; collisions are reported and skipped unless you supply a rename.

`skill-creator` runs subprocesses on your machine when you ask it to evaluate a skill: it spawns
`claude -p` for each eval case, and the review viewer runs `lsof` to free its localhost port. Its
HTML reports link Google Fonts stylesheets, which your browser fetches when you open one; the
scripts themselves make no network calls.

`mcp-builder`'s evaluation script calls the Anthropic API and connects to the MCP server you point
it at (stdio, SSE, or streamable HTTP). It runs only when you invoke it.

Installing this plugin wires no hooks, no MCP servers and no background processes.

## Credits

`skill-creator` and `mcp-builder` are copied from
[anthropics/skills](https://github.com/anthropics/skills) at commit `41bbe19` (2026-09-03).
From that commit forward these are this marketplace's copies: vendored skills are treated
as supply-chain-controlled forks, reviewed here and updated deliberately rather than tracked
live. Diff against upstream before pulling changes in.

`harvest` is the marketplace owner's.

## Invoking

Namespaced under the plugin: `meta:skill-creator`, `meta:mcp-builder`, `meta:harvest`.
