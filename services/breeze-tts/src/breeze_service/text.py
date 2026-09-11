"""Text preparation. Everything the model should not see, or cannot fit, is handled here.

Two jobs, both deliberately on the server side so every client stays dumb:
  normalize()  - strip the things that read badly aloud
  split()      - keep each generation under the model's frame budget
"""

from __future__ import annotations

import re

# Breeze reads a parenthesised phrase as a voice-direction tag: "(sigh)" is an
# instruction, not words. Prose is full of "(see below)" asides that would be
# silently swallowed or acted on, so parentheses become commas before synthesis.
_PARENS = re.compile(r"\(([^()]{0,200}?)\)")
_WS = re.compile(r"\s+")
_SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(“])")

_ABBREVIATIONS = ("e.g.", "i.e.", "etc.", "vs.", "cf.", "Mr.", "Dr.", "Fig.", "No.")


def normalize(text: str) -> str:
    """Make one segment safe and pleasant to speak."""
    out = _WS.sub(" ", text).strip()
    for _ in range(3):  # nested asides need more than one pass
        new = _PARENS.sub(lambda m: ", " + m.group(1).strip() + ",", out)
        if new == out:
            break
        out = new
    out = re.sub(r",\s*,", ",", out)
    out = re.sub(r"\s+([,.;:!?])", r"\1", out)
    out = _WS.sub(" ", out).strip(" ,")
    if out and out[-1] not in ".!?:;,":
        out += "."
    return out


def split(text: str, max_chars: int) -> list[str]:
    """Split into generation-sized pieces at sentence boundaries.

    The model caps one call at max_new_tokens codec frames, so a long paragraph has
    to be generated in pieces and stitched back. The split is by sentence, then by
    clause, then - only if a single clause is still too long - by word, so the
    seams always land where a reader would breathe anyway.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    pieces, buf = [], ""
    for sentence in _sentences(text):
        if not buf:
            buf = sentence
        elif len(buf) + 1 + len(sentence) <= max_chars:
            buf += " " + sentence
        else:
            pieces.append(buf)
            buf = sentence
        while len(buf) > max_chars:
            head, buf = _hard_split(buf, max_chars)
            pieces.append(head)
    if buf:
        pieces.append(buf)
    return pieces


def _sentences(text: str) -> list[str]:
    parts = _SENTENCE.split(text)
    merged: list[str] = []
    for part in parts:
        if merged and merged[-1].endswith(_ABBREVIATIONS):
            merged[-1] += " " + part
        else:
            merged.append(part)
    return [p.strip() for p in merged if p.strip()]


def _hard_split(text: str, max_chars: int) -> tuple[str, str]:
    """Break an over-long run at the latest clause boundary, else the latest space."""
    window = text[:max_chars]
    for sep in ("; ", ", ", " - ", " "):
        cut = window.rfind(sep)
        if cut > max_chars // 3:
            return text[:cut].rstrip(" -,;"), text[cut + len(sep):].lstrip()
    return window, text[max_chars:].lstrip()
