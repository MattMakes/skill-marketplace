#!/usr/bin/env node
// Narrate an explain-diff HTML explainer: send its prose to the local narration
// service, then append an audio player that highlights each paragraph as it is read.
//
//   narrate.mjs check [--json]
//   narrate.mjs <file.html> [--service URL] [--inline] [--wait-seconds N] [--json]
//
// Narration is optional. If the service is not running the explainer is left exactly
// as it was and the script exits 3 - never an error, just nothing added.
//
// Synthesis runs at roughly real time, so a long explainer takes as many minutes to
// narrate as it does to listen to. The service does that work as a job; this script
// starts the job, waits up to --wait-seconds, and records the job id beside the HTML.
// Re-running resumes waiting on the same job rather than starting a second one.
//
// Exit 0 = player embedded, 1 = failure, 2 = usage or IO problem,
//      3 = service unavailable (nothing changed), 4 = job still running (re-run later).
//
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { addFallbackMarkers, decodeEntities, markedElements, toText } from "./html.mjs";
import { inject, playerBlock } from "./player.mjs";

const DEFAULT_SERVICE = process.env.BREEZE_TTS_URL || "http://127.0.0.1:8477";
const DEFAULT_WAIT = 480;
const POLL_SECONDS = 3;

const EXIT = { ok: 0, failed: 1, usage: 2, unavailable: 3, running: 4 };

function parseArgs(argv) {
  const opts = { service: DEFAULT_SERVICE, inline: false, wait: DEFAULT_WAIT, json: false, file: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--service") opts.service = argv[++i];
    else if (arg === "--inline") opts.inline = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--wait-seconds") opts.wait = Number(argv[++i]);
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg.startsWith("-")) throw new UsageError(`unknown flag: ${arg}`);
    else if (opts.file === null && arg !== "check") opts.file = arg;
    else if (arg === "check") opts.check = true;
  }
  if (!Number.isFinite(opts.wait) || opts.wait < 0) throw new UsageError("--wait-seconds must be a number");
  opts.service = opts.service.replace(/\/+$/, "");
  return opts;
}

class UsageError extends Error {}

async function health(service, timeoutMs = 3000) {
  try {
    const res = await fetch(`${service}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { status: "unreachable", reason: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { status: "unreachable", reason: err.name === "TimeoutError" ? "timed out" : err.message };
  }
}

/** Pull the narratable prose out of the explainer, marking it first if need be. */
function collect(html) {
  let marked = markedElements(html);
  let updated = html;
  let addedMarkers = 0;
  if (marked.length === 0) {
    // An explainer written before the skill emitted markers: infer them once.
    const fallback = addFallbackMarkers(html);
    updated = fallback.html;
    addedMarkers = fallback.added;
    marked = markedElements(updated);
  }
  const segments = [];
  marked.forEach((el, index) => {
    // An override is raw attribute text, so it still needs entities decoded.
    const text = (el.override != null ? decodeEntities(el.override) : toText(el.inner)).trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    // Headings are spoken section cues, so a one-word heading still earns a segment;
    // prose needs a few words to be worth interrupting the flow for.
    const floor = /^h[1-6]$/.test(el.tag) ? 1 : 3;
    if (words >= floor) segments.push({ id: `s${index}`, index, text });
  });
  return { html: updated, segments, addedMarkers, markedCount: marked.length };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poll(service, jobId, waitSeconds, onTick) {
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    const res = await fetch(`${service}/v1/narrate/${jobId}`, { signal: AbortSignal.timeout(10000) });
    if (res.status === 404) throw new Error(`job ${jobId} is gone from the service`);
    const job = await res.json();
    if (job.status === "done") return job;
    if (job.status === "error") throw new Error(job.error || "synthesis failed");
    if (Date.now() >= deadline) return job;
    onTick?.(job);
    await sleep(POLL_SECONDS * 1000);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const say = (obj, text) => {
    if (opts.json) console.log(JSON.stringify(obj));
    else if (text) console.log(text);
  };

  if (opts.help || (!opts.file && !opts.check)) {
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n")
      .slice(1).filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
    return opts.help ? EXIT.ok : EXIT.usage;
  }

  const info = await health(opts.service);
  if (opts.check || !opts.file) {
    const available = info.status === "ok";
    say({ available, service: opts.service, ...info },
      available ? `narration service ready (${info.engine})` : `narration service unavailable: ${info.status}`);
    return available ? EXIT.ok : EXIT.unavailable;
  }

  const file = path.resolve(opts.file);
  if (!fs.existsSync(file)) throw new UsageError(`no such file: ${file}`);

  const statePath = `${file}.narration.json`;
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};

  if (info.status !== "ok") {
    say({ status: "skipped", reason: info.status, service: opts.service, ...info },
      `narration skipped: service ${info.status} at ${opts.service}`);
    return EXIT.unavailable;
  }

  const original = fs.readFileSync(file, "utf8");
  const { html: prepared, segments, addedMarkers, markedCount } = collect(original);
  if (segments.length === 0) {
    say({ status: "failed", reason: "no narratable paragraphs" }, "no narratable paragraphs found");
    return EXIT.failed;
  }

  let jobId = state.job_id;
  let job = null;
  if (jobId) {
    const res = await fetch(`${opts.service}/v1/narrate/${jobId}`).catch(() => null);
    job = res && res.ok ? await res.json() : null;
    if (!job || job.status === "error" || job.total !== segments.length) jobId = null;
  }
  if (!jobId) {
    const res = await fetch(`${opts.service}/v1/narrate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segments: segments.map((s) => ({ id: s.id, text: s.text })) }),
    });
    if (!res.ok) throw new Error(`service refused the job: HTTP ${res.status} ${await res.text()}`);
    jobId = (await res.json()).job_id;
    fs.writeFileSync(statePath, JSON.stringify({ job_id: jobId, segments: segments.length, service: opts.service }, null, 2));
  }

  if (!opts.json) {
    console.log(`narrating ${segments.length} paragraphs (job ${jobId}); synthesis runs at about real time`);
  }
  job = await poll(opts.service, jobId, opts.wait, (tick) => {
    if (!opts.json) process.stderr.write(`\r  ${tick.done}/${tick.total} paragraphs…`);
  });
  if (!opts.json) process.stderr.write("\r\x1b[K");

  if (job.status !== "done") {
    say({ status: "running", job_id: jobId, done: job.done, total: job.total, file },
      `still narrating (${job.done}/${job.total}); re-run this command to pick it up`);
    return EXIT.running;
  }

  // Fetch the audio, then write the page. The MP3 sits beside the HTML by default;
  // --inline embeds it so the explainer stays a single self-contained file.
  const audioRes = await fetch(`${opts.service}/v1/narrate/${jobId}/audio.mp3`);
  if (!audioRes.ok) throw new Error(`could not fetch audio: HTTP ${audioRes.status}`);
  const audio = Buffer.from(await audioRes.arrayBuffer());

  let src;
  let mp3Path = null;
  if (opts.inline) {
    src = `data:audio/mpeg;base64,${audio.toString("base64")}`;
  } else {
    mp3Path = file.replace(/\.html?$/i, "") + ".narration.mp3";
    fs.writeFileSync(mp3Path, audio);
    src = path.basename(mp3Path);
  }

  // The service numbers cues by generation order; the player looks nodes up by their
  // position among [data-tts] elements. Any element skipped for having no speakable
  // text would shift every later highlight by one, so re-anchor cues to their element.
  const elementIndex = new Map(segments.map((s) => [s.id, s.index]));
  const cues = job.cues
    .map((cue) => ({ ...cue, index: elementIndex.has(cue.id) ? elementIndex.get(cue.id) : cue.index }))
    .sort((a, b) => a.start - b.start);

  const block = playerBlock({ cues, src, duration: job.duration, engine: job.engine });
  fs.writeFileSync(file, inject(prepared, block));

  say({
    status: "done", file, job_id: jobId, paragraphs: segments.length, marked: markedCount,
    added_markers: addedMarkers, duration: job.duration, engine: job.engine,
    realtime_factor: job.realtime_factor, mp3: mp3Path, inline: opts.inline,
  }, `narrated ${segments.length} paragraphs — ${Math.round(job.duration / 60)} min of audio` +
     `${mp3Path ? ` → ${path.basename(mp3Path)}` : " (inlined)"}` +
     `${addedMarkers ? `; added data-tts to ${addedMarkers} elements` : ""}`);
  return EXIT.ok;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    const usage = err instanceof UsageError;
    console.error(`${usage ? "usage" : "error"}: ${err.message}`);
    process.exit(usage ? EXIT.usage : EXIT.failed);
  },
);
