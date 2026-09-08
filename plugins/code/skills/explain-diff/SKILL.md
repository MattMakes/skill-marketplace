---
name: explain-diff
description: Use when the user asks for a rich explanation of a code change, diff, branch, or PR. Produces HTML output.
---

# Explain Diff

Please make me a rich, interactive explanation of the specified code change.

It should have these sections:

- Background: Explain the existing system relevant to this change. (You should broadly explore surrounding code for this.) We don't know how much the reader already knows, so include a deep background for beginners (note that it can be skipped if the reader is already familiar), and then a more narrow background directly relevant to the change.
- Intuition: Explain the core intuition for the code change. The focus here is to explain the essence, not the full details. Use concrete examples with toy data. Use figures and diagrams liberally.
- Code: Do a high-level walkthrough of the changes to the code. Group/order the changes in an understandable way.
- Quiz: Come up with five questions that test the reader's knowledge of this PR. This should be medium difficulty, difficult enough that you actually need to understand the substance of the PR to answer them, but not gotchas. The goal is to help the reader make sure that they've actually understood. These should be presented as interactive multiple-choice questions, and when the user clicks, it tells them whether they were correct and gives feedback.

Format:

- Output a single self-contained HTML file which includes CSS and JavaScript. Make the whole thing one long page with section headers and a table of contents. Don't use tabs for the top-level structure. Basic responsive styling so you can view it on a phone is nice too. Save the file in the `docs/` folder at the root of the repository (find the root with `git rev-parse --show-toplevel`; create `docs/` if it does not exist), and make sure the filename always starts with today's date in `YYYY-MM-DD-` format, because it keeps the explainers time-sorted. For example: docs/2026-01-12-explanation-<slug>.html
- Please write with the clarity and flow of Martin Kleppmann, making it engaging and written in classic style. Transitions between sections should be smooth.
- Some tips on diagrams. Ideally, you should pick a small number of diagram families that can be reused throughout the explanation to explain various cases. Some useful kinds of diagrams:
  - A very simplified version of the UI that the user sees in the app, to explain UI changes.
  - A system diagram showing data flow or communication between components. Make sure to include example data here!
- Don't use ASCII diagrams. Always use simple HTML designs for your diagrams, HTML lists for lists of things, etc.
  - For code blocks, always use `<pre>` tags. If you use a custom styled div instead, it **must** have
    `white-space: pre-wrap` in its CSS, or the browser will collapse all newlines into a single line.
    Before saving the file, scan each code block in the HTML source and confirm its CSS includes
    `white-space: pre` or `pre-wrap`.
- Use callouts for key concepts or definitions, important edge cases, etc.

Narration:

- Mark every element whose text should be read aloud with a bare `data-tts` attribute:
  prose `<p>`, prose `<li>`, callout text, and the `<h2>`/`<h3>` section headings (they become
  spoken section cues). Do not mark `<pre>`, diagrams, figures, the table of contents, or the
  quiz. Where a paragraph leans on inline code that would read badly aloud, add
  `data-tts-text="the spoken version"` to that element and the narrator says that instead.
- After saving the HTML, run
  `node ${CLAUDE_PLUGIN_ROOT}/skills/explain-diff/scripts/narrate.mjs <file.html>`
  (allow a 10 minute timeout; synthesis runs at roughly real time, so a long explainer takes
  about as many minutes as it does to listen to). Add `--inline` to embed the audio and keep the
  file self-contained instead of writing an MP3 beside it.
- Act on the exit code and nothing else. `0`: say the narrated player is embedded. `3`: say in one
  sentence that the narration service is not running, and stop — the explainer is complete without
  it. `4`: say narration is still generating and the same command can be re-run to pick it up.
  Anything else: show the script's stderr. Never narrate by hand or substitute another tool.

- Quiz fairness (from the discussion on the source gist): shuffle the position of the correct answer across questions and keep every option about the same length and specificity, so the right answer cannot be guessed from its position or because it is the longest.

Source: https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524 (harvested 2026-09-06).
