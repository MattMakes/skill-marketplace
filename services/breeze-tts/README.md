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

Jobs are written to `jobs/<id>/`, so restarting the server mid-article does not throw away audio
that has already been generated.

The service binds `127.0.0.1` only. One worker thread owns the model: it serialises GPU work and
keeps MLX on a single thread without locking anywhere else.

## Engines

`BREEZE_ENGINE=say` swaps Breeze for the macOS built-in `say`. It is roughly 20x realtime and needs
no model, which makes it the fast path for testing the pipeline end to end — and a usable fallback
if the model is unavailable. `BREEZE_ENGINE=breeze` (the default) is the real thing.

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
