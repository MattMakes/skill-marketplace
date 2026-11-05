"""The journeys contract: schema, validation, and scaffolding.

journeys.json is the one file in this pipeline a model writes. Everything before
it is a probe and everything after it is a template, so this is where the whole
design either holds or leaks. The validator is therefore strict on purpose:

  - every step kind comes from a closed vocabulary
  - every `resource` must exist in inventory.json
  - every required field per step kind must be present and correctly typed
  - unknown fields are rejected, because a silently-ignored typo in a match
    predicate produces a test that passes for the wrong reason

That last one is the important one. A test that passes vacuously is worse than
no test, so we would rather fail loudly at build time.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1

# --------------------------------------------------------------------------
# Step vocabulary. Adding a kind means adding it here AND in codegen.py --
# the validator will reject anything codegen cannot emit.
# --------------------------------------------------------------------------
StepSpec = dict[str, Any]

STEP_KINDS: dict[str, StepSpec] = {
    "http": {
        "doc": "Send one HTTP request and assert on the response.",
        "required": {"resource": str, "method": str, "path": str},
        "optional": {
            "name": str, "headers": dict, "body": object, "query": dict,
            "expect_status": (int, list), "expect_body_contains": (str, list),
            "expect_json_path": dict, "save_as": dict, "timeout_ms": int,
        },
    },
    "await_http": {
        "doc": "Poll an endpoint until it satisfies the expectation, or time out. "
               "Use this when a write is processed asynchronously.",
        "required": {"resource": str, "method": str, "path": str, "timeout_ms": int},
        "optional": {
            "name": str, "headers": dict, "query": dict, "interval_ms": int,
            "expect_status": (int, list), "expect_body_contains": (str, list),
            "expect_json_path": dict, "save_as": dict,
        },
    },
    "browser": {
        "doc": "Drive the UI with Playwright: navigate, act, assert.",
        "required": {"resource": str, "actions": list},
        "optional": {"name": str, "path": str, "expect_text": (str, list),
                     "expect_url": str, "screenshot": str, "timeout_ms": int},
    },
    "publish": {
        "doc": "Put a message on a topic or queue to drive the system under test.",
        "required": {"resource": str, "target": str, "payload": object},
        "optional": {"name": str, "key": str, "headers": dict},
    },
    "await_message": {
        "doc": "Wait for a matching message on a topic or queue. This is the core "
               "assertion for event-driven systems -- the observable effect of a "
               "write is usually a message, not a response body.",
        "required": {"resource": str, "target": str, "timeout_ms": int},
        "optional": {
            "name": str, "match_contains": (str, list), "match_json_path": dict,
            "from_beginning": bool, "min_count": int, "save_as": dict,
        },
    },
    "await_blob": {
        "doc": "Wait for an object to appear in a blob/bucket container.",
        "required": {"resource": str, "container": str, "timeout_ms": int},
        "optional": {
            "name": str, "name_pattern": str, "min_size_bytes": int,
            "content_contains": str, "save_as": dict,
        },
    },
    "upload_blob": {
        "doc": "Put an object into a blob/bucket container to drive the system.",
        "required": {"resource": str, "container": str, "blob_name": str},
        "optional": {"name": str, "content": str, "content_file": str, "content_type": str},
    },
    "sleep": {
        "doc": "Fixed wait. A last resort -- prefer await_* so the test is not "
               "timing-dependent. Flagged by `validate` as a warning.",
        "required": {"duration_ms": int},
        "optional": {"name": str, "reason": str},
    },
}

# Resource kinds each step can legally target. Catching a `publish` aimed at a
# Postgres container at validation time saves a confusing runtime failure.
STEP_RESOURCE_KINDS: dict[str, set[str]] = {
    "http": {"service", "http", "container", "apphost", "openapi"},
    "await_http": {"service", "http", "container", "apphost", "openapi"},
    "browser": {"service", "http", "container", "apphost"},
    "publish": {"kafka", "rabbitmq", "eventhubs", "servicebus", "pubsub",
                "azure-storage", "aws-localstack", "s3"},
    "await_message": {"kafka", "rabbitmq", "eventhubs", "servicebus", "pubsub",
                      "azure-storage", "aws-localstack"},
    "await_blob": {"azure-storage", "s3", "gcs", "aws-localstack"},
    "upload_blob": {"azure-storage", "s3", "gcs", "aws-localstack"},
    "sleep": set(),
}

RE_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class ValidationError(Exception):
    pass


def _type_name(t: Any) -> str:
    if isinstance(t, tuple):
        return " or ".join(x.__name__ for x in t)
    return getattr(t, "__name__", str(t))


def _check_type(value: Any, expected: Any) -> bool:
    if expected is object:
        return True
    if expected is int:
        # bool is an int subclass in Python; an int field should not accept True.
        return isinstance(value, int) and not isinstance(value, bool)
    return isinstance(value, expected)


def validate(doc: Any, inventory: dict[str, Any] | None) -> tuple[list[str], list[str]]:
    """Return (errors, warnings). Empty errors means `build` may proceed."""
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(doc, dict):
        return ([f"journeys must be a JSON object, got {type(doc).__name__}"], [])

    if doc.get("schema_version") != SCHEMA_VERSION:
        errors.append(
            f"schema_version must be {SCHEMA_VERSION}, got {doc.get('schema_version')!r}"
        )

    known_ids: dict[str, str] = {}
    if inventory:
        known_ids = {r["id"]: r.get("kind", "") for r in inventory.get("resources", [])}

    journeys = doc.get("journeys")
    if not isinstance(journeys, list) or not journeys:
        errors.append("`journeys` must be a non-empty array")
        return (errors, warnings)

    seen_ids: set[str] = set()
    for ji, j in enumerate(journeys):
        where = f"journeys[{ji}]"
        if not isinstance(j, dict):
            errors.append(f"{where}: must be an object")
            continue

        jid = j.get("id")
        if not isinstance(jid, str) or not RE_ID.match(jid):
            errors.append(
                f"{where}.id must be a lowercase kebab-case slug (got {jid!r}). "
                "It becomes the generated spec filename."
            )
        elif jid in seen_ids:
            errors.append(f"{where}.id {jid!r} is duplicated")
        else:
            seen_ids.add(jid)
            where = f"journey {jid!r}"

        if not isinstance(j.get("title"), str) or not j["title"].strip():
            errors.append(f"{where}: `title` is required (shown in the test report)")

        # Grounding: every journey must point back at the evidence it came from.
        src = j.get("source")
        if not isinstance(src, dict) or not (src.get("docs") or src.get("inventory")):
            errors.append(
                f"{where}: `source` must cite evidence, e.g. "
                '{"docs": ["quickstart.md#upload"]} or {"inventory": ["openapi:orders"]}. '
                "A journey with no cited source is a guess."
            )

        steps = j.get("steps")
        if not isinstance(steps, list) or not steps:
            errors.append(f"{where}: `steps` must be a non-empty array")
            continue

        has_assertion = False
        for si, step in enumerate(steps):
            sw = f"{where} step[{si}]"
            if not isinstance(step, dict):
                errors.append(f"{sw}: must be an object")
                continue
            kind = step.get("kind")
            if kind not in STEP_KINDS:
                errors.append(
                    f"{sw}: unknown kind {kind!r}. Valid kinds: "
                    f"{', '.join(sorted(STEP_KINDS))}"
                )
                continue
            spec = STEP_KINDS[kind]

            for field, ftype in spec["required"].items():
                if field not in step:
                    errors.append(f"{sw} ({kind}): missing required field `{field}`")
                elif not _check_type(step[field], ftype):
                    errors.append(
                        f"{sw} ({kind}): `{field}` must be {_type_name(ftype)}, "
                        f"got {type(step[field]).__name__}"
                    )
            allowed = set(spec["required"]) | set(spec["optional"]) | {"kind"}
            for field in step:
                if field not in allowed:
                    errors.append(
                        f"{sw} ({kind}): unknown field `{field}`. Allowed: "
                        f"{', '.join(sorted(allowed))}. A misspelled assertion "
                        "field would make this step pass without checking anything."
                    )
                elif field in spec["optional"] and not _check_type(step[field], spec["optional"][field]):
                    errors.append(
                        f"{sw} ({kind}): `{field}` must be "
                        f"{_type_name(spec['optional'][field])}, "
                        f"got {type(step[field]).__name__}"
                    )

            res_id = step.get("resource")
            if isinstance(res_id, str) and known_ids:
                if res_id not in known_ids:
                    close = [k for k in known_ids if res_id.split(":")[-1] in k]
                    hint = f" Did you mean: {', '.join(sorted(close)[:3])}?" if close else ""
                    errors.append(
                        f"{sw} ({kind}): resource {res_id!r} is not in inventory.json.{hint}"
                    )
                else:
                    ok_kinds = STEP_RESOURCE_KINDS.get(kind, set())
                    actual = known_ids[res_id]
                    if ok_kinds and actual not in ok_kinds:
                        errors.append(
                            f"{sw} ({kind}): resource {res_id!r} is a {actual!r}, "
                            f"which cannot serve a {kind!r} step. Expected one of: "
                            f"{', '.join(sorted(ok_kinds))}"
                        )

            if kind.startswith("await_") or kind == "http" or kind == "browser":
                if any(k.startswith("expect") or k.startswith("match") for k in step):
                    has_assertion = True
            if kind == "sleep":
                warnings.append(
                    f"{sw}: `sleep` makes this test timing-dependent. "
                    "Prefer await_http / await_message / await_blob."
                )

        if not has_assertion:
            errors.append(
                f"{where}: no step asserts anything (no expect_* or match_* field). "
                "A journey that only performs actions passes vacuously."
            )

    return (errors, warnings)


def load(path: Path) -> Any:
    text = Path(path).read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValidationError(
            f"{path} is not valid JSON: {e.msg} at line {e.lineno} column {e.colno}"
        ) from e


def scaffold(inventory: dict[str, Any]) -> dict[str, Any]:
    """Produce a journeys.json skeleton wired to real resource ids.

    Deliberately incomplete: it contains one commented example journey and the
    resource catalog, so the model filling it in never has to guess an id.
    """
    resources = inventory.get("resources", [])
    by_kind: dict[str, list[str]] = {}
    for r in resources:
        by_kind.setdefault(r.get("kind", "?"), []).append(r["id"])

    http_res = next(
        (r["id"] for r in resources if r.get("kind") in {"service", "http", "container"}
         and r.get("base_url")),
        next((r["id"] for r in resources if r.get("kind") == "service"), "service:CHANGEME"),
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "_readme": [
            "This is the only file in the e2e pipeline written by judgment rather",
            "than by a probe. Everything downstream is generated from it, so it is",
            "worth reading carefully before running `e2e build`.",
            "",
            "Rules the validator enforces:",
            "  - `resource` must be an id from inventory.json (catalog below)",
            "  - every journey needs a `source` citing the docs or inventory entry",
            "    it came from",
            "  - every journey needs at least one expect_* / match_* assertion",
            "  - unknown fields are errors, not warnings",
            "",
            "Run `e2e journeys validate` after editing. Delete this key when done.",
        ],
        "_resource_catalog": {k: sorted(v) for k, v in sorted(by_kind.items())},
        "journeys": [
            {
                "id": "example-replace-me",
                "title": "Example: replace this with a real journey",
                "description": "Delete this journey once you have written real ones.",
                "source": {"docs": ["REPLACE: path/to/doc.md#section"]},
                "tags": ["example"],
                "steps": [
                    {
                        "kind": "http",
                        "name": "service is up",
                        "resource": http_res,
                        "method": "GET",
                        "path": "/health",
                        "expect_status": 200,
                    }
                ],
            }
        ],
    }
