# v1 verification — Relay Orchard

This file verifies the 2 required traces against `design-record.yaml` and
`relay-orchard.svg`. Notation: AP, En(ergy), Wtr, Scr(ap), Frt(uit),
Cred(its), and Res(earch).

## Normal trace — 3-day win, clear weather both dawns

| # | Action | Rule | AP | En | Wtr | Scr | Frt | Cred | Res |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Dawn 1 start | R-01b | 6 | 6 | 2 | 2 | 0 | 0 | 0 |
| 1 | Travel Workshop→Grove | R-03 | 5 | 5 | 2 | 2 | 0 | 0 | 0 |
| 2 | Tend at Grove; add 1 marker | R-06a | 4 | 5 | 1 | 2 | 0 | 0 | 0 |
| 3 | Travel Grove→Workshop | R-03 | 3 | 4 | 1 | 2 | 0 | 0 | 0 |
| 4 | Travel Workshop→Observatory | R-03 | 2 | 3 | 1 | 2 | 0 | 0 | 0 |
| 5 | Repair receiver | R-12 | 1 | 3 | 1 | 0 | 0 | 0 | 0 |
| 6 | Scan sky | R-11 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| — | No AP-costing action can start; player ends the day | R-01, R-02 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| — | Dawn 2 clear; marker becomes 2 fruit and clears | R-06b, R-08 | 6 | 1 | 1 | 0 | 2 | 0 | 1 |
| 7 | Charge | R-04 | 5 | 3 | 1 | 0 | 2 | 0 | 1 |
| 8 | Sell 2 fruit | R-09 | 4 | 3 | 1 | 0 | 0 | 3 | 1 |
| 9 | Buy 1 scrap | R-10 | 3 | 3 | 1 | 1 | 0 | 1 | 1 |
| 10 | Travel Workshop→Observatory | R-03 | 2 | 2 | 1 | 1 | 0 | 1 | 1 |
| 11 | Scan sky | R-11 | 1 | 0 | 1 | 1 | 0 | 1 | 2 |
| — | Player ends Day 2 with 1 AP unused | R-02 | 1 | 0 | 1 | 1 | 0 | 1 | 2 |
| — | Dawn 3; no marker is pending | R-01 | 6 | 0 | 1 | 1 | 0 | 1 | 2 |
| 12 | Charge | R-04 | 5 | 2 | 1 | 1 | 0 | 1 | 2 |
| 13 | Travel Workshop→Observatory | R-03 | 4 | 1 | 1 | 1 | 0 | 1 | 2 |
| 14 | Install relay | R-13 | 2 | 1 | 1 | 0 | 0 | 1 | 0 |

Result: win before Day 3 ends. The final state is AP2, En1, Wtr1, Scr0,
Frt0, Cred1, and Res0.

## Energy-shortage recovery trace

This trace continues from Dawn 3 at Workshop. The receiver remains repaired.

| Boundary or action | Rule | AP | En | Wtr | Scr | Frt | Cred | Res |
|---|---|---|---|---|---|---|---|---|
| Dawn 3 at Workshop | — | 6 | 0 | 1 | 1 | 0 | 1 | 2 |
| Attempt travel to Observatory; blocked for missing 1 energy | R-01, R-03, R-15 | 6 | 0 | 1 | 1 | 0 | 1 | 2 |
| Charge; spend 1 AP and gain 2 energy | R-04 | 5 | 2 | 1 | 1 | 0 | 1 | 2 |
| Travel Workshop→Observatory | R-03 | 4 | 1 | 1 | 1 | 0 | 1 | 2 |
| Install relay | R-13 | 2 | 1 | 1 | 0 | 0 | 1 | 0 |

The blocked attempt changes no state. The trace rejoins the normal trace at
its Dawn-3 charge and reaches the same final state.

## Feasibility and references

The confirmed rules permit a Day-3 win without any proposal or rule change.
The weather model remains open under Q-01, while R-07 remains confirmed.

Every `decisions[*].affects` target and every relationship endpoint exists in
`relay-orchard.svg`. The 7 relationship IDs are `E-map-day`, `E-storm-fruit`,
`E-fruit-trade`, `E-scrap-flow`, `E-scan-gate`, `E-research-install`, and
`E-energy-recover`.

The SVG is the editable source. CI must render and inspect the A2 PDF page.
