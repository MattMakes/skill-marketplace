# Vendored tree-sitter grammars

These files are copies of third-party grammars. We own the copies; we do not track upstream.
Update them only together with the `web-tree-sitter` pin in `../package.json`, and run the
`src/__tests__/languages` tests after the update.

| File | Upstream npm package | Version | License | SHA-256 |
| --- | --- | --- | --- | --- |
| `tree-sitter-python.wasm` | `tree-sitter-python` | 0.25.0 | MIT, `LICENSE-tree-sitter-python` | `16108b50df4ee9a30168794252ab55e7c93bfc5765d7fa0aa3e335752c515f47` |
| `tree-sitter-rust.wasm` | `tree-sitter-rust` | 0.24.0 | MIT, `LICENSE-tree-sitter-rust` | `f65f354215611fd94ad34134b3427eb3d58cbb745df7b6509ba722184db73d57` |

Runtime: `web-tree-sitter` 0.27.1 (exact pin). The Python grammar uses ABI 15; the Rust grammar uses ABI 14.
