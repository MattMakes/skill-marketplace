// The player that gets appended to an explainer: a sticky bar, a highlight that
// tracks the voice, and click-to-seek on any narrated paragraph.
//
// Everything is inlined and pairs cues to nodes by document order, so the page keeps
// working when opened straight off disk as file:// - which is how these explainers
// are usually read.

export const BEGIN = "<!-- narration:begin -->";
export const END = "<!-- narration:end -->";

export function playerBlock({ cues, src, duration, engine }) {
  // `src` lives on the <audio> element's attribute; repeating it here would embed the
  // whole base64 MP3 a second time under --inline.
  //
  // JSON.stringify does not escape `</script>`, and these explainers get shared, so any
  // value that ever reaches a cue id or engine name could otherwise close the script
  // block and inject markup. Escaping `<` closes that off for good; U+2028/9 are escaped
  // because they are literal line terminators in JavaScript but legal inside a JSON string.
  const data = JSON.stringify({ cues, duration, engine })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const srcAttr = String(src).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `${BEGIN}
<style>
  [data-tts] { scroll-margin-top: 96px; transition: background-color .25s ease; border-radius: 4px; }
  [data-tts].tts-current { background: rgba(255, 214, 0, .28); box-shadow: 0 0 0 4px rgba(255, 214, 0, .28); }
  [data-tts]:hover { cursor: pointer; background: rgba(120, 120, 120, .10); }
  #tts-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;
    display: flex; gap: .6rem; align-items: center;
    padding: .55rem .8rem calc(.55rem + env(safe-area-inset-bottom, 0px));
    background: rgba(24, 24, 27, .96); color: #f4f4f5;
    font: 500 13px/1.3 system-ui, -apple-system, sans-serif;
    box-shadow: 0 -2px 14px rgba(0, 0, 0, .28);
  }
  #tts-bar button {
    background: #3f3f46; color: inherit; border: 0; border-radius: 6px;
    padding: .35rem .6rem; font: inherit; cursor: pointer; white-space: nowrap;
  }
  #tts-bar button:hover { background: #52525b; }
  #tts-play { min-width: 3.1rem; background: #2563eb; }
  #tts-play:hover { background: #3b82f6; }
  #tts-seek { flex: 1; min-width: 60px; accent-color: #2563eb; }
  #tts-time { font-variant-numeric: tabular-nums; opacity: .8; min-width: 5.9rem; text-align: right; }
  #tts-hide { opacity: .65; }
  @media (max-width: 620px) { #tts-label, #tts-back { display: none; } }
</style>
<div id="tts-bar" role="region" aria-label="Article narration">
  <audio id="tts-audio" preload="metadata" src="${srcAttr}"></audio>
  <button id="tts-play" aria-label="Play narration">▶ Play</button>
  <button id="tts-back" aria-label="Back 15 seconds">−15s</button>
  <button id="tts-prev" aria-label="Previous paragraph">‹</button>
  <button id="tts-next" aria-label="Next paragraph">›</button>
  <input id="tts-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
  <span id="tts-time">0:00 / 0:00</span>
  <button id="tts-rate" aria-label="Playback speed">1.0×</button>
  <span id="tts-label" style="opacity:.6">narrated</span>
  <button id="tts-hide" aria-label="Hide player">✕</button>
</div>
<script>
(function () {
  var DATA = ${data};
  // A real element in the document rather than a detached Audio object: the browser
  // treats in-document media more predictably, and it stays inspectable when a page
  // misbehaves.
  var audio = document.getElementById("tts-audio");

  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-tts]"));
  var cues = DATA.cues.filter(function (c) { return c.index < nodes.length; });
  var bar = document.getElementById("tts-bar");
  var playBtn = document.getElementById("tts-play");
  var seek = document.getElementById("tts-seek");
  var timeEl = document.getElementById("tts-time");
  var rateBtn = document.getElementById("tts-rate");
  var current = -1;
  var scrubbing = false;

  // A metadata track built in JS rather than loaded from a .vtt file: browsers block
  // track loads on file:// pages, and this gives the same native cuechange events.
  var track = null;
  try {
    track = audio.addTextTrack("metadata");
    track.mode = "hidden";
    cues.forEach(function (c) { track.addCue(new VTTCue(c.start, c.end, String(c.index))); });
    track.addEventListener("cuechange", function () {
      var active = track.activeCues && track.activeCues[0];
      if (active) highlight(parseInt(active.text, 10), true);
    });
  } catch (e) { track = null; }

  function fmt(s) {
    if (!isFinite(s)) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function highlight(index, follow) {
    if (index === current) return;
    if (nodes[current]) nodes[current].classList.remove("tts-current");
    current = index;
    var node = nodes[index];
    if (!node) return;
    node.classList.add("tts-current");
    if (!follow) return;
    var box = node.getBoundingClientRect();
    var margin = 110;
    if (box.top < margin || box.bottom > window.innerHeight - margin) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function cueAt(t) {
    for (var i = cues.length - 1; i >= 0; i--) if (t >= cues[i].start) return cues[i].index;
    return 0;
  }

  audio.addEventListener("timeupdate", function () {
    if (!scrubbing) {
      var total = audio.duration || DATA.duration || 0;
      seek.value = total ? String(Math.round((audio.currentTime / total) * 1000)) : "0";
      timeEl.textContent = fmt(audio.currentTime) + " / " + fmt(total);
    }
    if (!track) highlight(cueAt(audio.currentTime), true);
  });
  audio.addEventListener("play", function () { playBtn.textContent = "❚❚ Pause"; });
  audio.addEventListener("pause", function () { playBtn.textContent = "▶ Play"; });
  audio.addEventListener("ended", function () { highlight(-1, false); });

  playBtn.onclick = function () {
    if (!audio.paused) { audio.pause(); return; }
    var started = audio.play();
    if (started && started.catch) {
      started.catch(function (err) {
        playBtn.textContent = "▶ Play";
        console.warn("[narration] playback blocked:", err && err.message);
      });
    }
  };
  document.getElementById("tts-back").onclick = function () { audio.currentTime = Math.max(0, audio.currentTime - 15); };
  document.getElementById("tts-prev").onclick = function () { jump(-1); };
  document.getElementById("tts-next").onclick = function () { jump(1); };
  document.getElementById("tts-hide").onclick = function () { audio.pause(); bar.remove(); };

  var RATES = [1, 1.25, 1.5, 1.75, 2, 0.75];
  var rateIndex = 0;
  rateBtn.onclick = function () {
    rateIndex = (rateIndex + 1) % RATES.length;
    audio.playbackRate = RATES[rateIndex];
    rateBtn.textContent = RATES[rateIndex].toFixed(2).replace(/0$/, "") + "×";
  };

  function jump(delta) {
    var target = Math.min(Math.max(cueAt(audio.currentTime) + delta, 0), cues.length - 1);
    var cue = cues.filter(function (c) { return c.index === target; })[0];
    if (cue) { audio.currentTime = cue.start + 0.01; highlight(target, true); }
  }

  seek.addEventListener("input", function () {
    scrubbing = true;
    var total = audio.duration || DATA.duration || 0;
    timeEl.textContent = fmt((seek.value / 1000) * total) + " / " + fmt(total);
  });
  seek.addEventListener("change", function () {
    var total = audio.duration || DATA.duration || 0;
    audio.currentTime = (seek.value / 1000) * total;
    scrubbing = false;
  });

  // Click any narrated paragraph to hear it read.
  nodes.forEach(function (node, i) {
    node.addEventListener("click", function (ev) {
      if (ev.target.closest("a, button, input, label, select")) return;
      var cue = cues.filter(function (c) { return c.index === i; })[0];
      if (!cue) return;
      audio.currentTime = cue.start + 0.01;
      highlight(i, false);
      if (audio.paused) audio.play();
    });
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.target.matches("input, textarea, select")) return;
    if (ev.code === "Space" && ev.shiftKey) { ev.preventDefault(); playBtn.click(); }
  });

  timeEl.textContent = "0:00 / " + fmt(DATA.duration || 0);
  window.__ttsPlayer = { audio: audio, cues: cues, nodes: nodes, highlight: highlight };
})();
</script>
${END}`;
}

/** Append the player, or replace the one a previous run left. Idempotent. */
export function inject(html, block) {
  const start = html.indexOf(BEGIN);
  if (start !== -1) {
    const end = html.indexOf(END, start);
    if (end !== -1) return html.slice(0, start) + block + html.slice(end + END.length);
  }
  const body = html.lastIndexOf("</body>");
  if (body !== -1) return html.slice(0, body) + block + "\n" + html.slice(body);
  return html + "\n" + block + "\n";
}
