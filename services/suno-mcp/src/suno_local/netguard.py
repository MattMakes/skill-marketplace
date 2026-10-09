"""Outbound network allowlisting for every layer this server can reach the network from.

There are three places traffic can leave from, and each gets its own enforcement:

1. This Python process (the MCP server, httpx, and every dependency loaded into it).
   `install_process_guard` adds a CPython audit hook — which cannot be removed once
   installed — that refuses DNS lookups for any host off the allowlist, and refuses socket
   connects to any IP that did not come from an allowed lookup. A dependency that tried to
   phone home would fail here even if it bypassed httpx entirely.
2. httpx itself. `GuardedTransport` checks the host and scheme of every request, including
   each redirect hop, before it is sent. This is the readable first line; (1) is the backstop.
3. The browser. `chromium_args` makes Chromium's own resolver answer NOTFOUND for every host
   off the allowlist and routes everything else into a proxy that does not exist, which
   covers beacons, keepalive fetches, workers and WebSockets that request interception
   cannot see. `BrowserGuard` also intercepts page requests so blocked hosts are counted
   and reported rather than failing silently.

All three record what they allowed and blocked in a `NetworkAudit`, which the
`suno_network_audit` tool returns.
"""

from __future__ import annotations

import ipaddress
import socket
import sys
import threading
from collections import Counter
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx

# What the browser needs to run suno.com/create, sign the Clerk session, and pass hCaptcha.
# Everything else Suno's page tries to load (analytics, ad pixels, consent managers, session
# replay) is blocked.
BROWSER_CORE_HOSTS: tuple[str, ...] = (
    "suno.com",
    "*.suno.com",  # studio-api.prod.suno.com, clerk.suno.com, static assets
    "suno.ai",
    "*.suno.ai",  # cdn1/cdn2 audio and artwork
    "hcaptcha.com",
    "*.hcaptcha.com",  # the generate button is gated by hCaptcha
    "challenges.cloudflare.com",  # bot challenge, if Cloudflare decides to show one
)

# Only for `suno-local login`: the identity providers Suno offers on its sign-in page.
# The MCP server never runs with these.
LOGIN_PROVIDER_HOSTS: tuple[str, ...] = (
    # Google
    "*.google.com",
    "*.gstatic.com",
    "*.googleusercontent.com",
    "accounts.youtube.com",
    # Apple
    "*.apple.com",
    "*.cdn-apple.com",
    # Microsoft
    "login.microsoftonline.com",
    "*.live.com",
    "*.msauth.net",
    "*.msftauth.net",
    # Discord
    "discord.com",
    "*.discord.com",
    "discordapp.com",
    "*.discordapp.com",
    "*.discordapp.net",
)

# This Python process needs far less than the browser: the studio API and the audio CDN.
PROCESS_HOSTS: tuple[str, ...] = (
    "studio-api.prod.suno.com",
    "*.suno.ai",
)


class BlockedNetworkAccess(PermissionError):
    """Raised when something tries to reach a host off the allowlist."""


def normalize_host(host: str) -> str:
    host = host.strip().lower().rstrip(".")
    if host.startswith("[") and host.endswith("]"):
        host = host[1:-1]
    return host


def host_allowed(host: str | None, patterns: tuple[str, ...] | list[str]) -> bool:
    """`example.com` matches only itself; `*.example.com` matches subdomains, not the apex."""
    if not host:
        return False
    host = normalize_host(host)
    for pattern in patterns:
        pattern = normalize_host(pattern)
        if pattern.startswith("*."):
            if host.endswith(pattern[1:]) and host != pattern[2:]:
                return True
        elif host == pattern:
            return True
    return False


def parse_extra_hosts(raw: str | None) -> tuple[str, ...]:
    """Parse SUNO_EXTRA_ALLOWED_HOSTS. Rejects patterns broad enough to defeat the allowlist."""
    if not raw:
        return ()
    out: list[str] = []
    for item in raw.split(","):
        item = normalize_host(item)
        if not item:
            continue
        bare = item[2:] if item.startswith("*.") else item
        if "*" in bare or "." not in bare or "/" in item or ":" in item:
            raise ValueError(
                f"SUNO_EXTRA_ALLOWED_HOSTS entry {item!r} is not a host or *.domain pattern"
            )
        out.append(item)
    return tuple(out)


@dataclass
class NetworkAudit:
    """Counts of every host each layer allowed or blocked, for the audit tool and stderr."""

    allowed: dict[str, Counter] = field(default_factory=dict)
    blocked: dict[str, Counter] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def record(self, layer: str, host: str, ok: bool) -> None:
        with self._lock:
            book = self.allowed if ok else self.blocked
            counter = book.setdefault(layer, Counter())
            first = host not in counter
            counter[host] += 1
        if not ok and first:
            print(f"[suno-local] blocked {layer} request to {host}", file=sys.stderr, flush=True)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "allowed": {k: dict(v) for k, v in self.allowed.items()},
                "blocked": {k: dict(v) for k, v in self.blocked.items()},
            }


AUDIT = NetworkAudit()


# --- layer 1: the whole Python process ------------------------------------------------------

_guard_lock = threading.Lock()
_guard_patterns: tuple[str, ...] | None = None
_resolved_ips: set[str] = set()
_original_getaddrinfo = socket.getaddrinfo


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def _recording_getaddrinfo(host, port, *args, **kwargs):
    # The audit hook has already approved `host` by the time this runs. Remember what it
    # resolved to so the connect check can tell an approved IP from a hard-coded one.
    results = _original_getaddrinfo(host, port, *args, **kwargs)
    if _guard_patterns is not None and isinstance(host, (str, bytes)):
        name = normalize_host(host.decode() if isinstance(host, bytes) else host)
        if host_allowed(name, _guard_patterns):
            with _guard_lock:
                for *_ignored, sockaddr in results:
                    _resolved_ips.add(str(sockaddr[0]))
    return results


def _audit_hook(event: str, args: tuple) -> None:
    patterns = _guard_patterns
    if patterns is None:
        return
    if event == "socket.getaddrinfo":
        raw = args[0]
        if raw is None:
            return
        host = normalize_host(raw.decode() if isinstance(raw, bytes) else str(raw))
        if _is_ip(host):
            # asyncio re-resolves the IP it was handed; allow only IPs an approved name gave us.
            with _guard_lock:
                known = host in _resolved_ips
            if not known:
                AUDIT.record("python", host, False)
                raise BlockedNetworkAccess(f"suno-local: lookup of bare IP {host} is not allowed")
            return
        if not host_allowed(host, patterns):
            AUDIT.record("python", host, False)
            raise BlockedNetworkAccess(f"suno-local: DNS lookup for {host!r} is not allowlisted")
        AUDIT.record("python", host, True)
    elif event == "socket.connect":
        sock, address = args[0], args[1]
        if getattr(sock, "family", None) not in (socket.AF_INET, socket.AF_INET6):
            return  # unix sockets and pipes are local by definition
        # No loopback exemption: a local proxy on 127.0.0.1 could relay anywhere, and
        # nothing here needs TCP to localhost (Playwright and MCP stdio both use pipes).
        ip = normalize_host(str(address[0]))
        with _guard_lock:
            known = ip in _resolved_ips
        if not known:
            AUDIT.record("python", ip, False)
            raise BlockedNetworkAccess(f"suno-local: connect to {ip} was not via an allowed host")
    elif event in ("socket.sendto", "socket.sendmsg"):
        sock = args[0]
        if getattr(sock, "family", None) in (socket.AF_INET, socket.AF_INET6):
            raise BlockedNetworkAccess("suno-local: raw datagrams are not allowed")


def install_process_guard(patterns: tuple[str, ...] = PROCESS_HOSTS) -> None:
    """Lock this process's outbound network to `patterns`. Permanent for the process lifetime."""
    global _guard_patterns
    with _guard_lock:
        if _guard_patterns is not None:
            return
        _guard_patterns = tuple(patterns)
    socket.getaddrinfo = _recording_getaddrinfo
    sys.addaudithook(_audit_hook)


# --- layer 2: httpx -------------------------------------------------------------------------


class GuardedTransport(httpx.AsyncBaseTransport):
    """Refuses any request that is not HTTPS to an allowlisted host, redirects included."""

    def __init__(self, patterns: tuple[str, ...], inner: httpx.AsyncBaseTransport | None = None):
        self._patterns = patterns
        self._inner = inner or httpx.AsyncHTTPTransport(retries=0, trust_env=False)

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if request.url.scheme != "https" or not host_allowed(host, self._patterns):
            AUDIT.record("httpx", f"{request.url.scheme}://{host}", False)
            raise BlockedNetworkAccess(f"suno-local: request to {request.url.scheme}://{host} blocked")
        AUDIT.record("httpx", host, True)
        return await self._inner.handle_async_request(request)

    async def aclose(self) -> None:
        await self._inner.aclose()


# --- layer 3: the browser -------------------------------------------------------------------


def chromium_args(patterns: tuple[str, ...]) -> list[str]:
    """Chromium flags that hard-block every host off the allowlist, below page interception.

    Two independent layers, because Playwright's request interception does not see
    `navigator.sendBeacon` or `fetch(..., {keepalive: true})` — both were observed reaching
    a server with interception alone:

    - Resolver rules: every name off the list resolves to NOTFOUND. This also stops
      requests to bare IP literals.
    - A proxy that cannot exist (`.invalid` never resolves), bypassed only for the list.
      Anything off the list is sent to it and fails. Setting it explicitly also overrides
      any system or environment proxy, which would otherwise resolve names on Chromium's
      behalf and make the resolver rules moot. `<-loopback>` stops localhost getting the
      implicit bypass, so a page cannot reach services on your machine either.
    """
    excludes = " , ".join(f"EXCLUDE {p}" for p in patterns)
    bypass = ";".join(["<-loopback>", *patterns])
    return [
        f"--host-resolver-rules=MAP * ~NOTFOUND , {excludes}",
        "--proxy-server=http://blocked.invalid:9",
        f"--proxy-bypass-list={bypass}",
        # Stop WebRTC from opening UDP straight to STUN servers, which bypasses DNS.
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-domain-reliability",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-pings",
        "--no-first-run",
        "--no-default-browser-check",
    ]


class BrowserGuard:
    """Playwright request interception that allows only the allowlist and records the rest."""

    def __init__(self, patterns: tuple[str, ...]):
        self.patterns = patterns

    def url_allowed(self, url: str) -> tuple[bool, str]:
        parts = urlsplit(url)
        if parts.scheme in ("data", "blob", "about"):
            return True, parts.scheme
        host = normalize_host(parts.hostname or "")
        ok = parts.scheme in ("https", "wss") and host_allowed(host, self.patterns)
        return ok, host or url[:80]

    async def attach(self, context) -> None:
        async def on_route(route):
            ok, host = self.url_allowed(route.request.url)
            AUDIT.record("browser", host, ok)
            if ok:
                await route.fallback()
            else:
                await route.abort("blockedbyclient")

        async def on_ws(ws):
            ok, host = self.url_allowed(ws.url)
            AUDIT.record("browser-ws", host, ok)
            if ok:
                ws.connect_to_server()
            else:
                await ws.close(code=1008, reason="blocked by suno-local")

        await context.route("**/*", on_route)
        await context.route_web_socket("**/*", on_ws)
