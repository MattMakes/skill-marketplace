// Tolerant HTML scanning for the narration client. Not a parser - just enough tag
// walking to find the nodes the explainer marked, read their text, and append a
// player. It never rewrites a marked node, so the document the model wrote is the
// document that ships.
//
// Zero dependencies, ESM, Node >= 18.

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)>/g;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style"]);

// Prose containers worth narrating when an explainer predates data-tts markers.
export const FALLBACK_TAGS = ["p", "li", "h2", "h3"];
// Never narrate from inside these: code blocks, chrome, and the quiz (whose answers
// would be spoiled by reading them aloud).
const SKIP_TAGS = ["pre", "script", "style", "nav", "code", "figure", "table"];
const SKIP_ATTR = /\b(?:id|class)\s*=\s*("|')([^"']*)\1/i;
const SKIP_NAME = /\b(quiz|toc|table-of-contents|contents|nav|footer|diagram|figure)\b/i;

/** Read one attribute off an opening-tag attribute string. */
export function attr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = attrs.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? "";
}

export function hasAttr(attrs, name) {
  return new RegExp(`\\b${name}(\\s|=|$)`, "i").test(attrs);
}

/** Byte ranges whose contents must never be narrated or marked. */
export function skipRanges(html) {
  const ranges = [];
  for (const tag of SKIP_TAGS) {
    let from = 0;
    for (;;) {
      const open = findOpen(html, tag, from);
      if (!open) break;
      const close = matchingClose(html, tag, open.end);
      ranges.push([open.start, close === null ? html.length : close.end]);
      from = close === null ? html.length : close.end;
    }
  }
  // Containers named like chrome or the quiz, whatever element they use.
  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(html)) !== null) {
    const [, slash, name, attrs, selfClose] = m;
    if (slash || selfClose || VOID.has(name.toLowerCase())) continue;
    const named = attrs.match(SKIP_ATTR);
    if (!named || !SKIP_NAME.test(named[2])) continue;
    const close = matchingClose(html, name, m.index + m[0].length);
    ranges.push([m.index, close === null ? html.length : close.end]);
  }
  return merge(ranges);
}

function merge(ranges) {
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else out.push(range.slice());
  }
  return out;
}

export function inRanges(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function findOpen(html, tag, from) {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  re.lastIndex = from;
  const m = re.exec(html);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** Walk forward from `from`, counting nesting, to find `tag`'s closing tag. */
export function matchingClose(html, tag, from) {
  const lower = tag.toLowerCase();
  if (VOID.has(lower)) return { start: from, end: from };
  if (RAW_TEXT.has(lower)) {
    const idx = html.toLowerCase().indexOf(`</${lower}>`, from);
    return idx === -1 ? null : { start: idx, end: idx + lower.length + 3 };
  }
  let depth = 1;
  TAG.lastIndex = from;
  let m;
  while ((m = TAG.exec(html)) !== null) {
    const [, slash, name, , selfClose] = m;
    if (name.toLowerCase() !== lower) continue;
    if (selfClose || VOID.has(name.toLowerCase())) continue;
    depth += slash ? -1 : 1;
    if (depth === 0) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Every element carrying `data-tts`, in document order. */
export function markedElements(html) {
  const found = [];
  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(html)) !== null) {
    const [, slash, name, attrs, selfClose] = m;
    if (slash || selfClose || !hasAttr(attrs, "data-tts")) continue;
    const innerStart = m.index + m[0].length;
    const close = matchingClose(html, name, innerStart);
    if (!close) continue;
    found.push({
      tag: name.toLowerCase(),
      attrs,
      inner: html.slice(innerStart, close.start),
      override: attr(attrs, "data-tts-text"),
    });
  }
  return found;
}

/** Add a bare `data-tts` to prose containers in an explainer that has no markers. */
export function addFallbackMarkers(html) {
  const skips = skipRanges(html);
  const edits = [];
  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(html)) !== null) {
    const [, slash, name, attrs, selfClose] = m;
    if (slash || selfClose) continue;
    if (!FALLBACK_TAGS.includes(name.toLowerCase())) continue;
    if (inRanges(skips, m.index) || hasAttr(attrs, "data-tts")) continue;
    const inner = innerTextOf(html, name, m.index + m[0].length);
    // Headings are spoken section cues, so "Background" counts; prose needs enough
    // words to be worth a cue of its own, which skips stubs, labels and captions.
    const floor = /^h[1-6]$/.test(name.toLowerCase()) ? 1 : 4;
    if (inner.split(/\s+/).filter(Boolean).length < floor) continue;
    edits.push(m.index + 1 + name.length);
  }
  let out = html;
  for (const at of edits.reverse()) out = out.slice(0, at) + " data-tts" + out.slice(at);
  return { html: out, added: edits.length };
}

function innerTextOf(html, tag, innerStart) {
  const close = matchingClose(html, tag, innerStart);
  return close ? toText(html.slice(innerStart, close.start)) : "";
}

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—",
  ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", times: "×", middot: "·",
};

export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const key = body.toLowerCase();
    return key in ENTITIES ? ENTITIES[key] : whole;
  });
}

/** Flatten an element's inner HTML to the words a narrator should say. */
export function toText(inner) {
  let text = inner.replace(/<(script|style|pre)\b[\s\S]*?<\/\1>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}
