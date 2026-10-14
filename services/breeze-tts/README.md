# breeze-tts

A local narration service. It holds [Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2)
in memory on Apple Silicon and turns a list of text segments into one MP3 plus the exact times
each segment is spoken, so a document can highlight itself while it is read aloud.

It is a companion to the `code:explain-diff` skill in this repo, not a plugin — nothing installs
it, and `marketplace.json` does not list it. That skill writes an HTML explainer of a code change;
this service reads it aloud. Anything else that can POST a list of paragraphs can use it too.

Narration is optional by construction. The client
(`plugins/code/skills/explain-diff/scripts/narrate.mjs`) probes `/health`, and when this service
is not running it exits 3 and leaves the explainer untouched.

DDD, Blueprint, and explain-diff now all live in the `code` plugin. This service stays
outside the plugin installation and needs no path changes when those skills are updated.
For an explainer containing Blueprint viewers, embed and inspect the diagrams first, then
narrate only the marked article prose. From the repository root:

```bash
node plugins/code/skills/explain-diff/scripts/narrate.mjs docs/<explainer>.html --inline
```

`--inline` keeps the audio inside the same self-contained HTML file. Diagram controls, code,
navigation, and quiz content are excluded by the skill's narration markers. Exit 4 means the
job is still running; rerun the same command while the service remains running to pick it up.


## Requirements

An Apple Silicon Mac, plus `brew install uv sox ffmpeg`. The model itself is not Mac-native —
BreezeBlue ship CUDA-only code — so this uses [rishikksh20/breeze-tts-mlx](https://github.com/rishikksh20/breeze-tts-mlx),
an MLX reimplementation, vendored at a pinned commit.

## Setup

Run these from this directory (`services/breeze-tts`):

```bash
just install   # first run: vendor the port, resolve deps, fetch ~3.5 GB of weights, start
just start     # start an installed service and wait for the model to load
just down      # stop it and clear runtime state; weights and venv are kept
```

`just` also gives you `status`, `logs`, `smoke`, `voice` and `purge` — run `just` on its own to
list them. Each recipe is a thin wrapper over the scripts in `scripts/`, which work on their own
if you would rather not install `just`:

```bash
scripts/setup.sh          # vendor the port, resolve deps, download ~3.5 GB of weights
scripts/serve.sh --daemon # start; the model takes ~45 s to load
scripts/status.sh         # exit 0 ready, 3 loading or down, 1 engine failed
```

`just start` waits for the model rather than returning the moment the server binds, so when it
comes back a narration request will actually be answered.

Everything is pinned in `model.lock.json` — the weights revision and the port commit — so a fresh
clone reproduces this exact setup.

## Speed, measured

On an M5 Max with INT8 weights, roughly **1–2x realtime**: 1.02x on a single long passage,
1.86–2.25x across real multi-paragraph articles. Audio is produced at about the speed you listen to
it, so a 20-minute explainer takes somewhere near 10–20 minutes to narrate. That is why synthesis
is a job rather than a request — nothing useful can be done synchronously at that rate.

```
audio 13.92s | generated in 13.6s | 1.02x realtime
```

Re-measure any time with `scripts/smoke.sh`.

## The voice

`scripts/make-voice.sh` records `narrator/reference.wav` once and commits it with its transcript.

This matters more than it looks. Breeze's voice *design* mode samples a new speaker on every call,
so an article generated that way drifts between voices paragraph by paragraph. With a reference
committed, every segment is *cloned* from that one recording and the whole article is read by the
same person. Re-run the script with a different instruction to recast the narrator:

```bash
scripts/make-voice.sh "A dry, unhurried British narrator."
```

## API

| Route | Purpose |
|---|---|
| `GET /health` | `status` is `loading`, `ok`, or `error`. Clients treat anything but `ok` as unavailable. |
| `POST /v1/narrate` | `{segments: [{id, text}]}` → `{job_id}`, immediately. |
| `GET /v1/narrate/{id}` | Progress, then `cues`, `duration`, `realtime_factor` when done. |
| `GET /v1/narrate/{id}/audio.mp3` | The finished narration. |

Job metadata and completed MP3s are written to `jobs/<id>/`. Unfinished audio and the work
queue are held in memory: restarting the server interrupts synthesis, and queued/running jobs
are not automatically recovered. To restart an interrupted article, remove its adjacent
`<explainer>.html.narration.json` client sidecar and rerun the narration command; it starts a
new job from the beginning. Completed jobs remain available unless you clear `jobs/`.

The service binds `127.0.0.1` only. One worker thread owns the model: it serialises GPU work and
keeps MLX on a single thread without locking anywhere else.

## Engines

`BREEZE_ENGINE=say` swaps Breeze for the macOS built-in `say`. It is roughly 20x realtime and needs
no model, which makes it the fast path for testing the pipeline end to end — and a usable fallback
if the model is unavailable. `BREEZE_ENGINE=breeze` (the default) is the real thing.

## Security posture

This binds `127.0.0.1` and has no authentication, which is the right trade for a personal
tool but means localhost is the only boundary. Two consequences are handled explicitly:

- **Any local process can reach it.** So one request is capped — 1000 segments, 20k characters
  each, 500k total (`BREEZE_MAX_SEGMENTS`, `BREEZE_MAX_SEGMENT_CHARS`, `BREEZE_MAX_TOTAL_CHARS`).
  Without a cap, a single POST could queue days of GPU work and fill the disk.
- **A web page can be pointed at a loopback service.** DNS rebinding re-resolves a hostname to
  127.0.0.1 after the page loads, so the browser treats the local service as same-origin and can
  read its responses. `TrustedHostMiddleware` rejects any request whose `Host` is not a loopback
  name; set `BREEZE_ALLOWED_HOSTS` if you deliberately front this with a proxy.

Job ids are validated against `[0-9a-f]{12}` before they are joined onto a filesystem path.
`JOBS_DIR / job_id` would otherwise accept `..`, or an absolute path — `pathlib` discards the
left side when the right is absolute — and one of those paths is served back as a file.

`jobs/` keeps the text of everything you have narrated, in plaintext, until you clear it.
`just down` clears it; if you narrate anything sensitive, that is the thing to remember.

Weights are `.safetensors`, which cannot execute code on load, and nothing here passes
`trust_remote_code`. The vendored port makes no network calls of its own.

## Licensing — read before publishing anything

The service code here follows the repository's licence. The vendored port is Apache-2.0 and keeps
its own notice at `vendor/breeze-tts-mlx/LICENSE`.

**The weights are neither.** Breeze TTS 2's weights, any derivative of them, and *the audio you
generate with them* fall under the BreezeBlue Research and Non-Commercial License. Commercial use
of the output requires a paid BreezeBlue subscription, and that subscription explicitly does not
grant commercial rights to self-hosted output.

So: `models/` is gitignored and weights are never committed here. `setup.sh` downloads them from
Hugging Face, where you accept BreezeBlue's terms yourself. Whether your particular use counts as
non-commercial is your call to make.

The MLX port is young — four stars, and its own README says it "needs a complete checkpoint for
numerical parity and audio quality testing." It has not been validated against BreezeBlue's
reference implementation. It sounds good; it is not guaranteed to be faithful.
