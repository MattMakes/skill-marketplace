---
name: pixel-art-pipeline
description: >-
  Make palette-locked pixel art for a Godot game, from image-model source art or from a
  drawing script. Each asset gets an exact cell size and a fixed palette, and a check script
  proves size, palette, frame grid, outline and unchanged old atlas cells. The skill also
  covers the contrast gate against every real background, UI mockups drawn by script,
  low-poly models built from a parts table, and hitboxes measured from the art. Use it
  whenever someone wants new sprites, animation strips, tiles, icons, atlas cells, glyphs, a
  logo cutout, a silhouette or a UI mockup in a fixed palette. Also use it when someone asks
  why a sprite does not read, why the art has off-palette or soft pixels, why old atlas cells
  changed, why Godot shows a stale texture, or how to hand 3D props from an art unit to a
  code unit. Use it even if nobody says "pixel art pipeline".
---

# Pixel Art Pipeline

Agents that make pixel art fail in 2 ways. Raw image-model output has too many colours, soft
edges and the wrong size. Art drawn in code from rings and blocks reads as programmer art and
fails review. This method keeps the image model for the shapes and gives the pixel rules to a
deterministic script: the script crops, resizes, keys out the background, snaps every pixel
to the palette and adds the outline. A check script then proves the asset contract, and a
human-scale look at native size proves that the art reads. The split works because each part
does the job it is good at, and a script result is the same on every run.

## When to use

- New sprites, strips, tiles, icons, glyphs or atlas cells must match a palette and a cell size.
- An existing atlas gets new cells, and the old cells must stay byte-identical.
- A logo or a sprite needs a clean transparent cutout or a 2-colour silhouette.
- A sprite, bullet or icon must read over every ground colour and UI panel.
- A UI design needs mockup images before any game code exists.
- An art unit hands low-poly models to a code unit, or hitboxes must match the drawn art.

## When not to use

- The game uses high-resolution or painted art with no palette rule.
- A human artist delivers final files. Use only the check script and the import steps.
- You must judge the art in the running game window. Hand that capture to `visual-verification`.

## Method

The steps assume an image model for the source art. With no image model, draw the source in
a script (see "Art drawn by script") and start at step 4.

1. **Read the art contract.** The contract is the manifest row (path, cell size, frame count,
   frame order, anchor, owner), the palette file, the outline rule and the art direction.
   Treat it as complete. Check: you can state the exact output size and frame count. If a UI
   spec and the manifest give different sizes, keep the manifest size and report the conflict.
2. **Write 1 prompt per asset or per frame.** Use a shared prefix: style, camera angle, flat
   key-colour background (for example magenta), silhouette rule. Generate 1 source per frame,
   not 1 sheet for all frames. Keep the same camera, ground line and silhouette in 1
   animation. Generate in small batches. A model does not keep cells aligned in a sheet.
3. **Map and copy each output at once.** Map each generated file to its request by its
   content, because the image tool does not keep the request order. Copy each file into a
   source folder in the project with a fixed name. The image tool writes to its own folder,
   and later files hide which output is which. Check: list the folder before the next step.
4. **Pixelize each source with a script.** The script crops, resizes to the exact cell size,
   keys out the background, snaps each pixel to the nearest palette colour and adds a
   1-pixel outline. Try 2 key thresholds on a hard source and compare them. Check: the output
   has the cell size and hard alpha.
5. **Look at the result.** View it at native size and at 4x to 8x with nearest-neighbour
   scale, next to existing art of the same kind. Hand-simplify cells with too many mid colours
   or a weak silhouette. Add 1-pixel details after the pixelize step, not before. Redraw any
   icon that does not read at native size. Automatic reduction to 16 px keeps too much
   detail, so small icons almost always need a hand pass.
6. **Assemble the strip or the atlas.** Join frames into a horizontal strip, or append cells
   to the atlas. Keep old cells at the same index. Paste the old bytes of each preserved cell.
   Do not alpha-composite over them, because a composite changes hidden pixels.
7. **Run the check script.** It tests exact size, every pixel with alpha above 0 in the
   palette, hard alpha, the frame grid and count against the manifest, a closed outline, and
   old cells byte-identical to the base copy. Get the base copy with
   `git show <base>:<atlas path>`. Tile a ground texture 3x3 and look for seams. Check:
   0 failed checks. `scripts/check_art.py` does all of this except the seam look.
8. **Update the manifest row.** Write the frame count, the size and the description. Validate
   the JSON. If a test asserts the atlas width or the cell count, change it with the owner's
   approval. Better, make the code and the test read the cell count from the manifest or the
   texture width, so the next append does not break them.
9. **Record the prompts and build a contact sheet.** The prompt record file holds each prompt,
   the source file name and any divergence. Build the contact sheet at 1x and 4x in a temp or
   review folder, never in the asset folder.
10. **Import twice.** Run the headless Godot import. Judge the second run: the first run can
    scan scripts before the new PNG files import, so preloads fail once. Delete stray preview
    PNG files and `.import` files that are not deliverables. A changed PNG needs an import, or
    Godot shows the stale texture.
11. **See it in the game.** Hand the in-game capture to `visual-verification`. It stages the
    state, captures at native size and compares before and after. Add a test that each new
    kind draws its own cell and that 2 old kinds keep theirs.

The checks of an art-only unit are palette, size, manifest and import. Leave the full test
suite to the unit that lands the work. An art unit that runs the full suite in a sandbox can
stop on failures that have nothing to do with the art.

## Cutouts and silhouettes from existing art

Use this when a logo or a sprite needs a transparent background or a flat teaser silhouette.

1. Get the original source file. If it is missing, report that you are blocked. Do not guess
   the design from a screenshot.
2. Run the image model in edit mode with the original as reference. Ask it to remove only
   the background and keep the design.
3. Check the alpha channel. If a glow or a box stays, run 1 more targeted extraction pass.
4. Remove the leftover near-background shades with a script. The model output keeps them.
   Rebuild a uniform 1-pixel ink outline. Keep a transparent margin.
5. For a silhouette, threshold to exactly 2 colours. Count the colours with a histogram.
   Expect 2.
6. Build previews over a checkerboard and over the real game background.

## Art drawn by script

Use this when no image model is in the loop, for a tiny cell, a glyph, a mockup or a logo
concept. Script art is acceptable for small, geometric cells. For characters and props,
prefer an image-model source, because review rejects finals drawn from simple shapes.

1. Read the palette, the art direction, the atlas layout and the colours of the old art.
2. Measure the target box in the scene and the on-screen height of peer sprites of the same
   class. A prop that is shorter than its neighbours does not show.
3. Write a Pillow script that draws from palette colours only. Give it a `--preview` option
   and a `--write` flag, so a dry run cannot overwrite the atlas.
4. Keep the script in a review folder that git tracks, so the art can be rebuilt. Do this
   also when the art source folder is ignored by git.
5. Preview at 4x to 8x with nearest-neighbour scale, at the real draw size and on each ground
   colour. Use fewer, bolder shapes until the art reads. Inner rings blur together at 16 px.
6. Run the checks: 0 off-palette pixels, old cells byte-identical, a 2x2 tile without seams.
7. Look for other users of the old file. If another screen reads it, add a new file.
8. Append manifest rows as text, so the other rows keep their format. Parse the manifest.
9. Re-import. Get an in-game capture through `visual-verification`. Run the palette check on
   its 1x image.

If the real art comes from another unit, build the screen with flat placeholders first. A
placeholder script makes 1 flat cell per manifest row at the right size. Merge the real art
later and capture again.

## Pixel fonts

A font import with antialiasing gives soft, off-palette text. In one case 1 line of text held
61 off-palette colours. Set antialiasing, hinting and subpixel positioning off in the font
import settings. Prove the cause with a test state that has antialiasing off. Check every
glyph that the text uses. A tiny bitmap font in a build script can lack glyphs, and the build
crashes on the first missing letter.

## Readability and contrast gate

Use this when a sprite, a bullet, an icon or a glyph must read at 1x over every background.

1. List every background colour where the sprite shows. Include the ground bands (lit, mid,
   shadow), each area tint and each UI panel.
2. Compute the WCAG contrast ratio of each fill and of the outline against each background,
   before you edit the art. `scripts/contrast_table.py` prints a PASS or FAIL table.
3. Count the fails. If no palette colour passes, send a question with the numbers per
   background. Do not edit first, because the fix is a rule decision, not an art decision.
4. Apply the approved rule. A rule that works: per background, the higher of fill contrast
   and outline contrast is at least 3:1, with a 1-pixel dark outline on all 4 sides.
5. Keep distinct shapes when 2 kinds share a fill colour.
6. Redraw the failing cells, or snap the off-palette pixels to the nearest palette colour.
   Diff the old and new sheets. Confirm that only the target cells changed.
7. Run the table again. Expect 0 fails.
8. Build previews of the key frames (idle, attack, exposed pose) over each background at 1x
   and 4x. Confirm that each key pose differs at 1x. For the in-game check at 1x and 2x, use
   `visual-verification`. It owns the window captures and the before and after comparison.
9. Record both contrast numbers per background in the notes.

A palette rule can also keep enemy colours out of the colour range of the ground and the props.
Without it, an enemy hides in the scenery.

## UI mockups by script

Use this when a feature design or a UI spec needs mockups before any game code exists.

1. Read the art direction, the palette and real screenshots of the current build.
2. Compute the contrast ratio of each text and focus colour pair.
3. Test the pixel font in Pillow at its cell sizes.
4. Write a mockup script that draws each screen at native resolution. Reuse the palette and
   the drawing helpers of an existing mockup script.
5. Generate the mockups and look at each one.
6. Review the design with a UI rubric. Add the fixes to the spec. A review can also find
   design faults, such as a reward that repeats for free.
7. Snap every dim and every blend to the nearest palette colour. A 60 % dim makes new colours.
   Check each PNG for off-palette pixels.

If an accent focus ring has low contrast on its panel (for example 1.6:1), let a dark ink
ring carry the 3:1 contrast and keep the accent inside it.

## Low-poly models from a parts table

Use this when an art unit hands low-poly 3D vehicles or props to a code unit as atlas cells
plus a parts table.

1. The art unit writes 1 parts table per model. It states the units (metres) and, per part,
   the name, shape, size, position, rotation and atlas cell. It also lists the moving parts.
2. The model unit treats each row as a contract.
3. Write a failing contract test for the first model. It checks the named mesh, size,
   position, rotation and atlas cell of each part.
4. Write a shared base class that builds meshes from a table. Write the first model script.
   Make the test pass.
5. Add 1 contract test and 1 model per remaining table. Each model script adds only its own
   animation.
6. Agree the public API (node name, attach function, pose or animate call) with the units
   that use the model, before they write code against it.
7. Add animation and the reduced-motion behaviour. Test the public API.
8. Add each new material to the shader warm-up list and run its guard test.
9. Get captures on each renderer that the game ships through `visual-verification`. Compare
   them with the concept sheet.

When a face shows the wrong art, check the face-to-cell mapping first. In one case every face
used an empty cell and the art was correct.

## Hitboxes from the art

Use this when collision sizes must match the drawn sprites or models.

1. Find where the game reads the hitbox value. It is often a data row, not the scene.
2. Measure the drawn body of each model with a script: from the parts table for a model, or
   from the opaque pixel bounds for a sprite.
3. Write the values into the data source. Re-export the game data.
4. Update the tests that assert the old numbers in the same commit. Expect several.
5. Get a capture with the collision shapes visible through `visual-verification`.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Review rejects the finals as programmer art. | The worker drew finals by script from simple shapes. | Keep the generated sources. Run every crop through the pixelize script. |
| A frame shows the wrong pose or asset. | Generated file names do not keep the request order. | Map each file by its content. Copy each output at once with a fixed name. |
| A small icon has many mid colours. | Automatic reduction to 16 px keeps too much detail. | Hand-simplify to match the existing strip. |
| A prompt for a small decal returns a whole vehicle. | A batch prompt has a weak silhouette rule. | Regenerate only that frame with a stricter silhouette rule. |
| A preview PNG shows up in the game files. | The preview sat next to the asset and got its own `.import` file. | Write previews to a temp or review folder. Delete strays before the final check. |
| Preloads fail on the first import. | The import scanned scripts before the new PNG files imported. | Run the import a second time. Judge the second run. |
| Godot shows the old texture. | The changed PNG did not import. | Run the headless import. |
| Old atlas cells changed. | An alpha composite changed hidden pixels. | Paste the old bytes. Compare with the base copy cell by cell. |
| The palette check finds 1 bright colour everywhere. | The strip canvas used the opaque key colour, not transparency. | Remove the key in the assembly. Keep the palette check in the loop. |
| A code path shows only some cells of an atlas. | The code sliced the atlas by a fixed cell count. | Read the cell count from data or the texture width. Test it. |
| A test fails on the atlas width after an append. | The test pinned the old cell count. | Ask the owner for that 1 edit. Better, read the count from data. |
| The plan names a check tool that does not exist. | The plan assumed a tool from another project. | Write a small check script in the review folder, modelled on an earlier checker. |
| Text has soft, off-palette pixels. | The font imported with antialiasing. | Set antialiasing, hinting and subpixel positioning off. |
| A UI spec and the manifest give different sizes. | 2 documents own the same fact. | Keep the manifest size. Apply the spec shape and contrast inside it. Report the conflict. |
| An art-only unit reports blocked on test failures. | It ran the full suite in a sandbox. | Run palette, size, manifest and import checks only. |
| Art files appear outside the game folder. | The art script resolved the repository or worktree root. | Check the resolved root before any write. |
| A shell loop breaks "name path" pairs wrongly. | zsh does not split an unquoted variable into words. | Use arrays, or `${=var}` in zsh. |
| The manifest check fails on valid data. | The check read the wrong JSON root. | Fix the check, not the data. |
| An older asset has colours outside the palette. | The asset predates the palette rule. | Snap to the nearest palette colour. Or add the colour to the palette with approval. |
| A billboard sprite ignores its node scale. | The shader builds the quad from its own size. | Resize the quad, not the node. |
| One atlas cell looks cropped and stretched. | The cell art crosses the cell window. | Redraw that cell only. Add a pixel-boundary test that fails on the old cell. |
| A cutout keeps a dark glow or box. | The edit pass left near-background shades. | Run 1 extraction pass. Remove the rest of the shades with a script. |
| A silhouette has grey tones. | The model output antialiases edges. | Threshold to 2 colours. Check with a histogram. |
| A thin icon reads as a dark ring or the wrong tool. | Shapes are too fine for the cell. | Use fewer, bolder shapes. Give a blade a constant-width body and clear tips. |
| A mid-tone icon vanishes over the ground. | Its fill is close to the ground and it has no outline. | Use a lighter fill with palette highlights. Keep the shape and cell index. |
| Plan example colours fail the contrast gate. | Nobody measured them against each background. | Measure first. Then ask for a rule with the numbers. |
| Regular bright stripes read as gold lines in play. | A repeating highlight forms a pattern at speed. | Put bright stripes on the lit side only. |
| A dark hole shows between thin stems. | No backing fills the gaps. | Add a dense backing behind the stems. |
| A prop reads as a flat slab or does not show. | The shape is weak or shorter than its neighbours. | Give it a solid body and clear masses. Match the height of the related prop. |
| A sprite stands off its seam or ground line. | The offset has the wrong sign. | Test the other sign in a capture. |
| `python3 -I` cannot import Pillow. | Isolated mode skips the user site packages. | Use `python3 -P` from a separate folder, or a venv in a temp folder. |
| Pillow warns that `getdata` is deprecated. | The Pillow version is new. | Use `get_flattened_data`. |
| A colour shows only as 1 small shade pixel. | The palette snap kept a rare colour. | Accept it if it is in the palette. Record it in the notes. |
| A model face uses an empty atlas cell. | The face-to-cell mapping is wrong. | Fix the mapping. The art is often correct. |
| A tool script fails on class names. | The tool compiled before autoloads registered. | Remove static project-class references. Load them at run time. |
| Tests fail after a hitbox change. | The tests pinned the old numbers. | Update them in the same commit. |
| Large concept images bloat the repository. | Sources went into git. | Keep large concepts in an ignored source folder. Track the prompts and scripts. |
| A shared manifest conflicts on merge. | 2 units appended rows. | Keep both sides. Check for duplicate paths. |

## Artifacts to build

- **Palette file**: 1 hex colour per line. It is the single source for every check and script.
- **Art manifest**: JSON with 1 row per file: path, cell size, frame count, frame order,
  anchor, owner, description. Code and tests read cell counts from it.
- **Pixelize script**: source image in, exact-size palette-locked cell out. Options for the
  size, the key colour, the key threshold, the outline colour, the anchor and a preview.
- **Prompt record**: 1 Markdown file per asset group, with the shared prefix, each prompt,
  the source file name and the divergences.
- **Check script**: size, palette, hard alpha, grid, outline and preserved cells, with PASS or
  FAIL lines and a non-zero exit. `scripts/check_art.py` is a standard-library version.
- **Contact sheet script**: new art at 1x and 4x next to existing art of the same kind, with
  3x3 tiles for ground textures. It writes to a temp or review folder.
- **Contrast table**: fills and outline against each background, with a PASS or FAIL per row.
  `scripts/contrast_table.py` is a standard-library version.
- **Placeholder script**: 1 flat cell per manifest row, so code can land before the art.
- **Cutout script**: removes near-background shades, rebuilds the outline, makes previews.
- **Parts table**: per model, the units, and per part the shape, size, position, rotation and
  atlas cell, plus the moving parts. A contract test reads it.
- **Hitbox measure script**: reads the parts table or the opaque bounds and prints the sizes.

## Scripts

Both scripts use the standard library only. Run them with `python3 -I`.

- `scripts/check_art.py --palette palette.hex atlas.png --cell 16x16 --frames 12 --hard-alpha
  --outline 222034 --base /tmp/atlas_base.png --keep-cells 8` checks an atlas after an append.
  Make the base copy with `git show <base>:<atlas path> > /tmp/atlas_base.png`.
- `scripts/contrast_table.py --fill 6abe30 --outline 222034 --bg lit=99e550 --bg panel=eec39a`
  prints the contrast table. The default minimum is 3:1.

## Related skills

- `visual-verification`: owns the rendered in-game review: window captures at native 1x
  size, before and after pairs and pixel measures. This skill owns the source assets and their
  checks (size, palette, grid, outline, preserved cells, contrast against background colours).
- `headless-godot-runs`: the import flags, the `.import` hygiene and tool scripts that must
  not name project classes.
- `godot-testing`: the tests that each kind draws its own cell and the cell-boundary tests.
- `godot-perf`: the shader warm-up list for new materials, batching and the pixel-art camera.
- `balance-model-data`: when hitbox values live in a data model, re-export through it.
- `fleet-game-dev`: the contract-first split when an art unit and a code unit work in parallel.
