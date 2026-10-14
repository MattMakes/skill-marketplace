// derived from archify: bin/visual-check.mjs (MIT)
//
// Chrome discovery and SVG -> PNG via headless screenshot. PNG is a nicety
// (the Read tool renders PNG, not SVG), so nothing here ever throws: without
// Chrome the caller gets {ok: false, note} and carries on with the SVG.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const NO_CHROME_NOTE = 'No Chrome/Chromium found; PNG skipped. Set CHROME_PATH to enable.';

function executable(file, platform) {
  if (!file) return null;
  try {
    fs.accessSync(file, platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
    return path.resolve(file);
  } catch {
    return null;
  }
}

function findOnPath(command, env, platform) {
  const directories = String(env.PATH || '').split(path.delimiter).filter(Boolean);
  const extensions = platform === 'win32'
    ? String(env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean)
    : [''];
  for (const directory of directories) {
    for (const extension of extensions) {
      const resolved = executable(path.join(directory, `${command}${extension}`), platform);
      if (resolved) return resolved;
    }
  }
  return null;
}

// Returns an absolute path to a Chrome or Chromium binary, or null. Env
// overrides win: DDD_NO_CHROME=1 forces null (tests and CI without a browser),
// CHROME_PATH or PUPPETEER_EXECUTABLE_PATH name the binary explicitly. An
// override that does not point at an executable is null, not a fallback,
// so a typo is noticed rather than silently using another browser.
export function findChrome({ env = process.env, platform = process.platform } = {}) {
  try {
    if (String(env.DDD_NO_CHROME || '') === '1') return null;
    for (const key of ['CHROME_PATH', 'PUPPETEER_EXECUTABLE_PATH']) {
      if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) return executable(env[key], platform);
    }
    const fixed = [];
    const commands = [];
    if (platform === 'darwin') {
      const home = env.HOME || os.homedir();
      for (const root of ['/Applications', path.join(home, 'Applications')]) {
        fixed.push(
          path.join(root, 'Google Chrome.app/Contents/MacOS/Google Chrome'),
          path.join(root, 'Chromium.app/Contents/MacOS/Chromium'),
          path.join(root, 'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'),
          path.join(root, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
          path.join(root, 'Brave Browser.app/Contents/MacOS/Brave Browser'),
        );
      }
    } else if (platform === 'win32') {
      for (const root of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)) {
        fixed.push(
          path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(root, 'Chromium', 'Application', 'chrome.exe'),
          path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        );
      }
    } else {
      commands.push('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'microsoft-edge');
    }
    for (const candidate of fixed) {
      const resolved = executable(candidate, platform);
      if (resolved) return resolved;
    }
    for (const command of commands) {
      const resolved = findOnPath(command, env, platform);
      if (resolved) return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

// Arguments for a one-shot headless run. A fresh --user-data-dir matters:
// without it Chrome hands the request to an already running instance, exits
// 0 and writes nothing.
export function headlessArgs(profileDir, { width = 1280, height = 800, env = process.env, screenshot } = {}) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-extensions',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-device-scale-factor=1',
    `--window-size=${Math.ceil(width)},${Math.ceil(height)}`,
    `--user-data-dir=${profileDir}`,
  ];
  if (screenshot) args.push(`--screenshot=${screenshot}`);
  const rootUser = typeof process.getuid === 'function' && process.getuid() === 0;
  if (rootUser || String(env.DDD_CHROME_NO_SANDBOX || '') === '1') args.unshift('--no-sandbox');
  return args;
}

function svgSize(svg) {
  const view = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
  if (view) return { width: Number(view[1]), height: Number(view[2]) };
  const w = /\swidth="([\d.]+)/.exec(svg);
  const h = /\sheight="([\d.]+)/.exec(svg);
  return { width: w ? Number(w[1]) : 1280, height: h ? Number(h[1]) : 800 };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(8);
    const read = fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    return read === 8 && head.equals(PNG_SIGNATURE);
  } catch {
    return false;
  }
}

// Runs Chrome and resolves when it exits, or earlier when `done()` reports
// the screenshot is on disk: some Chrome builds write the PNG and then sit
// until the timeout, which would cost 30 s per diagram. A finished PNG is
// one whose size has not changed between two polls.
function run(file, args, timeout, done) {
  return new Promise((resolve) => {
    let child;
    let settled = false;
    let poll = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (poll) clearInterval(poll);
      resolve(result);
    };
    try {
      child = execFile(file, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
        finish({ error: error && error.killed && done && done() ? null : error, stderr: String(stderr || '') });
      });
    } catch (error) {
      finish({ error, stderr: '' });
      return;
    }
    child.on('error', (error) => finish({ error, stderr: '' }));
    if (done) {
      let lastSize = -1;
      let killedAt = 0;
      poll = setInterval(() => {
        const size = done();
        if (size && size === lastSize && !killedAt) {
          killedAt = Date.now();
          try { child.kill(); } catch { /* already gone */ }
        } else if (killedAt && Date.now() - killedAt > 3000) {
          // Chrome ignored SIGTERM; the exit callback will still fire on
          // the execFile timeout, but do not make the caller wait for it.
          try { child.kill('SIGKILL'); } catch { /* already gone */ }
          finish({ error: null, stderr: '' });
        }
        lastSize = size || -1;
      }, 150);
    }
  });
}

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

// Renders an SVG file to PNG with headless Chrome. The SVG is inlined into a
// temporary HTML page so its own <style> applies and the page gets an explicit
// background (new headless screenshots are otherwise transparent). Resolves
// {ok, note}; never rejects.
export async function svgToPng(svgPath, pngPath, {
  chrome, width, height, env = process.env, timeoutMs = 30000, theme = 'light', scale = 1,
} = {}) {
  // Headless Chrome follows the OS colour scheme; pin the theme through the
  // [data-theme] hook in themeCss() so a PNG looks the same on every machine.
  const background = theme === 'dark' ? '#0f1218' : '#ffffff';
  const binary = chrome === undefined ? findChrome({ env }) : chrome;
  if (!binary) return { ok: false, note: NO_CHROME_NOTE };
  let work = null;
  try {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const size = svgSize(svg);
    const w = Math.ceil((width || size.width) * scale);
    const h = Math.ceil((height || size.height) * scale);
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'ddd-png-'));
    const html = path.join(work, 'page.html');
    const profile = path.join(work, 'profile');
    fs.mkdirSync(profile);
    const inner = svg.replace(/^<\?xml[^>]*\?>\s*/, '');
    fs.writeFileSync(html, `<!doctype html><html data-theme="${theme === 'dark' ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${background}}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${inner}</body></html>`);
    const out = path.resolve(pngPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (fs.existsSync(out)) fs.unlinkSync(out);
    const url = pathToFileURL(html).href;
    const args = [...headlessArgs(profile, { width: w, height: h, env, screenshot: out }), url];
    const { error, stderr } = await run(binary, args, timeoutMs, () => fileSize(out));
    if (isPng(out)) return { ok: true, note: '' };
    const why = error ? (error.killed ? `timed out after ${timeoutMs}ms` : error.message) : 'no PNG written';
    return { ok: false, note: `Chrome screenshot failed (${why}); PNG skipped.${stderr ? ` ${stderr.trim().split('\n').pop()}` : ''}` };
  } catch (error) {
    return { ok: false, note: `Chrome screenshot failed (${error.message}); PNG skipped.` };
  } finally {
    if (work) {
      try {
        fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        // a profile directory Chrome is still tearing down; it is in tmp
      }
    }
  }
}
