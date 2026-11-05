# v2 verification — Relay Orchard

The revision changes only R-01b and R-04. Starting energy changes from 6 to
3. Charger yield changes from 2 energy to 3 energy for the same 1 AP. All
other confirmed rules remain unchanged.

Notation: AP, En(ergy), Wtr, Scr(ap), Frt(uit), Cred(its), and Res(earch).

## Ordering consequence

The exact v1 Grove-first Day-1 ordering spends all 3 starting energy on
travel before its first scan. Repair then leaves only 1 AP. A charge can use
that AP, but no AP remains for the scan. DT-02 records this consequence.

## Normal trace — 3-day win, clear weather both dawns

| # | Action | Rule | AP | En | Wtr | Scr | Frt | Cred | Res |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Dawn 1 start | R-01b | 6 | 3 | 2 | 2 | 0 | 0 | 0 |
| 1 | Travel Workshop→Observatory | R-03 | 5 | 2 | 2 | 2 | 0 | 0 | 0 |
| 2 | Repair receiver | R-12 | 4 | 2 | 2 | 0 | 0 | 0 | 0 |
| 3 | Scan sky | R-11 | 3 | 0 | 2 | 0 | 0 | 0 | 1 |
| 4 | Charge | R-04 | 2 | 3 | 2 | 0 | 0 | 0 | 1 |
| 5 | Scan sky again | R-11 | 1 | 1 | 2 | 0 | 0 | 0 | 2 |
| — | Player ends Day 1 with 1 AP unused | R-02 | 1 | 1 | 2 | 0 | 0 | 0 | 2 |
| — | Dawn 2; no marker is pending | R-01 | 6 | 1 | 2 | 0 | 0 | 0 | 2 |
| 6 | Travel Workshop→Grove | R-03 | 5 | 0 | 2 | 0 | 0 | 0 | 2 |
| 7 | Tend at Grove; add 1 marker | R-06a | 4 | 0 | 1 | 0 | 0 | 0 | 2 |
| 8 | Charge at Grove | R-04 | 3 | 3 | 1 | 0 | 0 | 0 | 2 |
| 9 | Tend again; add 1 marker | R-06a | 2 | 3 | 0 | 0 | 0 | 0 | 2 |
| — | Player ends Day 2 with 2 AP unused | R-02 | 2 | 3 | 0 | 0 | 0 | 0 | 2 |
| — | Dawn 3 clear; 2 markers become 4 fruit and clear | R-06b, R-08 | 6 | 3 | 0 | 0 | 4 | 0 | 2 |
| 10 | Sell 2 fruit | R-09 | 5 | 3 | 0 | 0 | 2 | 3 | 2 |
| 11 | Buy 1 scrap | R-10 | 4 | 3 | 0 | 1 | 2 | 1 | 2 |
| 12 | Travel Workshop→Observatory | R-03 | 3 | 2 | 0 | 1 | 2 | 1 | 2 |
| 13 | Install relay | R-13 | 1 | 2 | 0 | 0 | 2 | 1 | 0 |

Result: win before Day 3 ends. The final state is AP1, En2, Wtr0, Scr0,
Frt2, Cred1, and Res0.

## Energy-shortage recovery trace

This trace starts on Day 1 at Observatory immediately after the first scan
and before the charge. The receiver is repaired.

| Boundary or action | Rule | AP | En | Wtr | Scr | Frt | Cred | Res |
|---|---|---|---|---|---|---|---|---|
| After the first Day-1 scan | — | 3 | 0 | 2 | 0 | 0 | 0 | 1 |
| Attempt second scan; blocked because 2 energy is missing | R-01, R-11, R-15 | 3 | 0 | 2 | 0 | 0 | 0 | 1 |
| Charge; spend 1 AP and gain 3 energy | R-04 | 2 | 3 | 2 | 0 | 0 | 0 | 1 |
| Complete second scan | R-11 | 1 | 1 | 2 | 0 | 0 | 0 | 2 |

The blocked attempt changes no state. The trace rejoins the normal trace
immediately after its second Day-1 scan and reaches the same Day-3 win.

## Feasibility and references

The revision does not change feasibility. It requires a different Day-1
ordering, and the recomputed normal trace still wins by Day 3.

Every `decisions[*].affects` target and every relationship endpoint exists in
`relay-orchard.svg`. The 7 relationship IDs are `E-map-day`, `E-storm-fruit`,
`E-fruit-trade`, `E-scrap-flow`, `E-scan-gate`, `E-research-install`, and
`E-energy-recover`.

The SVG is the editable source. CI must render and inspect the A2 PDF page.
