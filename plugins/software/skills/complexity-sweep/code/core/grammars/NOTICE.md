# Vendored tree-sitter grammars

These files are copies of third-party grammars. We own the copies; we do not track upstream.
Update them only together with the `web-tree-sitter` pin in `../package.json`, and run the
`src/__tests__/languages` tests after the update.

| File | Upstream npm package | Version | License | SHA-256 |
| --- | --- | --- | --- | --- |
| `tree-sitter-python.wasm` | `tree-sitter-python` | 0.25.0 | MIT, `LICENSE-tree-sitter-python` | `16108b50df4ee9a30168794252ab55e7c93bfc5765d7fa0aa3e335752c515f47` |
| `tree-sitter-rust.wasm` | `tree-sitter-rust` | 0.24.0 | MIT, `LICENSE-tree-sitter-rust` | `f65f354215611fd94ad34134b3427eb3d58cbb745df7b6509ba722184db73d57` |
| `tree-sitter-gdscript.wasm` | `tree-sitter-gdscript` (built from source, see below) | git commit `f337a5f4deec29c9ed56cfc022d8d9a6e1bcd467` | MIT, `LICENSE-tree-sitter-gdscript` | `37065838db4c60e565e8b3181cbbccc0dd5d94cdc2f6ddcedcb6bb53f295d2d3` |

Runtime: `web-tree-sitter` 0.27.1 (exact pin). The Python grammar uses ABI 15; the Rust and GDScript
grammars use ABI 14.

GDScript: no release of https://github.com/PrestonKnopp/tree-sitter-gdscript ships a `.wasm` file
(npm 6.1.0 has none). The file above is a build of commit `f337a5f` (2026-10-09, 30 commits after
v6.1.0; it fixes a column-0 comment defect of v6.1.0 and parses Godot 4 syntax only). Build:
`tree-sitter build --wasm` with `tree-sitter-cli` 0.27.1, wasi-sdk 34.0 and binaryen 132
(`TREE_SITTER_WASI_SDK_PATH`, `TREE_SITTER_BINARYEN_PATH`). The build is deterministic. To rebuild,
clone the repository at the commit and run the same command in its root.
