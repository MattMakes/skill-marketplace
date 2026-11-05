"""Artifact locations. Every module imports from here so nothing drifts."""
from __future__ import annotations

from pathlib import Path

WORKDIR = "e2e"

CONFIG = "config.json"
INVENTORY = "inventory.json"
JOURNEYS = "journeys.json"
REPORT = "report.json"
TESTS_DIR = "tests"
GEN_DIR = "tests/generated"
SUPPORT_DIR = "tests/support"
ARTIFACTS_DIR = "artifacts"


class Paths:
    def __init__(self, root: Path):
        self.root = Path(root).resolve()
        self.work = self.root / WORKDIR

    @property
    def config(self) -> Path:
        return self.work / CONFIG

    @property
    def inventory(self) -> Path:
        return self.work / INVENTORY

    @property
    def journeys(self) -> Path:
        return self.work / JOURNEYS

    @property
    def report(self) -> Path:
        return self.work / REPORT

    @property
    def tests(self) -> Path:
        return self.work / TESTS_DIR

    @property
    def generated(self) -> Path:
        return self.work / GEN_DIR

    @property
    def support(self) -> Path:
        return self.work / SUPPORT_DIR

    @property
    def artifacts(self) -> Path:
        return self.work / ARTIFACTS_DIR

    def rel(self, p: Path) -> str:
        try:
            return str(Path(p).resolve().relative_to(self.root))
        except ValueError:
            return str(p)
