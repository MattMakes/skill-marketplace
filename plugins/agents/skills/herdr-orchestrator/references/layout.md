# Layout: orchestrator left, workers in a 2 × N grid

`horch spawn` and `horch retire` maintain the grid for you. This is what they do and
why, so you can reason about it when a pane ends up somewhere surprising.

## The shape

The orchestrator is pinned to the **left**, full height, holding a fixed fraction of
the tab width (default 0.34, set with `horch init --ratio`). Everything to its right
is a **2-row × N-column** grid of worker panes:

```
+--------------+--------+--------+--------+
|              | sonnet-1| opus-1 |codex-  |
|              |         |        |sol-1   |
| orchestrator +--------+--------+--------+
|              | sonnet-2| opus-2 |fable-1 |
|              |         |        |        |
+--------------+--------+--------+--------+
```

## Split order

herdr only splits `right` or `down`, and a split subdivides the target pane's box.
That makes the order matter: filling a new column's bottom slot by splitting the new
top pane *down* would nest two short panes beside a tall one instead of extending the
bottom row. The rule that actually produces a grid:

| State | Next split | Result |
|---|---|---|
| No workers | orchestrator, `right` | column 1, full height |
| Top row has one pane, bottom row empty | first top pane, `down` | opens the bottom row |
| Bottom row shorter than top row | **rightmost bottom** pane, `right` | fills that column's bottom |
| Rows equal | **rightmost top** pane, `right` | starts a new column |

`horch layout` prints the current grid and the exact next split.

The grid is derived from **real pane geometry** every time (`herdr pane layout`), not
from a stored counter, so it stays correct after a worker is retired, a pane is closed
by hand, or a pane is dragged.

## Rebalancing

A fresh split halves its target, so columns drift to unequal widths (14, 7, 6 …).
After every spawn and retire, `horch` re-equalizes:

- **Orchestrator width** back to its configured ratio.
- **Column widths**: the columns form a nested right-split chain, so the split
  separating column *k* from the rest must have ratio `1/(n-k+1)`. Each boundary is
  nudged to its exact target with `herdr pane resize`.
- **Row heights** to 50/50, re-reading geometry between passes — the columns often
  share one horizontal boundary, so applying a correction once per column would
  overshoot.

Run `horch layout --rebalance` by hand after resizing panes manually.

## Retiring

`horch retire <role>` closes the pane; herdr gives its space to the sibling that
shared its split, and the next spawn refills that slot. You never need to run
`herdr pane split`, `herdr pane close`, or `herdr pane resize` yourself.
