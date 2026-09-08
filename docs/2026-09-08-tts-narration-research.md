# Narrating explain-diff explainers with Breeze-TTS-2

Research note, 2026-09-08. Question asked: *can we download and run
[BreezeBlue/Breeze-TTS-2](https://huggingface.co/BreezeBlue/Breeze-TTS-2), feed it the prose
paragraphs of the HTML that `explain-diff` produces, and embed an MP3 player in the article so the
explainer reads itself aloud while you follow along?*

> **Outcome (same day): built and working.** The service lives in
> `../breeze-tts-service`; `explain-diff` narrates through it when it is running and
> silently skips when it is not. Measured speed on this M5 Max: **1.02x realtime** on a
> single long passage, **1.86x** across a multi-paragraph article — close to the
> optimistic end of the estimate below. The phased plan was followed, but the `say`
> stub ended up *inside* the service as a swappable engine rather than as a throwaway
> first phase. Sections below are the original research; they stand except where this
> banner corrects them.

Short answer: **yes, but not with the official code.** The upstream release is Linux + NVIDIA only.
There is a third-party Apple Silicon port that makes it viable on this machine, and it is
unverified. The HTML/player half of the job is straightforward and can be built and tested before
the model is ever downloaded.

Everything below is split into **confirmed** (read from the model card, the repos, or the HF API)
and **unverified** (needs a smoke test).

---

## 1. The model

**Confirmed:**

- Breeze-TTS-2 is a 3B-param open-weight TTS model: text encoder + backbone transformer + depth
  decoder + a Qwen3-TTS-derived codec. English and Chinese. Output is 24 kHz mono.
- Three control modes: **voice cloning** (reference audio + its exact transcript), **voice design**
  (natural-language `--instruction`), and **voice direction** (inline cues like `(sigh)`).
- Official requirements: **Linux, Python 3.10+, a CUDA NVIDIA GPU, ~7.7 GiB VRAM.** There is no
  macOS, MPS, or CPU path in the upstream repo (`github.com/breezeblue-ai/breeze-tts`). Its
  requirements pin `torch==2.9.1`, `transformers==4.57.3`, `qwen-tts==0.1.1`, and the Docker build
  wants Flash Attention.
- Upstream also ships a single-concurrency streaming server, `python -m breeze_infer.api`, exposing
  an OpenAI-shaped `POST /v1/audio/speech`. Useful if we ever run it on a remote GPU.
- **No hosted inference.** The model card says "This model isn't deployed by any Inference
  Provider." Self-host or nothing.

**This machine is an Apple M5 Max, 128 GB, macOS 26.5.1, no CUDA.** So the official path is out
unless we rent a GPU.

### The Apple Silicon port

[`rishikksh20/breeze-tts-mlx`](https://github.com/rishikksh20/breeze-tts-mlx) is a from-scratch MLX
reimplementation of the inference stack.

**Confirmed:**

- Apache-2.0 **code**, `master` branch, last pushed 2026-08-30, **4 stars**. It is new and lightly
  used.
- `infer.py` hard-requires `Darwin`/`arm64`. Setup is `brew install uv sox` then `uv sync --locked`;
  it wants **Python 3.12** (this machine has 3.11.4 — `uv python install 3.12` handles that, not a
  blocker). SoX is a native dependency of the FP32 audio tokenizer.
- Weights — neither repo is gated, no HF token needed:
  - `rishikksh20/Breeze-TTS-2-mlx` — pre-converted INT8, **3.75 GB**, ready to run.
  - `BreezeBlue/Breeze-TTS-2` — original, **7.68 GB**, needs local conversion.
- It supports every mode we need: `--mode {auto,plain,guided,clone,edit}`, `--ref-audio`/`--ref-text`,
  `--instruction`, `--cfg-scale`, `--seed`, `--temperature`, `--greedy`,
  `--audio-device {auto,mps,cpu}`.
- **There is a real Python API, not just a CLI.** `breeze_tts_mlx.runtime.BreezeMLXRuntime` exposes
  `.sample_rate` and `.iter_audio_chunks(...)`, a streaming generator. This matters more than
  anything else on this list — see §3.
- Generation caps: `max_new_tokens=1500` codec frames, `max_seq_len=2048`. That bounds one call to
  roughly a minute or two of speech; ample for a paragraph, not enough for a whole article.

**Unverified, and this is the crux:**

- **Speed.** The README explains how to read its `x realtime` readout but publishes no numbers. A
  Kleppmann-style explainer runs 2,000–4,000 words, so 15–30 minutes of audio. At 1.0x realtime
  that's 15–30 min of generation per explainer; at 0.3x it's over an hour. Nothing in the docs
  settles this. (A figure circulating about INT8 being ~2.5x slower than bf16 on Apple Silicon
  refers to *torchao* on MPS, not this port — don't plan around it. With 128 GB RAM we can try the
  full 7.68 GB checkpoint, which may well be the faster option.)
- **Fidelity.** The port's own README: *"This implementation needs a complete checkpoint for
  numerical parity and audio quality testing."* It has not been validated against the PyTorch
  reference. It may sound subtly wrong.


---

## 2. What the pipeline looks like

Five stages. Only stage 3 needs the model.

```
explain-diff HTML
  │
  1. EXTRACT     pick narratable nodes, assign stable ids, normalise text for speech
  │              → segments.json  [{id, text, kind}]
  2. PLAN        split over-long paragraphs at sentence boundaries
  │
  3. SYNTHESISE  one model load, loop over segments, clone from a fixed narrator ref
  │              → NNN.wav per segment (24 kHz mono)
  4. ASSEMBLE    measure durations, concat with ~400 ms gaps, ffmpeg → mp3
  │              → narration.mp3 + cues.json  [{id, start, end}]
  5. INJECT      add ids to the HTML nodes, inline the player + cue list
                 → the same self-contained HTML, now narrated
```

---

## 3. The implementation risks worth naming now

**Model load per segment.** `infer.py` is single-shot: one process, one WAV. Shelling out to it 40
times reloads 3B params 40 times and the run is dominated by startup. We must write our own driver
that constructs `BreezeMLXRuntime` **once** and loops `iter_audio_chunks` over the segments. The
port being importable rather than CLI-only is what makes this feasible; it's the first thing to
confirm in the smoke test.

**Voice drift.** `--instruction` (voice design) samples a *new* speaker each call — forty paragraphs
would wander between voices. The fix, which this port supports directly: generate one narrator clip
via voice design, keep it plus its exact transcript as a fixed reference, then run every segment in
`--mode clone` against that reference. Same `--seed` throughout. Verify by generating two segments
and listening for the same person.

**Length cap.** 1500 frames per call. Long paragraphs must be split at sentence boundaries and
rejoined; that logic belongs in stage 2, not bolted on later.

**Inline code reads terribly.** `git rev-parse --show-toplevel` narrated literally is noise. The
normalisation pass in stage 1 has to decide, per `<code>` span, whether to speak it, paraphrase it
("the git rev-parse command"), or skip it. This is the difference between something you'd listen to
and something you'd turn off.

---

## 4. What counts as a paragraph

`explain-diff` emits a specific mix, and the skill mandates HTML lists and `<pre>` code blocks, so
the narratable set has to be explicit:

| Element | Narrate? | Notes |
|---|---|---|
| `<p>` prose | ✅ | the main body |
| `<li>` in prose lists | ✅ | the skill requires HTML lists over ASCII |
| Callouts (key concepts, edge cases) | ✅ | maybe a short audio cue before them |
| `<h2>`/`<h3>` headings | ✅ | as spoken section markers, keeps you oriented |
| `<pre>` code blocks | ❌ | unlistenable |
| HTML-div diagrams / figures | ❌ | explicitly out of scope per your ask |
| Table of contents | ❌ | navigation chrome |
| Quiz section | ❌ | interactive; narrating answers spoils it |

Two ways to identify these:

1. **Post-hoc parsing** of the finished HTML. Works on explainers you already have; brittle against
   whatever markup the model invented that day.
2. **Generation-time markers** — amend `explain-diff/SKILL.md` to tag narratable nodes with
   `data-tts="p12"`. Robust, since we own the generator.

Do both: markers going forward, heuristic extraction as the fallback for existing files.

---

## 5. The player

- **Assembly:** per-segment WAV → durations → concat with ~400 ms gaps → `ffmpeg` to mono MP3
  (already installed, `/opt/homebrew/bin/ffmpeg`). 64 kbps mono is plenty for speech.
- **Sync:** emit `cues.json` as `[{id, start, end}]`, inlined into the page. Build the metadata
  track in JS rather than loading a `.vtt` file — explainers are opened as `file://`, and Chrome
  blocks `<track>` loads from an opaque origin (`data:` URIs hit the same check). This works
  everywhere and still gives you native `cuechange` events with no polling:

  ```js
  const track = audio.addTextTrack('metadata');
  cues.forEach(c => track.addCue(new VTTCue(c.start, c.end, c.id)));
  ```

  A plain `timeupdate` handler is the fallback. Audio playback itself is not CORS-gated, so a
  sidecar `<audio src="...mp3">` loads fine from `file://`.
- **UI:** sticky bottom bar — play/pause, ±15 s, playback speed, progress. The current segment gets
  a highlight and a gentle `scrollIntoView`; clicking any paragraph seeks the audio there. That
  click-to-seek is what makes it a reading companion rather than a podcast.
- **Embedding:** the skill mandates a single self-contained HTML file. A base64 data URI honours
  that — roughly 6–7 MB of base64 for 10 minutes of 64 kbps audio, which is large but works. A
  sidecar `.mp3` sharing the explainer's date-prefixed basename is cleaner and streams properly.
  Recommend the sidecar as default with a `--inline` flag for true single-file output.

---

## 6. Sequencing — build it backwards

The model is the slowest, riskiest, least certain piece, so don't start there.

**Phase 1 — the whole pipeline, stub engine (no download, testable in minutes).**
Use macOS's built-in `say -o out.aiff --file-format=AIFF` as the TTS engine. Build extraction,
chunking, concat, cue generation, and the player against it end to end. You find out immediately
whether extraction picks the right nodes, whether the highlighting feels right, whether the whole
idea is pleasant to use — all before 3.75 GB has downloaded.

**Phase 2 — Breeze smoke test.** Install the port, pull the INT8 checkpoint, generate ~30 s of
speech, and read the `x realtime` line it prints. That single number decides whether this is a
run-in-the-background nicety or a wait-half-an-hour chore.

```bash
git clone https://github.com/rishikksh20/breeze-tts-mlx && cd breeze-tts-mlx
brew install uv sox
uv python install 3.12 && uv sync --locked
uv run hf download rishikksh20/Breeze-TTS-2-mlx --local-dir chkpt-mlx-int8
uv run python infer.py chkpt-mlx-int8 \
  --text "<about 30 seconds of prose from a real explainer>" \
  --instruction "A calm, clear narrator." \
  --audio-device mps --output smoke.wav
```

Note `uv sync` pulls PyTorch as well as MLX — the FP32 audio tokenizer is still Torch-based — so the
install is bigger than the 3.75 GB of weights suggests. While you're here, compare INT8 against the
full checkpoint and generate two separate segments to check voice consistency.

**Phase 3 — swap engines.** With a pluggable `--engine {say,breeze}` interface, Breeze drops in
behind the same contract: text in, WAV at a known sample rate out. If the smoke test disappoints —
too slow, or the unvalidated port sounds off — the feature still ships on the stub, and Kokoro or
F5-TTS via MLX are drop-in alternatives at the same interface.

**Phase 4 — wire into the skill.** New skill, `plugins/code/skills/narrate-explainer/`, with the
driver in `scripts/`, plus a one-line hook in `explain-diff` so it can be invoked after the HTML
lands. Keeping it separate means `explain-diff` stays clean and the narrator works on any HTML
article, not just diffs. (Repo convention leans `.mjs` for scripts; MLX forces Python here.)

---

## 7. Open questions for the smoke test

1. What realtime factor does the M5 Max actually hit — INT8 vs. full checkpoint?
2. Does `BreezeMLXRuntime` construct once and generate repeatedly without leaking or degrading?
3. How many seconds of audio does the 1500-frame cap really buy?
4. Does `--mode clone` against a fixed reference hold one voice across many segments?
5. Does the unvalidated port sound good enough to listen to for 20 minutes?

## What was actually built

- `../breeze-tts-service` — the MLX port vendored at a pinned commit, weights pinned by revision
  in `model.lock.json`, a job API, a committed narrator reference for voice consistency, and
  `scripts/` for setup, serve, stop, status, smoke and voice minting.
- `plugins/code/skills/explain-diff/scripts/` — `narrate.mjs` (the client), `html.mjs`
  (extraction), `player.mjs` (the follow-along player) and `selftest.mjs`.
- `explain-diff/SKILL.md` gained three instructions: mark prose with `data-tts`, run the script,
  act on its exit code.

Open questions from §7, answered: speed is 1–2x realtime; the runtime does load once and generate
repeatedly; `clone` mode against a fixed reference holds one voice. Still unanswered: whether the
unvalidated port is faithful to BreezeBlue's reference, and whether it stays pleasant across a
full twenty-minute listen.
