// derived from archify: renderers/shared/text-fit.mjs (MIT)
// derived from archify: renderers/shared/utils.mjs (MIT)
//
// Single-line text fitting. Node text renders as one <text> element and is
// never wrapped, so an over-long label would silently spill across its
// neighbours. These helpers let a renderer shrink toward a legible minimum,
// and let a check report the width text still needs when shrinking cannot
// save it.

// widthFactor: px of advance width per text unit, per px of font size, for the
// system sans stack the theme uses. horizontalPadding: total px kept inside a
// box so text never touches the border.
export const textFit = {
  widthFactor: 0.6,
  horizontalPadding: 8,
};

// Code points that take two columns of advance width (East Asian Wide and
// Fullwidth per UAX #11, tracking Unicode 17.0). Spelled out as ranges because
// V8 has no \p{East_Asian_Width=W} property escape.
const FULLWIDTH_RE = /[\u1100-\u115F\u231A-\u231B\u2329-\u232A\u23E9-\u23EC\u23F0\u23F3\u25FD-\u25FE\u2614-\u2615\u2630-\u2637\u2648-\u2653\u267F\u268A-\u268F\u2693\u26A1\u26AA-\u26AB\u26BD-\u26BE\u26C4-\u26C5\u26CE\u26D4\u26EA\u26F2-\u26F3\u26F5\u26FA\u26FD\u2705\u270A-\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B-\u2B1C\u2B50\u2B55\u2E80-\uA4CF\uA960-\uA97C\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF01-\uFF60\uFFE0-\uFFE6\u{16FE0}-\u{18DFF}\u{1AFF0}-\u{1AFFF}\u{1B000}-\u{1B2FF}\u{1F000}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u;

// A variation selector carries no advance of its own: VS16 asks for emoji
// presentation (wide), VS15 for text presentation (narrow), so a base plus a
// selector is measured from the selector rather than from the base.
const VS_FIRST = 0xfe00;
const VS_LAST = 0xfe0f;
const VS_TEXT = 0xfe0e;
const VS_EMOJI = 0xfe0f;

// Advance width in units: 1 per ordinary glyph, 2 per wide glyph.
export function textUnits(text) {
  const chars = Array.from(String(text ?? ''));
  let units = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const codePoint = chars[i].codePointAt(0);
    if (codePoint >= VS_FIRST && codePoint <= VS_LAST) continue;
    const next = i + 1 < chars.length ? chars[i + 1].codePointAt(0) : -1;
    if (next === VS_EMOJI) units += 2;
    else if (next === VS_TEXT) units += 1;
    else units += FULLWIDTH_RE.test(chars[i]) ? 2 : 1;
  }
  return units;
}

// Approximate rendered width of `text` at `fontSize` px.
export function textWidth(text, fontSize) {
  return textUnits(text) * fontSize * textFit.widthFactor;
}

// Largest font size at or below `preferred` that fits `text` inside a box of
// `width`, floored at `minimum`; below that the text is no longer legible and
// the caller should truncate or report instead.
export function fittedFontSize(text, width, preferred, minimum) {
  const units = Math.max(1, textUnits(text));
  const available = Math.max(1, width - textFit.horizontalPadding);
  const fitted = Math.min(preferred, available / (units * textFit.widthFactor));
  return Math.max(minimum, Math.floor(fitted * 10) / 10);
}

// Width `text` occupies at its legible minimum. Compare against
// availableTextWidth(width) to decide whether shrink-to-fit can rescue it.
export function minimumTextWidth(text, minimum) {
  return textUnits(text) * minimum * textFit.widthFactor;
}

// Available text width inside a box of `width`.
export function availableTextWidth(width) {
  return width - textFit.horizontalPadding;
}

// Box width needed to show `text` at `fontSize` without shrinking. Diagram
// generators use it to size a column from its widest label.
export function widthFor(text, fontSize) {
  return Math.ceil(textWidth(text, fontSize) + textFit.horizontalPadding);
}

// True when `text` fits in `width` at some size between preferred and minimum.
export function fits(text, width, minimum) {
  return minimumTextWidth(text, minimum) <= availableTextWidth(width);
}
