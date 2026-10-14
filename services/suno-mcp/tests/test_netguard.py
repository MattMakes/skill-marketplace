import asyncio
import subprocess
import sys
import textwrap

import httpx
import pytest

from suno_local.netguard import (
    BROWSER_CORE_HOSTS,
    PROCESS_HOSTS,
    BlockedNetworkAccess,
    BrowserGuard,
    GuardedTransport,
    chromium_args,
    host_allowed,
    parse_extra_hosts,
)


@pytest.mark.parametrize(
    "host,ok",
    [
        ("suno.com", True),
        ("studio-api.prod.suno.com", True),
        ("SUNO.COM.", True),
        ("cdn1.suno.ai", True),
        ("evilsuno.com", False),
        ("suno.com.evil.net", False),
        ("suno.co", False),
        ("google-analytics.com", False),
        ("", False),
        (None, False),
    ],
)
def test_browser_host_matching(host, ok):
    assert host_allowed(host, BROWSER_CORE_HOSTS) is ok


def test_wildcard_does_not_match_apex():
    assert not host_allowed("suno.ai", ("*.suno.ai",))
    assert host_allowed("cdn1.suno.ai", ("*.suno.ai",))


def test_process_allowlist_is_narrow():
    assert host_allowed("studio-api.prod.suno.com", PROCESS_HOSTS)
    assert not host_allowed("suno.com", PROCESS_HOSTS)
    assert not host_allowed("clerk.suno.com", PROCESS_HOSTS)


@pytest.mark.parametrize("bad", ["*", "*.com", "com", "*.*.com", "http://x.com", "x.com:443", "a/b.com"])
def test_extra_hosts_rejects_broad_or_malformed(bad):
    with pytest.raises(ValueError):
        parse_extra_hosts(bad)


def test_extra_hosts_accepts_hosts_and_domains():
    assert parse_extra_hosts(" fonts.gstatic.com , *.example.org ,") == ("fonts.gstatic.com", "*.example.org")


def test_chromium_args_fail_closed():
    rules = chromium_args(("suno.com", "*.suno.com"))[0]
    assert rules == "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE suno.com , EXCLUDE *.suno.com"
    assert not any("remote-debugging" in a for a in chromium_args(BROWSER_CORE_HOSTS))


def test_browser_guard_urls():
    guard = BrowserGuard(BROWSER_CORE_HOSTS)
    assert guard.url_allowed("https://suno.com/create")[0]
    assert guard.url_allowed("wss://x.suno.com/socket")[0]
    assert guard.url_allowed("data:text/plain,hi")[0]
    assert not guard.url_allowed("http://suno.com/")[0]  # plaintext
    assert not guard.url_allowed("https://www.google-analytics.com/g/collect")[0]
    assert not guard.url_allowed("https://1.2.3.4/")[0]


def _run(coro):
    return asyncio.run(coro)


def test_guarded_transport_blocks_and_allows():
    seen = []

    def handler(request):
        seen.append(str(request.url))
        return httpx.Response(200, json={"ok": True})

    inner = httpx.MockTransport(handler)

    async def go():
        async with httpx.AsyncClient(transport=GuardedTransport(PROCESS_HOSTS, inner)) as c:
            assert (await c.get("https://studio-api.prod.suno.com/api/x")).status_code == 200
            for url in ("https://example.com/", "http://studio-api.prod.suno.com/", "https://suno.com/"):
                with pytest.raises(BlockedNetworkAccess):
                    await c.get(url)

    _run(go())
    assert seen == ["https://studio-api.prod.suno.com/api/x"]


def test_guarded_transport_checks_every_redirect_hop():
    def handler(request):
        if request.url.host == "cdn1.suno.ai":
            return httpx.Response(302, headers={"Location": "https://exfil.example/steal"})
        return httpx.Response(200)

    async def go():
        transport = GuardedTransport(PROCESS_HOSTS, httpx.MockTransport(handler))
        async with httpx.AsyncClient(transport=transport, follow_redirects=True) as c:
            with pytest.raises(BlockedNetworkAccess):
                await c.get("https://cdn1.suno.ai/a.mp3")

    _run(go())


def test_process_guard_blocks_everything_off_list():
    # Runs in a fresh interpreter: the audit hook is permanent once installed.
    script = textwrap.dedent(
        """
        import socket, threading, urllib.request
        from suno_local.netguard import install_process_guard, BlockedNetworkAccess
        install_process_guard()

        def blocked(fn):
            try:
                fn()
            except Exception as exc:
                # urllib wraps socket errors in URLError(reason=...)
                while exc is not None:
                    if isinstance(exc, BlockedNetworkAccess):
                        return True
                    exc = getattr(exc, "reason", None) if not exc.__cause__ else exc.__cause__
                    if not isinstance(exc, BaseException):
                        exc = None
                return "wrong error"
            return False

        results = {
            "dns_other_host": blocked(lambda: socket.getaddrinfo("example.com", 443)),
            "connect_hardcoded_ip": blocked(lambda: socket.create_connection(("93.184.216.34", 443), timeout=2)),
            "urllib_bypassing_httpx": blocked(lambda: urllib.request.urlopen("https://example.com", timeout=2)),
            "udp_sendto": blocked(lambda: socket.socket(socket.AF_INET, socket.SOCK_DGRAM).sendto(b"x", ("8.8.8.8", 53))),
        }

        # Allowed host: the guard must not be what stops it (DNS may still fail in a sandbox).
        try:
            socket.getaddrinfo("studio-api.prod.suno.com", 443)
            results["dns_allowed_host"] = "resolved"
        except BlockedNetworkAccess:
            results["dns_allowed_host"] = "BLOCKED"
        except OSError:
            results["dns_allowed_host"] = "resolver unavailable"

        # Loopback is not exempt: a local proxy could relay to anywhere.
        srv = socket.socket(); srv.bind(("127.0.0.1", 0)); srv.listen(1)
        port = srv.getsockname()[1]
        results["loopback"] = blocked(lambda: socket.create_connection(("127.0.0.1", port), timeout=2))
        results["localhost_name"] = blocked(lambda: socket.getaddrinfo("localhost", port))

        # A proxy in the environment cannot be used as a relay either.
        import os
        os.environ["HTTPS_PROXY"] = f"http://127.0.0.1:{port}"
        results["env_proxy"] = blocked(lambda: urllib.request.urlopen("https://example.com", timeout=2))
        print(results)
        """
    )
    out = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr
    results = eval(out.stdout.strip().splitlines()[-1])
    assert results["dns_other_host"] is True
    assert results["connect_hardcoded_ip"] is True
    assert results["urllib_bypassing_httpx"] is True
    assert results["udp_sendto"] is True
    assert results["dns_allowed_host"] != "BLOCKED"
    assert results["loopback"] is True
    assert results["localhost_name"] is True
    assert results["env_proxy"] is True
    assert "blocked python request to example.com" in out.stderr


def test_process_guard_lets_allowed_hosts_connect_through_asyncio():
    # The positive path, end to end through asyncio's resolver and sock_connect, which is
    # what httpx/anyio use. `localhost` stands in for Suno so no network is needed.
    script = textwrap.dedent(
        """
        import asyncio, socket
        from suno_local.netguard import install_process_guard, BlockedNetworkAccess

        srv = socket.socket(); srv.bind(("127.0.0.1", 0)); srv.listen(1)
        port = srv.getsockname()[1]
        install_process_guard(("localhost",))

        async def main():
            reader, writer = await asyncio.open_connection("localhost", port, family=socket.AF_INET)
            writer.close()
            try:
                await asyncio.open_connection("127.0.0.2", port)
            except BlockedNetworkAccess:
                return "ok"
            return "unknown IP was allowed"

        print(asyncio.run(main()))
        """
    )
    out = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr
    assert out.stdout.strip() == "ok"
