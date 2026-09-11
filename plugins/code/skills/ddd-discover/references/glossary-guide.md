# Seeding the ubiquitous language at the discover step

`ddd/glossary.md` is read by every later step and refined per bounded context by `ddd-define`.
Discover seeds the **system-wide** terms only (`context: null`), from the nouns already on the
board. Format per `artifact-contract.md` section 5:

```markdown
# Ubiquitous language: <project title>

## Shared
**Order** — a customer's confirmed request to buy. _Avoid_: basket, cart (those are pre-confirmation)
**Box** — one week's physical delivery for one subscription. _Avoid_: order, shipment
```

`ddd discover glossary` writes that section from `discover.json` `glossary[]` and leaves every
other section untouched, so put the terms in the JSON and let the script render them.

## Where the terms come from

1. The nouns in event and command names: *Order Placed* → **Order**; *Choose Meals* → **Meal**,
   **Menu**. Read models and aggregate candidates add a few more (**Picking list**, **Subscription**).
2. Words the repo already uses consistently (README, schema, module names). Those win over anything
   you would coin; the documents are the evidence.
3. Actor names when they are domain words (**Subscriber**, **Packer**), not generic roles (*user*).

## What a good entry looks like

- **One meaning, one sentence.** "A customer's standing weekly order" — not a paragraph, not a
  list of attributes.
- **`avoid` lists the synonyms people actually use** and, when helpful, why they mislead:
  `"avoid": ["plan", "membership"]`. If nobody uses a synonym, leave it empty.
- **Define by relationship to other terms** where it sharpens the boundary: "one week's delivery for
  one *subscription*".
- Title Case the term; keep the singular.

Good: `{"term": "Box", "definition": "One week's physical delivery for one subscription", "avoid": ["order", "shipment"], "context": null}`
Bad: `{"term": "BoxEntity", "definition": "Table that stores boxes", ...}` — technical, storage-level.
Bad: `{"term": "Order", "definition": "The subscription, or the weekly box, depending on context", ...}` — two meanings folded into one entry.

## Conflicts are findings, not problems to smooth over

When the same word means different things in two places (*Box* = the menu choice vs the packed
parcel), record **both**: a `conflict` hotspot near the event where the meaning changes, and the
system-wide entry with the meaning that holds across the whole flow (or the more common one) plus a
note in the definition ("in fulfilment: the packed parcel"), and a `notes_for_downstream[]` entry
(`kind: language`, `for: ["decompose", "define"]`) naming the hotspot id — the note is what reaches
decompose; `ddd-define` will split the term per context.
Different words for the same thing (*order* vs *box*): pick the repo's word, put the other in
`avoid`.

## Size

`light` 5–10 terms, `standard` 10–20, `deep` 20–40. Every term should appear on the board (an event,
command, read model or aggregate name); `ddd discover lint` flags ones that do not.

## Re-runs

Keep terms stable. If a term is renamed, keep the old spelling in `avoid` of the new entry. Terms
hand-added to the Markdown but absent from the JSON are kept by the seeder and reported — either
add them to `discover.json` or delete them from the Markdown so the two agree.
