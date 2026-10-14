"""A Playwright browser holding your suno.com login, locked to an allowlist of hosts.

The generation approach — set the form through React's value setter, then send a trusted
mouse click so hCaptcha accepts it — is ported from suno-mcp 0.1.0 (MIT, David Shibley),
which adapted it from unforced/suno-mcp. What changed, and why:

- No `--remote-debugging-port`. Upstream opened port 9222, which hands full control of the
  logged-in browser to any local process. Playwright talks to Chromium over a pipe, and the
  trusted click goes over that same pipe via `new_cdp_session`.
- No attaching to "whatever is on 127.0.0.1:9222" when the profile is locked. That fallback
  could drive your everyday browser. A locked profile is now an error.
- The cookie banner is declined, not accepted. Upstream clicked "Accept All"/"Allow All".
- Every request goes through `netguard`: resolver rules plus request interception.
- Service workers are blocked, so nothing can run or fetch outside page interception.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from playwright.async_api import BrowserContext, Page, async_playwright

from .config import SUNO_CREATE_URL, Settings
from .netguard import BrowserGuard, chromium_args

logger = logging.getLogger(__name__)

_PREPARE_GENERATE_JS = """
async (payload) => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function walkUp(el, match, maxDepth = 40) {
    const fkey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (!fkey) return null;
    let f = el[fkey], d = 0;
    while (f && d < maxDepth) {
      if (match(f)) return f;
      f = f.return; d++;
    }
    return null;
  }

  function setReactValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const anchor = document.querySelector('button[aria-label="Create song"]')
    || document.querySelector('main') || document.body;
  const createFiber = walkUp(anchor, f =>
    f.memoizedProps && typeof f.memoizedProps.onCreateClick === 'function'
  );
  if (!createFiber) {
    return { success: false, error: 'Could not find the Create handler on suno.com/create. Are you signed in?' };
  }

  const cp = createFiber.memoizedProps;
  if (cp.isGenerating) {
    return { success: false, error: 'A generation is already in progress. Wait for it to finish.' };
  }
  if (cp.isOutOfCredits) {
    return { success: false, error: 'Out of credits.' };
  }

  const wantMode = payload.mode === 'simple' ? 'simple' : 'custom';
  if (cp.mode && cp.mode !== wantMode) {
    const tabLabel = wantMode === 'simple' ? 'simple' : 'advanced';
    const tabBtn = Array.from(document.querySelectorAll('[role="tab"]')).find(b =>
      (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase() === tabLabel);
    if (tabBtn) { tabBtn.click(); await sleep(800); }
  }

  if (payload.mode === 'custom') {
    const lyricsArea = document.querySelector('textarea[data-testid="lyrics-textarea"]')
      || Array.from(document.querySelectorAll('textarea')).find(t =>
        /lyric|write/i.test(t.placeholder || ''));
    if (!lyricsArea) return { success: false, error: 'Lyrics box not found.' };
    setReactValue(lyricsArea, payload.lyrics);

    let styleArea = document.querySelector(
      'textarea[maxlength="1000"]:not([data-testid="lyrics-textarea"])'
    );
    if (!styleArea) {
      styleArea = Array.from(document.querySelectorAll('textarea')).find(t =>
        t !== lyricsArea && !t.closest('[style*="display: none"]'));
    }
    if (!styleArea) return { success: false, error: 'Style box not found.' };
    setReactValue(styleArea, payload.style);
  } else {
    const promptArea = document.querySelector('textarea[data-testid="prompt-textarea"]')
      || document.querySelector('textarea');
    if (!promptArea) return { success: false, error: 'Song description box not found.' };
    setReactValue(promptArea, payload.simplePrompt);
  }

  // React commits the new values asynchronously; wait until the Create handler sees them.
  for (let i = 0; i < 20; i++) {
    const fresh = walkUp(
      document.querySelector('button[aria-label="Create song"]') || anchor,
      f => f.memoizedProps && typeof f.memoizedProps.onCreateClick === 'function'
    );
    const p = fresh && fresh.memoizedProps;
    const ok = p && (payload.mode === 'custom'
      ? (p.lyrics && p.lyrics.length > 0 && p.styles && String(p.styles).length > 0)
      : ((p.lyrics && p.lyrics.length > 0) || (p.simplePrompt && p.simplePrompt.length > 0)));
    if (ok) break;
    await sleep(150);
  }

  const btnEl = document.querySelector('button[aria-label="Create song"]');
  if (!btnEl) return { success: false, error: 'Create button not on the page.' };
  btnEl.scrollIntoView({ block: 'center' });
  await sleep(100);
  const r = btnEl.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) {
    return { success: false, error: 'Create button is not visible. Run with SUNO_HEADLESS=false.' };
  }
  return { success: true, clickX: r.left + r.width / 2, clickY: r.top + r.height / 2 };
}
"""

# Decline, never accept. With the allowlist on, the consent manager usually cannot load at
# all; this covers the case where Suno serves the banner from its own domain.
_DECLINE_COOKIES_JS = """
async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let clicked = 0;
  for (const sel of ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler']) {
    const el = document.querySelector(sel);
    if (el) { el.click(); clicked++; await sleep(300); }
  }
  for (const label of ['Reject All', 'Reject all', 'Decline', 'Necessary only', 'Only necessary']) {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      (b.textContent || '').trim() === label);
    if (btn) { btn.click(); clicked++; await sleep(200); }
  }
  return clicked;
}
"""

_INVOKE_CREATE_JS = """
async () => {
  function walkUp(el, match, maxDepth = 40) {
    const fkey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (!fkey) return null;
    let f = el[fkey], d = 0;
    while (f && d < maxDepth) {
      if (match(f)) return f;
      f = f.return; d++;
    }
    return null;
  }
  const anchor = document.querySelector('button[aria-label="Create song"]')
    || document.querySelector('main') || document.body;
  const fiber = walkUp(anchor, f =>
    f.memoizedProps && typeof f.memoizedProps.onCreateClick === 'function');
  if (!fiber) return { ok: false, error: 'Create handler not found' };
  try {
    await fiber.memoizedProps.onCreateClick();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}
"""

_GET_TOKEN_JS = """
async () => {
  if (!window.Clerk) return { error: 'Suno sign-in has not loaded yet.' };
  if (!window.Clerk.session) return { error: 'Not signed in to Suno. Run `suno-local login`.' };
  try {
    return { token: await window.Clerk.session.getToken() };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
}
"""


class ProfileInUse(RuntimeError):
    pass


class BrowserSession:
    """One persistent, allowlisted Chromium profile with your Suno login in it."""

    def __init__(
        self,
        settings: Settings,
        *,
        login: bool = False,
        executable_path: str | None = None,
    ) -> None:
        self.settings = settings
        self.hosts = settings.browser_hosts(login=login)
        self.guard = BrowserGuard(self.hosts)
        self._executable_path = executable_path or os.environ.get("SUNO_BROWSER_EXECUTABLE")
        self._headless = False if login else settings.headless
        self._playwright = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._lock = asyncio.Lock()
        self._generate_lock = asyncio.Lock()

    async def get_page(self) -> Page:
        async with self._lock:
            if not (self._context and self._page and not self._page.is_closed()):
                await self._launch()
            assert self._page is not None
            return self._page

    async def _launch(self) -> None:
        context = await self.start_context()
        pages = context.pages
        self._page = pages[0] if pages else await context.new_page()
        await self._open_create()

    async def start_context(self) -> BrowserContext:
        """Launch the allowlisted browser without navigating anywhere."""
        profile = self.settings.profile_dir
        profile.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(profile, 0o700)  # it holds your Suno session cookies

        if self._playwright is None:
            self._playwright = await async_playwright().start()
        try:
            self._context = await self._playwright.chromium.launch_persistent_context(
                user_data_dir=str(profile),
                headless=self._headless,
                channel=self.settings.browser_channel,
                executable_path=self._executable_path,
                args=[
                    *chromium_args(self.hosts),
                    "--disable-blink-features=AutomationControlled",
                ],
                viewport={"width": 1280, "height": 900},
                service_workers="block",
                accept_downloads=False,
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "already in use" in msg or "processsingleton" in msg or "profile appears to be in use" in msg:
                raise ProfileInUse(
                    f"The Suno browser profile at {profile} is open in another process. "
                    "Close the `suno-local login` window or the other MCP server first."
                ) from exc
            raise

        await self.guard.attach(self._context)
        return self._context

    async def _open_create(self) -> None:
        page = self._page
        assert page is not None
        if "suno.com/create" not in page.url:
            await page.goto(SUNO_CREATE_URL, wait_until="domcontentloaded")
            await asyncio.sleep(2)
        try:
            await page.evaluate(_DECLINE_COOKIES_JS)
        except Exception:
            pass

    async def try_token(self) -> tuple[str | None, str]:
        page = await self.get_page()
        result = await page.evaluate(_GET_TOKEN_JS)
        return result.get("token"), result.get("error", "")

    async def get_token(self, attempts: int = 15) -> str:
        page = await self.get_page()
        if "suno.com/create" not in page.url:
            await self._open_create()
        last_error = "Not signed in to Suno. Run `suno-local login`."
        for _ in range(attempts):
            token, error = await self.try_token()
            if token:
                return token
            last_error = error or last_error
            await asyncio.sleep(1)
        raise RuntimeError(last_error)

    async def wait_for_login(self, timeout: float = 600) -> bool:
        """Poll until Clerk reports a session or the window is closed. For `suno-local login`."""
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout
        while loop.time() < deadline:
            if self._page is not None and self._page.is_closed():
                return False
            try:
                token, _ = await self.try_token()
            except Exception:
                token = None  # mid-navigation through a sign-in provider
            if token:
                return True
            await asyncio.sleep(2)
        return False

    async def _trusted_click(self, page: Page, x: float, y: float) -> None:
        # Input events sent through CDP are trusted (isTrusted === true), which hCaptcha needs.
        # The CDP session rides Playwright's own pipe to the browser; no port is opened.
        cdp = await page.context.new_cdp_session(page)
        try:
            base = {"x": x, "y": y}
            await cdp.send("Input.dispatchMouseEvent", {**base, "type": "mouseMoved", "button": "none", "buttons": 0})
            await cdp.send("Input.dispatchMouseEvent", {**base, "type": "mousePressed", "button": "left", "buttons": 1, "clickCount": 1})
            await asyncio.sleep(0.04)
            await cdp.send("Input.dispatchMouseEvent", {**base, "type": "mouseReleased", "button": "left", "buttons": 0, "clickCount": 1})
        finally:
            await cdp.detach()

    async def _click_fallbacks(self, page: Page) -> str:
        button = page.locator('button[aria-label="Create song"]')
        if await button.count():
            await button.click(timeout=5000)
            return "playwright"
        invoked = await page.evaluate(_INVOKE_CREATE_JS)
        if invoked.get("ok"):
            return "react-handler"
        raise RuntimeError(invoked.get("error") or "Could not click Create")

    async def drive_generate(
        self, *, mode: str, lyrics: str = "", style: str = "", simple_prompt: str = ""
    ) -> dict[str, Any]:
        async with self._generate_lock:
            page = await self.get_page()
            await self._open_create()

            captured: list[dict] = []
            got_clips = asyncio.Event()

            async def on_response(response):
                if "/api/generate/" not in response.url or response.status != 200:
                    return
                try:
                    data = await response.json()
                except Exception:
                    return
                clips = data.get("clips") or (data.get("data") or {}).get("clips")
                if clips:
                    captured.extend(clips)
                    got_clips.set()

            page.on("response", on_response)
            try:
                prep = await page.evaluate(
                    _PREPARE_GENERATE_JS,
                    {"mode": mode, "lyrics": lyrics, "style": style, "simplePrompt": simple_prompt},
                )
                if not prep.get("success"):
                    raise RuntimeError(prep.get("error", "Could not prepare the Create form"))

                method = "cdp"
                await self._trusted_click(page, prep["clickX"], prep["clickY"])
                try:
                    await asyncio.wait_for(got_clips.wait(), timeout=15)
                except asyncio.TimeoutError:
                    method = await self._click_fallbacks(page)
                    try:
                        await asyncio.wait_for(got_clips.wait(), timeout=30)
                    except asyncio.TimeoutError:
                        logger.warning("no /api/generate/ response within 45s (method=%s)", method)

                if captured:
                    return {"clips": captured, "message": "Song generation started", "click_method": method}
                return {
                    "clips": [],
                    "message": "Create was clicked but Suno did not answer with new clips. "
                    "Check the Suno window for an hCaptcha or an error.",
                    "click_method": method,
                }
            finally:
                page.remove_listener("response", on_response)

    async def close(self) -> None:
        if self._context:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None
            self._page = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
