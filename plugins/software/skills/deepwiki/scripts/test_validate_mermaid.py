#!/usr/bin/env python3
"""Regression tests for the stdlib Mermaid linter.

Run:  python3 scripts/test_validate_mermaid.py
No test framework needed — plain stdlib, exits non-zero on failure.

MUST_CATCH: diagrams that genuinely will not parse.
MUST_PASS:  real-world diagrams that render fine. Several are
            regression guards for past false positives — a linter
            that cries wolf on valid docs is worse than useless.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from validate_mermaid import validate_mermaid_code  # noqa: E402

MUST_CATCH = [
    ("unquoted-parens",     'graph TD\n    A[Process (input)] --> B["ok"]',            "unquoted_node_label"),
    ("unquoted-pipe",       'graph TD\n    A[a|b] --> B["ok"]',                        "unquoted_node_label"),
    ("unquoted-semicolon",  'graph TD\n    A[run; then stop] --> B["ok"]',             "unquoted_node_label"),
    ("subgraph-parens",     'graph TD\n    subgraph Frontend(React)\n        A["x"]\n    end', "invalid_subgraph_name"),
    ("empty-seq-message",   'sequenceDiagram\n    autonumber\n    A->>B:',             "empty_message"),
    ("unbalanced-bracket",  'graph TD\n    A["x"] --> B["y"',                          "unbalanced_delimiter"),
    ("unbalanced-quote",    'graph TD\n    A["x] --> B["y"]',                          "unbalanced_quote"),
    ("missing-direction",   'graph\n    A["x"]-->B["y"]',                              "missing_direction"),
    ("bad-direction",       'graph XY\n    A["x"]-->B["y"]',                           "invalid_direction"),
    ("unknown-type",        'flowchat TD\n    A-->B',                                  "unknown_diagram_type"),
    ("reserved-node-id",    'graph TD\n    end["Done"]',                               "reserved_node_id"),
    ("smart-quotes",        'graph TD\n    A[“Process”]',                    "smart_characters"),
    ("nbsp",                'graph TD\n    A["x"] --> B["y"]',                    "smart_characters"),
    ("unclosed-subgraph",   'graph TD\n    subgraph S\n        A["x"]',                "unbalanced_end"),
    ("stray-end",           'graph TD\n    A["x"]\n    end',                           "unbalanced_end"),
    ("unclosed-seq-loop",   'sequenceDiagram\n    autonumber\n    loop Retry\n    A->>B: go', "unbalanced_end"),
    ("empty-block",         '',                                                        "empty_block"),
    ("state-empty-label",   'stateDiagram-v2\n    Idle --> Running :',                 "empty_message"),
    # Real bug found in gateaccess/gaall myministry-fe-inmates-component-map.md:
    # opening quote never closed. Must stay caught.
    ("unterminated-quote",  'graph LR\n    A["src/app/page.tsx] --> B["src/Mod.tsx"]', "unbalanced_quote"),
]

MUST_PASS = [
    ("flowchart+labels",   'graph TD\n    A["User Input"] --> B{"Valid?"}\n    B -->|"yes"| C["Done"]\n    B -->|"no"| A'),
    ("label-with-parens",  'graph TD\n    A["Process (input)"] --> B["f(x, y)"]'),
    ("quoted-subgraph",    'graph TD\n    subgraph Backend\n        A["API"]\n    end\n    subgraph db ["Data (v2)"]\n        B["DB"]\n    end\n    A --> B'),
    ("nested-subgraph",    'graph TD\n    subgraph Outer\n        subgraph Inner\n            A["x"]\n        end\n    end'),
    ("sequence",           'sequenceDiagram\n    autonumber\n    participant U as User\n    U->>API: POST /login\n    API-->>U: 200 OK\n    loop Retry\n        API->>DB: query\n    end'),
    ("seq-alt-else",       'sequenceDiagram\n    autonumber\n    alt is valid\n        A->>B: ok\n    else invalid\n        A->>B: fail\n    end'),
    ("classDiagram",       'classDiagram\n    class Animal {\n        +String name\n        +eat()\n    }\n    Animal <|-- Dog'),
    ("stateDiagram-v2",    'stateDiagram-v2\n    [*] --> Idle\n    Idle --> Running : start\n    Running --> [*]'),
    ("erDiagram",          'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE_ITEM : contains'),
    ("directive+comment",  '%%{init: {"theme":"dark"}}%%\ngraph TD\n    %% a comment\n    A["x"] --> B["y"]'),
    ("shapes",             'graph TD\n    A(("circle")) --> B{{"hex"}}\n    C[["subroutine"]] --> D[("db")]'),
    ("styled-dark",        'graph TD\n    A["x"] --> B["y"]\n    style A fill:#2d333b,stroke:#6d5dfc,color:#e6edf3'),
    ("percent-in-label",   'graph TD\n    A["100% coverage"] --> B["ok"]'),
    # Real-world Mermaid that renders fine unquoted. These must NOT hard-fail;
    # they are policy warnings at most. Regression guards for past false positives.
    ("unquoted-br",        'graph TD\n    Register --> captcha{Captcha <br>ok?}'),
    ("unquoted-slash",     'graph TD\n    J[Add Save/Cancel Function] --> K["ok"]'),
    ("unquoted-comma",     'graph TD\n    A[Load config, then run] --> B["ok"]'),
    ("node-id-O",          'graph TD\n    O["toc.yaml / Wiki Pages"] --> P["done"]'),
    ("edge-ending-o-x",    'graph TD\n    A["a"] --o B["b"]\n    B --x C["c"]'),
    # Real diagram from tuleap runbook-vulnerability-response.md: a quoted label
    # legitimately spanning 3 lines. Was a false positive; must stay passing.
    ("multiline-label",    'graph TD\n    RM -.-> PR(["Post-remediation activities\n    Additional hardening,\n    architecture changes to prevent recurrence..."])'),
]

fails = 0

print("=" * 62)
print("A. MUST-CATCH (linter must reject these)")
print("=" * 62)
for name, code, expected in MUST_CATCH:
    r = validate_mermaid_code(code)
    if r.is_valid:
        print(f"  MISS  {name:20} -> passed but should have failed")
        fails += 1
    elif r.error_type != expected:
        print(f"  WRONG {name:20} -> got {r.error_type}, expected {expected}")
        fails += 1
    else:
        print(f"  ok    {name:20} -> {r.error_type} (line {r.error_line})")

print()
print("=" * 62)
print("B. MUST-PASS (linter must NOT false-positive)")
print("=" * 62)
for name, code in MUST_PASS:
    r = validate_mermaid_code(code)
    if not r.is_valid:
        print(f"  FALSE+ {name:20} -> {r.error_type}: {r.error_message}")
        fails += 1
    else:
        print(f"  ok     {name:20} -> {r.diagram_type}, {len(r.warnings)} warning(s)")

print()
print("=" * 62)
print(f"RESULT: {'ALL PASS' if fails == 0 else str(fails) + ' FAILURE(S)'}")
print("=" * 62)
sys.exit(1 if fails else 0)
