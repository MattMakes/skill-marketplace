# Third-party notices

The `ddd` plugin installs nothing: it has no npm dependencies and no build
step. Two pieces of third-party work are carried inside it and are attributed
here. Nothing else in the plugin is third-party code.

1. `shared/vendor/elkjs/elk.bundled.js`, a vendored single-file copy of the
   Eclipse Layout Kernel's JavaScript build (EPL-2.0), used for diagram layout.
2. The SVG toolkit under `shared/lib/render/core/`, a small, rewritten slice of
   techniques taken from Archify (MIT).

## elkjs (Eclipse Layout Kernel for JavaScript)

- Project: elkjs, by Ulf Rueegg and the Eclipse Layout Kernel contributors,
  https://github.com/kieler/elkjs
- Version: 0.12.0, fetched 2026-09-01 from
  https://registry.npmjs.org/elkjs/-/elkjs-0.12.0.tgz (npm pack, verified
  against the registry's dist.integrity)
- Licence: the package is offered under "EPL-2.0 OR GPL-3.0-or-later"; this
  plugin elects the Eclipse Public License 2.0. The full licence text is in
  `shared/vendor/elkjs/LICENSE` (the package's LICENSE.md, unchanged).
- Vendored files, all under `shared/vendor/elkjs/`:

| File | What it is |
|---|---|
| `elk.bundled.js` | `lib/elk.bundled.js` from the tarball, unmodified; sha256 `1222e44f953ce7746af23801e723708f8e6f436b8b377a6a5fc7552f34a307b3` |
| `LICENSE` | the package's `LICENSE.md`, unmodified (EPL-2.0 text) |
| `VERSION` | version, source URL, sha256 and the licence election |
| `package.json` | a `{"type": "commonjs"}` scope marker so Node loads the UMD bundle under the plugin's `"type": "module"`; declares no dependencies |

- How it is used: `shared/lib/render/core/layout.mjs` loads the bundle with
  `createRequire` and runs the layered algorithm in-process (no worker, no
  network). ELK itself is not modified. When the file cannot load, layout.mjs
  falls back to its own grid placement with a warning.
- Source availability: the corresponding source is at the repository above,
  tag v0.12.0.

## Archify (vendored and renamed "blueprint")

The diagram renderer shipped as the `blueprint` skill inside this plugin
(`skills/blueprint/`) and the render-core techniques below are taken from the
Archify project. Every user-facing name in this plugin says blueprint; the
upstream project is and remains called Archify, and this notice keeps its name.

- Project: Archify, by tt-a1i, version 2.17.0-dev.1 (the copy installed as a
  Claude Code skill at the time of porting, 2026-09-01)
- Licence: MIT (text below)
- Based on: Cocoon-AI/architecture-diagram-generator v1.0, also MIT
- What was taken: the grid placement math, box and boundary geometry, single
  line text fitting, the wide-glyph width table, the rectangle overlap and
  segment-rectangle intersection tests, port-side selection and port spreading,
  the orthogonal route candidates, the legend layout pattern, and Chrome
  discovery plus headless arguments.
- What was left behind: the viewer template, workflow compiler, brand marks,
  i18n, story mode, share cards, diagnostics engine and update checker.

Every file that derives from Archify carries a header of the form
`// derived from archify: <source path> (MIT)`, one line per source. The
current set:

| File in `shared/lib/render/core/` | Archify source path(s) |
|---|---|
| `svg.mjs` | `renderers/shared/utils.mjs`, `renderers/shared/i18n.mjs` |
| `textfit.mjs` | `renderers/shared/text-fit.mjs`, `renderers/shared/utils.mjs` |
| `grid.mjs` | `renderers/architecture/grid.mjs`, `renderers/shared/layout-report.mjs`, `renderers/architecture/render-architecture.mjs` |
| `route.mjs` | `renderers/shared/geometry.mjs`, `renderers/architecture/render-architecture.mjs` |
| `legend.mjs` | `renderers/shared/legend.mjs` |
| `chrome.mjs` | `bin/visual-check.mjs` |

`runtime.js` is written from scratch for this plugin and derives from nothing.

### MIT License

```
MIT License

Copyright (c) 2026 tt-a1i (Archify)
Copyright (c) 2025 Cocoon AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Brand marks shipped with the blueprint skill

The blueprint skill (`skills/blueprint/`) vendors `renderers/shared/generated-brand-marks.mjs` and
`brand-marks/catalog.json` from Archify. Their provenance, copied from Archify's own notices:

## Simple Icons

Most of the built-in vector paths and their metadata were generated from
[Simple Icons 16.28.0](https://github.com/simple-icons/simple-icons/tree/16.28.0).
Simple Icons makes its collection work available under
[CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/16.28.0/LICENSE.md).

As Simple Icons explains in its
[disclaimer](https://github.com/simple-icons/simple-icons/blob/16.28.0/DISCLAIMER.md),
CC0 for the collection does not mean that every underlying icon is CC0. License
and brand-guideline metadata may be incomplete or change over time. The absence
of an individual license entry is not a grant of permission.

blueprint (vendored Archify) embeds the selected icons as vector-path data and may render them in a
user-selected color. The following individual licenses were recorded in the
pinned Simple Icons 16.28.0 metadata:

| Mark | Recorded source | Recorded license | blueprint (vendored Archify) treatment |
|---|---|---|---|
| Angular | [Angular press kit](https://angular.dev/press-kit) | [`CC-BY-4.0`](https://creativecommons.org/licenses/by/4.0/) | Embedded as vector-path data; color may be changed by the authored diagram. |
| Apache Airflow | [Apache logos](https://apache.org/logos) | [`Apache-2.0`](https://www.apache.org/licenses/LICENSE-2.0) | Embedded as vector-path data; Apache trademarks remain subject to the [ASF trademark policy](https://www.apache.org/foundation/marks/). |
| Apache Kafka | [Apache logos](https://apache.org/logos) | [`Apache-2.0`](https://www.apache.org/licenses/LICENSE-2.0) | Embedded as vector-path data; Apache trademarks remain subject to the [ASF trademark policy](https://www.apache.org/foundation/marks/). |
| .NET | [.NET brand repository](https://github.com/dotnet/brand/blob/c7d0f51b8ec59531332d05fb27a5b758a7a3d689/logo/dotnet-logo.svg) | [`CC0-1.0`](https://creativecommons.org/publicdomain/zero/1.0/) | Embedded as vector-path data; color may be changed by the authored diagram. |
| JavaScript | [JS community logo](https://github.com/voodootikigod/logo.js/blob/1544bdeed6d618a6cfe4f0650d04ab8d9cfa76d9/js.svg) | [`MIT`](https://github.com/voodootikigod/logo.js/blob/1544bdeed6d618a6cfe4f0650d04ab8d9cfa76d9/LICENSE) | Embedded as vector-path data; color may be changed by the authored diagram. |
| Jenkins | [Jenkins artwork source](https://get.jenkins.io/art/) | [`CC-BY-SA-3.0`](https://creativecommons.org/licenses/by-sa/3.0/) | Embedded as vector-path data; color may be changed by the authored diagram. Jenkins retains its trademark rights. |
| Rust | [Rust project](https://www.rust-lang.org) | [`CC-BY-SA-4.0`](https://creativecommons.org/licenses/by-sa/4.0/) | Embedded as vector-path data; color may be changed by the authored diagram. See the [Rust media guide](https://www.rust-lang.org/policies/media-guide). |
| Vue.js | [Vue logo source](https://github.com/vuejs/art/blob/a1c78b74569b70a25300925b4eacfefcc143b8f6/logo.svg) | [`CC-BY-NC-SA-4.0`](https://creativecommons.org/licenses/by-nc-sa/4.0/) | Embedded as vector-path data; color may be changed by the authored diagram. The non-commercial and share-alike conditions remain applicable; see the [Vue artwork terms](https://github.com/vuejs/art/blob/a1c78b74569b70a25300925b4eacfefcc143b8f6/README.md). |

The source, guideline, and known license fields for every packaged mark are
preserved in `renderers/shared/generated-brand-marks.mjs`.

## OpenAI mark

The OpenAI vector path is recorded from the
[OpenAI brand guidelines](https://openai.com/brand/), not from Simple Icons.
Use remains subject to those current guidelines and any applicable trademark
rights. Its inclusion does not state or imply endorsement by OpenAI.

## No additional rights granted

Brand names, logos, and trademarks remain the property of their respective
owners. This notice records provenance and known terms; it does not grant rights
that blueprint (vendored Archify) does not hold, and it does not state that every packaged mark has
been cleared for every commercial, promotional, or redistributive use.

