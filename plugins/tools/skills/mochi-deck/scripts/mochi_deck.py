#!/usr/bin/env python3
"""Mochi deck builder for the mochi-deck skill.

Primary (free, offline) workflow:
  pack FILE --deck NAME [-o OUT]   Convert a markdown deck file into a
                                   .mochi archive for manual import into
                                   the Mochi app. No account or API key
                                   needed.

Deck file format:
  - cards are separated by a line containing only `===`
  - sides within a card are separated by a line containing only `---`

Cards get deterministic ids derived from the deck name + card front, so
re-importing a regenerated .mochi file updates existing cards in place
instead of duplicating them.

Optional API commands (require a Mochi Pro subscription and an API key in
the MOCHI_API_KEY env var or ~/.config/mochi/api_key):
  list-decks                        List all decks (id, name, parent)
  create-deck NAME [--parent-id X]  Create a deck
  list-cards DECK_ID                List cards in a deck (id, front)
  push FILE --deck NAME_OR_ID       Publish a deck file via the API
                                    (dedups; --dry-run to preview)
  delete-card CARD_ID               Delete a card
"""

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

BASE_URL = "https://app.mochi.cards/api"
KEY_FILE = Path.home() / ".config" / "mochi" / "api_key"


# --- deck file parsing -------------------------------------------------

def parse_deck_file(path):
    cards, sides, buf = [], [], []
    in_fence = False

    def end_side():
        side = "\n".join(buf).strip()
        buf.clear()
        if side:
            sides.append(side)

    def end_card():
        end_side()
        if sides:
            cards.append("\n---\n".join(sides))
        sides.clear()

    for line in Path(path).read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            buf.append(line)
        elif not in_fence and re.fullmatch(r"===+", stripped):
            end_card()
        elif not in_fence and stripped == "---":
            end_side()
        else:
            buf.append(line)
    end_card()
    return cards


def normalize_front(content):
    """Reduce a card's front side to a comparison key for duplicate detection."""
    front = content.split("\n---\n", 1)[0]
    front = re.sub(r"[`*_#>{}\[\]()]", "", front.lower())
    return re.sub(r"\s+", " ", front).strip()


def dedupe(cards):
    seen, unique = set(), []
    for c in cards:
        key = normalize_front(c)
        if key in seen:
            print(f"  skip (duplicate front): {key[:70]}")
            continue
        seen.add(key)
        unique.append(c)
    return unique


# --- .mochi archive generation (free tier, manual import) --------------

def edn_str(s):
    escaped = (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\t", "\\t")
        .replace("\r", "\\r")
    )
    return f'"{escaped}"'


def stable_id(prefix, text):
    """Deterministic Mochi id (alphanumeric keyword, starts with a letter)."""
    return prefix + hashlib.sha1(text.encode()).hexdigest()[:10]


def build_mochi_edn(deck_name, cards, parent_name=None):
    deck_id = stable_id("d", deck_name)
    entries = []
    for c in cards:
        card_id = stable_id("c", deck_name + "\x00" + normalize_front(c))
        entries.append(f"{{:id :{card_id} :content {edn_str(c)}}}")
    cards_edn = "\n                  ".join(entries)

    decks = []
    parent_edn = ""
    if parent_name:
        parent_id = stable_id("d", parent_name)
        decks.append(f"{{:id :{parent_id} :name {edn_str(parent_name)}}}")
        parent_edn = f"\n          :parent-id :{parent_id}"
    decks.append(
        f"{{:id :{deck_id}\n"
        f"          :name {edn_str(deck_name)}{parent_edn}\n"
        f"          :cards [{cards_edn}]}}"
    )
    decks_edn = "\n         ".join(decks)
    return f"{{:version 2\n :decks [{decks_edn}]}}\n"


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "deck"


def cmd_pack(args):
    cards = parse_deck_file(args.file)
    if not cards:
        sys.exit(f"error: no cards parsed from {args.file}")
    print(f"Parsed {len(cards)} card(s) from {args.file}")
    cards = dedupe(cards)

    out = Path(args.output) if args.output else Path(args.file).with_name(
        slugify(args.deck) + ".mochi"
    )
    edn = build_mochi_edn(args.deck, cards, parent_name=args.parent)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("data.edn", edn)
    print(f"\nWrote {len(cards)} card(s) for deck {args.deck!r} to {out}")
    print("Import in the Mochi app: menu -> Import -> select this file.")
    print("Re-importing a regenerated file updates these cards instead of duplicating them.")


# --- Mochi REST API (optional, requires Pro) ---------------------------

def get_api_key(required=True):
    key = os.getenv("MOCHI_API_KEY", "").strip()
    if not key and KEY_FILE.exists():
        key = KEY_FILE.read_text().strip()
    if not key and required:
        sys.exit(
            "error: no Mochi API key found.\n"
            f"Set the MOCHI_API_KEY environment variable or write the key to {KEY_FILE}.\n"
            "Keys are created at mochi.cards -> Account settings -> API keys (requires Mochi Pro).\n"
            "No key? Use the free `pack` command instead to build a .mochi file for manual import."
        )
    return key


def api(method, path, payload=None, params=None):
    url = f"{BASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    token = base64.b64encode(f"{get_api_key()}:".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        hint = ""
        if e.code == 401:
            hint = " (API key was rejected -- check the key)"
        elif e.code == 403:
            hint = " (API access requires a Mochi Pro subscription)"
        sys.exit(f"error: Mochi API returned {e.code}{hint}: {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"error: could not reach Mochi API: {e.reason}")


def paginate(path, params=None):
    params = dict(params or {})
    params["limit"] = 100
    docs = []
    while True:
        page = api("GET", path, params=params)
        batch = page.get("docs", [])
        if not batch:
            break
        docs.extend(batch)
        bookmark = page.get("bookmark")
        if not bookmark:
            break
        params["bookmark"] = bookmark
    return docs


def all_decks():
    return paginate("/decks")


def resolve_deck(ref, dry_run=False):
    decks = all_decks()
    for d in decks:
        if d["id"] == ref:
            return d
    matches = [
        d for d in decks
        if d["name"].lower() == ref.lower()
        and not d.get("archived?") and not d.get("trashed?")
    ]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        listing = "\n".join(f"  {d['id']}  {d['name']}" for d in matches)
        sys.exit(f"error: multiple decks named {ref!r}; pass a deck id instead:\n{listing}")
    if dry_run:
        print(f"[dry-run] would create new deck {ref!r}")
        return None
    deck = api("POST", "/decks/", {"name": ref})
    print(f"Created deck {deck['name']!r} ({deck['id']})")
    return deck


def cmd_list_decks(args):
    decks = all_decks()
    if not decks:
        print("No decks found.")
        return
    by_id = {d["id"]: d for d in decks}
    for d in decks:
        flags = " [archived]" if d.get("archived?") or d.get("trashed?") else ""
        parent = by_id.get(d.get("parent-id"), {}).get("name")
        crumb = f" (in {parent})" if parent else ""
        print(f"{d['id']}  {d['name']}{crumb}{flags}")


def cmd_create_deck(args):
    payload = {"name": args.name}
    if args.parent_id:
        payload["parent-id"] = args.parent_id
    deck = api("POST", "/decks/", payload)
    print(f"Created deck {deck['name']!r} ({deck['id']})")


def cmd_list_cards(args):
    cards = paginate("/cards", {"deck-id": args.deck_id})
    for c in cards:
        print(f"{c['id']}  {normalize_front(c.get('content', ''))[:80]}")
    print(f"\n{len(cards)} card(s)")


def cmd_push(args):
    cards = parse_deck_file(args.file)
    if not cards:
        sys.exit(f"error: no cards parsed from {args.file}")
    print(f"Parsed {len(cards)} card(s) from {args.file}")

    if args.dry_run and not get_api_key(required=False):
        print("[dry-run] no API key available -- showing parsed cards only\n")
        for i, c in enumerate(cards, 1):
            print(f"--- card {i} ---\n{c}\n")
        return

    deck = resolve_deck(args.deck, dry_run=args.dry_run)
    existing = set()
    if deck:
        existing = {
            normalize_front(c.get("content", ""))
            for c in paginate("/cards", {"deck-id": deck["id"]})
        }

    created = skipped = 0
    for i, content in enumerate(cards, 1):
        key = normalize_front(content)
        preview = key[:70] or f"card {i}"
        if key in existing:
            print(f"  skip (duplicate): {preview}")
            skipped += 1
            continue
        if args.dry_run:
            print(f"  [dry-run] would create: {preview}")
            created += 1
            continue
        api("POST", "/cards/", {"content": content, "deck-id": deck["id"]})
        existing.add(key)
        created += 1
        print(f"  created: {preview}")
        time.sleep(0.2)

    verb = "Would publish" if args.dry_run else "Published"
    name = deck["name"] if deck else args.deck
    print(f"\n{verb} {created} card(s) to deck {name!r}; {skipped} duplicate(s) skipped.")


def cmd_delete_card(args):
    api("DELETE", f"/cards/{args.card_id}")
    print(f"Deleted card {args.card_id}")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("pack", help="build a .mochi file for manual import (free)")
    p.add_argument("file")
    p.add_argument("--deck", required=True, help="deck name shown in Mochi")
    p.add_argument("--parent", help="optional parent deck name to nest under")
    p.add_argument("-o", "--output", help="output path (default: <deck-name>.mochi)")
    p.set_defaults(func=cmd_pack)

    sub.add_parser("list-decks").set_defaults(func=cmd_list_decks)

    p = sub.add_parser("create-deck")
    p.add_argument("name")
    p.add_argument("--parent-id")
    p.set_defaults(func=cmd_create_deck)

    p = sub.add_parser("list-cards")
    p.add_argument("deck_id")
    p.set_defaults(func=cmd_list_cards)

    p = sub.add_parser("push")
    p.add_argument("file")
    p.add_argument("--deck", required=True, help="deck name or id (created if missing)")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_push)

    p = sub.add_parser("delete-card")
    p.add_argument("card_id")
    p.set_defaults(func=cmd_delete_card)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
