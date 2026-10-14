#!/usr/bin/env python3
"""Grounding and drift checks for a grounded vault. Run from the vault root."""

import re
import subprocess
import sys
from pathlib import Path

RAW = (Path.cwd() / "raw").resolve()
WIKI = Path("wiki")
HEADER = re.compile(r"^> (Raw|Fingerprint|Monitored|Status): (.*)$", re.M)
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+\.md)\)")
NUMBER = re.compile(r"(?<![\w.,])\d[\d.,]*%?(?![\w.,])")
QUOTE = re.compile(r"[\"\u201c]([^\"\u201d]{8,})[\"\u201d]")  # shorter quoted words are not claims


def header(text: str) -> dict[str, str]:
    return {k: v.strip() for k, v in HEADER.findall(text)}


def prose(text: str) -> str:
    """Body text without the header block, headings, and fenced code."""
    kept, fenced = [], False
    for line in text.splitlines():
        if line.startswith("```"):
            fenced = not fenced
            continue
        if fenced or line.startswith((">", "#")):
            continue
        kept.append(line)
    return "\n".join(kept)


def claims(text: str):
    """Yield (item, is_number, raw_links) for every figure or quotation in the prose."""
    for sentence in re.split(r"(?<=[.!?])\s+", prose(text)):
        links = [path for _, path in LINK.findall(sentence) if "raw/" in path]
        bare = LINK.sub(" ", sentence)  # link labels and paths are not claims
        for item in NUMBER.findall(bare):
            yield item, True, links
        for item in QUOTE.findall(bare):
            yield item, False, links


def raw_source(page: Path, rel: str) -> Path | None:
    """The raw file a link points at, or None when it escapes raw/ or is missing."""
    src = (page.parent / rel).resolve()
    return src if src.is_relative_to(RAW) and src.is_file() else None


def grounded(item: str, is_number: bool, sources: list[str], page: Path) -> bool:
    token = re.compile(r"(?<![\w.,])" + re.escape(item) + r"(?![\w.,])")
    for rel in sources:
        src = raw_source(page, rel)
        if src is None:
            continue
        text = src.read_text(errors="replace")
        if token.search(text) if is_number else item in text:
            return True
    return False


def drift(fingerprint: str, monitored: str) -> str:
    """Non-empty when monitored paths changed since the fingerprint, or git cannot tell."""
    sha = fingerprint.removeprefix("git:")
    paths = [p.strip() for p in monitored.split(",") if p.strip()]
    if not paths:
        return ""
    out = subprocess.run(
        ["git", "diff", "--stat", f"{sha}..HEAD", "--", *paths],
        capture_output=True, text=True, check=False,
    )
    if out.returncode != 0:
        return f"git cannot compare {sha}: {out.stderr.strip() or 'unknown fingerprint'}"
    return out.stdout.strip()


def main(strict: bool) -> int:
    errors = 0
    for page in sorted(WIKI.rglob("*.md")):
        text = page.read_text()
        meta = header(text)
        if meta.get("Status", "Current") != "Current":
            continue
        if not meta.get("Fingerprint"):
            print(f"{page}: no Fingerprint header")
            errors += 1
        for item, is_number, sources in claims(text):
            if not sources:
                if strict:
                    print(f"{page}: {item!r} has no raw/ source link")
                    errors += 1
                continue
            if not grounded(item, is_number, sources, page):
                print(f"{page}: {item!r} not found in {', '.join(sources)}")
                errors += 1
        stat = drift(meta["Fingerprint"], meta.get("Monitored", "")) if meta.get("Fingerprint") else ""
        if stat:
            print(f"{page}: drifted since {meta['Fingerprint']}\n{stat}")
            errors += 1
    print(f"{errors} problem(s)")
    return 1 if (errors and strict) else 0


if __name__ == "__main__":
    sys.exit(main(strict="--strict" in sys.argv))
