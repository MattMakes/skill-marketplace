# Phase: changelog (Optional)

## Goal

Generate a structured, user-facing changelog from git commit history:
- commits grouped by time period (daily for the recent window, weekly for older)
- each commit classified by change type
- related commits merged into coherent, readable descriptions
- breaking changes surfaced prominently with migration notes
- commit hashes and files linked when a remote repo URL is available

This phase reads git history only. It touches no source files and requires nothing beyond `git` and Python 3 stdlib.

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `repo_path` | Yes | - | Absolute repository root path (must be a git repo) |
| `output_dir` | No | `docs/wiki` | Documentation output directory |
| `since` | No | `90 days ago` | Start of the history window (any `git log --since` value) |
| `until` | No | `HEAD` | End of the history window (commit, tag, or date) |
| `repo_url` | No | - | Remote base URL for linked citations; resolved in Step 1 if omitted |
| `branch` | No | current | Branch to read history from |

## Outputs

| Path | Description |
|------|-------------|
| `{output_dir}/CHANGELOG.md` | Structured changelog, newest period first |

## Steps

### 1. Resolve repository context (do this first)

Citation format depends on whether the repo has a remote. Resolve it before reading any history.

```bash
git -C "{repo_path}" remote get-url origin     # remote URL, if any
git -C "{repo_path}" rev-parse --abbrev-ref HEAD   # current branch
git -C "{repo_path}" rev-parse HEAD            # ref commit
```

- **Remote found** → store as `REPO_URL`. Link commits as `[abc1234](REPO_URL/commit/abc1234)` and files as `[file.ts](REPO_URL/blob/COMMIT/file.ts)`.
- **No remote** → ask the user whether a source repo URL exists (GitHub, GitLab, Azure DevOps). If they confirm local-only, use plain hashes (`abc1234`) and plain paths (`file.ts`).

Do not proceed until the citation format is settled. Never fabricate a URL.

### 2. Collect history

Pull structured commit data — subject, body, hash, date, author — plus the files each commit touched.

```bash
git -C "{repo_path}" log \
  --since="{since}" \
  --until="{until}" \
  --date=short \
  --pretty=format:'%h|%ad|%an|%s' \
  --no-merges
```

For commits that need file-level detail (breaking changes, features worth a file citation):

```bash
git -C "{repo_path}" show --stat --oneline --no-patch {hash}
```

Notes:
- `--no-merges` keeps merge commits out of the classification pass; they carry no independent content.
- Read commit **bodies** (`%b`) for anything tagged breaking — that is where migration notes live.
- If the window returns zero commits, say so plainly and stop. Do not pad the changelog with older history the user did not ask for.

### 3. Classify each commit

Match on the conventional-commit prefix first, then on the signal keywords. A commit lands in exactly one category — pick the most user-visible one (a `fix` that also refactors is a Fix).

| Emoji | Category | Signal keywords |
|-------|----------|-----------------|
| ⚠️ | Breaking Changes | `breaking`, `BREAKING CHANGE`, `!:`, `migrate`, `deprecate`, `remove` |
| 🆕 | New Features | `feat`, `add`, `new`, `implement`, `introduce`, `support` |
| 🐛 | Bug Fixes | `fix`, `bug`, `patch`, `resolve`, `hotfix`, `correct` |
| 🔄 | Refactoring | `refactor`, `restructure`, `reorganize`, `rename`, `clean` |
| 📝 | Documentation | `docs`, `readme`, `comment`, `jsdoc`, `docstring` |
| 🔧 | Configuration | `config`, `env`, `setting`, `ci`, `build`, `chore` |
| 📦 | Dependencies | `deps`, `upgrade`, `bump`, `package`, `lock` |

Breaking changes take precedence over every other category. A commit marked `feat!:` is a Breaking Change, not a Feature.

### 4. Group by time period

| History age | Grouping |
|-------------|----------|
| Last 7 days | One section per day (`## 2026-07-14`) |
| Older than 7 days | One section per week (`## 2026-06-22 – 2026-06-28`) |

Order newest first. Skip periods with no commits — do not emit empty headings.

### 5. Write user-facing descriptions

The changelog is for a reader who did not write the code. Translate.

- **Describe the change, not the diff.** "Adds retry with exponential backoff to the upload client", not "modified `uploadClient.ts`".
- **Merge related commits.** Three commits building one feature become one bullet. Cite all their hashes.
- **Use the project's own vocabulary.** Pull terminology from the README and from `{output_dir}/toc.json` (`project.name`, page titles) so the changelog reads like the rest of the wiki.
- **Drop noise.** Formatting-only commits, typo fixes in comments, merge-branch commits, and reverted-then-reapplied pairs do not earn a bullet.
- **Never invent.** If a commit message is opaque (`wip`, `fix stuff`), read the diff stat and describe what actually changed, or omit it. Do not guess at intent.
- **Breaking changes get migration notes.** State what broke and what the reader must do. If the commit body has no migration guidance and the diff does not make it obvious, say so explicitly rather than inventing steps.

### 6. Emit `{output_dir}/CHANGELOG.md`

```markdown
# Changelog

Generated: {YYYY-MM-DD} · Range: {since} → {until} · Branch: `{branch}`

## {Date or Date Range}

**{Summary Title}**

{1–2 sentence overview of what happened in this period.}

### ⚠️ Breaking Changes

- **{What broke}** — {migration note: what the reader must change}. ([abc1234](REPO_URL/commit/abc1234))

### 🆕 New Features

- {User-facing description of the capability}. ([abc1234](REPO_URL/commit/abc1234), [def5678](REPO_URL/commit/def5678))

### 🐛 Bug Fixes

- {What was broken and is now fixed}. ([abc1234](REPO_URL/commit/abc1234))

### 🔄 Refactoring

- {What was restructured and why it matters to a reader}. ([abc1234](REPO_URL/commit/abc1234))

### 📝 Documentation

- {What was documented}. ([abc1234](REPO_URL/commit/abc1234))

### 🔧 Configuration

- {What changed in build, CI, or settings}. ([abc1234](REPO_URL/commit/abc1234))

### 📦 Dependencies

- {Package} {old version} → {new version}. ([abc1234](REPO_URL/commit/abc1234))
```

Rules for the emitted file:
- **Breaking Changes always come first** within a period, ahead of Features.
- Omit any category with no entries in that period.
- On a local-only repo, drop the links and use bare hashes: `(abc1234)`.
- One period, one `**Summary Title**` — a short phrase naming the theme of the period ("Auth rewrite and retry hardening"), not a restatement of the bullets.

## Validation

- [ ] `{output_dir}/CHANGELOG.md` exists and is valid Markdown
- [ ] Every bullet carries at least one commit hash
- [ ] No commit hash appears that is not in `git log` output for the range
- [ ] Periods are newest-first, with no empty sections or empty categories
- [ ] Breaking changes carry migration notes, or an explicit statement that none was provided
