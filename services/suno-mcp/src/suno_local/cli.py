"""`suno-local serve | login | check`.

The process-wide network guard goes in before anything else runs, so every subcommand —
including the MCP server — is held to the allowlist from its first instruction.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys

from .config import Settings
from .netguard import AUDIT, PROCESS_HOSTS, install_process_guard


async def _login(settings: Settings) -> int:
    from .browser import BrowserSession

    session = BrowserSession(settings, login=True)
    print(
        "A browser window is opening on suno.com/create. Sign in there.\n"
        "Only Suno, hCaptcha and the sign-in providers (Google, Apple, Microsoft, Discord)\n"
        "can load; everything else is blocked and listed below.",
        file=sys.stderr,
    )
    try:
        await session.get_page()
        ok = await session.wait_for_login()
    finally:
        await session.close()
    if ok:
        print(f"Signed in. Session saved to {settings.profile_dir}", file=sys.stderr)
        return 0
    print("Not signed in (window closed or timed out).", file=sys.stderr)
    return 1


async def _check(settings: Settings, live: bool) -> int:
    report = {
        "profile_dir": str(settings.profile_dir),
        "download_dir": str(settings.download_dir),
        "headless": settings.headless,
        "browser_channel": settings.browser_channel or "playwright chromium",
        "browser_allowlist": list(settings.browser_hosts()),
        "python_allowlist": list(PROCESS_HOSTS),
    }
    code = 0
    if live:
        from .browser import BrowserSession
        from .client import SunoClient

        browser = BrowserSession(settings)
        client = SunoClient(settings, browser)
        try:
            credits = await client.get_credits()
            report["signed_in"] = True
            report["credits_left"] = credits.get("total_credits_left", credits)
        except Exception as exc:
            report["signed_in"] = False
            report["error"] = str(exc)
            code = 1
        finally:
            await client.close()
            await browser.close()
        report["network"] = AUDIT.snapshot()
    print(json.dumps(report, indent=2, default=str))
    return code


def main(argv: list[str] | None = None) -> None:
    install_process_guard(PROCESS_HOSTS)

    parser = argparse.ArgumentParser(prog="suno-local", description="Local, allowlisted Suno MCP server")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("serve", help="run the MCP server over stdio")
    sub.add_parser("login", help="open the browser to sign in to Suno once")
    check = sub.add_parser("check", help="print effective settings and allowlists")
    check.add_argument("--live", action="store_true", help="also sign in and read your credits")
    args = parser.parse_args(argv)

    try:
        settings = Settings.from_env()
    except ValueError as exc:
        parser.error(str(exc))

    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.WARNING,
        stream=sys.stderr,
        format="[suno-local] %(levelname)s %(name)s: %(message)s",
    )

    if args.cmd == "serve":
        from .server import serve

        asyncio.run(serve(settings))
    elif args.cmd == "login":
        sys.exit(asyncio.run(_login(settings)))
    else:
        sys.exit(asyncio.run(_check(settings, args.live)))
