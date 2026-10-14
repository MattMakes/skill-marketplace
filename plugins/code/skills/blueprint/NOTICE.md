# Blueprint provenance

Blueprint is a renamed, bundled derivative of **archify 2.17.0-dev.1** by
tt-a1i, itself based on Cocoon AI's architecture-diagram-generator. The upstream
renderer is MIT licensed; see [LICENSE](LICENSE).

Source: https://github.com/tt-a1i/archify

The visual update compared upstream commit
`c1443b31b496eebf4a68bf83151816c955ddb796` and carries its embedded font block
and matching SVG/raster export font handling. Other local renderer and viewer
behavior is retained; this is not a full upstream synchronization.

JetBrains Mono, copyright 2020 The JetBrains Mono Project Authors, is licensed
under the SIL Open Font License 1.1. The complete notice, license, subset hashes,
and unmodified WOFF2 data are embedded in `assets/template.html` and preserved
in generated HTML and exported SVGs. The font license applies to those font
bytes rather than changing the renderer's MIT license.
