# NOTICE

KEYS is adapted from DOX (https://github.com/agent0ai/dox), the AGENTS.md
framework by Agent Zero, used under the MIT License.

Changes from DOX:

- Renamed the framework from DOX to KEYS in every term.
- Made AGENTS.md the only agent instruction file: no CLAUDE.md, no symlinks, no other agent rule files.
- Wrapped the framework rules in `<!-- KEYS:begin -->` / `<!-- KEYS:end -->` markers so re-installs upgrade them in place.
- Added explicit Child KEYS Index rules (direct children only, one line per entry, `- None` for a leaf).
- Added a fold workflow that moves CLAUDE.md and other agent-instruction files into the owning AGENTS.md, plus a `keys.py` scan/install/check script.

## DOX license

```
MIT License

Copyright (c) 2026 Agent Zero

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
