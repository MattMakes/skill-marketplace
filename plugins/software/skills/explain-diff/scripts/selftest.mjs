#!/usr/bin/env node
// Self-test for the narration client's pure logic: which elements get narrated, what
// text they yield, and that appending the player twice leaves one player.
//
// Needs no narration service and no model - it is the guard on the rules that decide
// what gets read aloud.
//
//   node selftest.mjs        Exit 0 = all passed, 1 = a failure.
import { addFallbackMarkers, decodeEntities, markedElements, toText } from "./html.mjs";
import { BEGIN, END, inject } from "./player.mjs";

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}`);
  if (!ok) failures++;
};

const FIXTURE = `<!doctype html><html><body>
<nav id="toc"><ul><li><a href="#a">Contents that must stay silent</a></li></ul></nav>
<h2 data-tts>Background</h2>
<p data-tts>Prose that should be read aloud, with enough words to qualify.</p>
<p data-tts>An entity &amp; an aside (like this one) inside prose.</p>
<pre><code>echo "never narrated"</code></pre>
<ul>
  <li data-tts>A list item carrying real prose worth reading.</li>
  <li data-tts data-tts-text="The spoken version.">Run <code>git rev-parse</code> here.</li>
</ul>
<div class="diagram"><p>A diagram caption, skipped.</p></div>
<section id="quiz"><p>Which answer is correct? Not narrated.</p></section>
</body></html>`;

const marked = markedElements(FIXTURE);
check(marked.length === 5, `finds all 5 data-tts elements (got ${marked.length})`);
check(marked[0].tag === "h2", "keeps document order, heading first");
check(marked[4].override === "The spoken version.", "reads the data-tts-text override");

const spoken = marked.map((m) => m.override ?? toText(m.inner)).join(" ");
for (const banned of ["never narrated", "Contents that must stay silent", "diagram caption", "Which answer"]) {
  check(!spoken.includes(banned), `excludes ${JSON.stringify(banned)}`);
}
check(spoken.includes("An entity & an aside"), "decodes entities in narrated text");
check(!spoken.includes("git rev-parse"), "override replaces inline code, not appends to it");

// Strip the longer attribute first; stripping `data-tts` out of `data-tts-text`
// would leave a mangled tag name behind.
const bare = FIXTURE.replace(/ data-tts-text="[^"]*"/g, "").replace(/ data-tts\b/g, "");
const fallback = addFallbackMarkers(bare);
const inferred = markedElements(fallback.html);
check(inferred.length === 5, `infers markers for unmarked explainers (got ${inferred.length})`);
check(inferred[0].tag === "h2", "fallback keeps a one-word heading as a section cue");
const inferredText = inferred.map((m) => toText(m.inner)).join(" ");
for (const banned of ["never narrated", "must stay silent", "diagram caption", "Which answer"]) {
  check(!inferredText.includes(banned), `fallback still excludes ${JSON.stringify(banned)}`);
}

check(decodeEntities("a &lt; b &amp;&amp; c &#8212; d &hellip;") === "a < b && c — d …", "decodes named and numeric entities");
check(toText("<p>one <code>two</code> <pre>three</pre> four</p>") === "one two four", "flattens inline tags and drops pre");

const once = inject(FIXTURE, `${BEGIN}<span id="player"></span>${END}`);
const twice = inject(once, `${BEGIN}<span id="player2"></span>${END}`);
check((twice.match(/narration:begin/g) || []).length === 1, "re-running replaces the player rather than stacking it");
check(twice.includes("player2") && !twice.includes(`"player"`), "replacement is the newer player");
check(once.indexOf(BEGIN) < once.indexOf("</body>"), "player is appended inside body");

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
