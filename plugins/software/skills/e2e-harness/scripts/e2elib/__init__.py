"""e2e-harness support library.

Split so the CLI stays readable:
  paths      - where artifacts live, one source of truth
  inventory  - deterministic probes of the repo -> inventory.json
  docsmine   - deterministic extraction of endpoints/workflows from a docs folder
  journeys   - schema + validation of the one AI-authored artifact
  codegen    - journeys.json -> Playwright/HTTP test files (pure function)
  runner     - up, readiness, test, report, down
  adapters   - one module per resource kind
"""
__version__ = "1.0.0"
