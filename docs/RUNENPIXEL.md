# Kluftkrone Runenpixel

An original compact pixel interface/display typeface designed for Kluftkrone on
9 September 2026. The family name is **Kluftkrone Runenpixel**, style **Regular**.

## Original design source

[scripts/build_runenpixel.py](../scripts/build_runenpixel.py) contains the newly hand-written 0/1 rows for every basic
capital, lowercase letter, digit, punctuation mark and HUD symbol. Each `1`
becomes a solid 100 × 100 unit cell. Adjacent cells are compiled into rectangular
outline runs; the compiler never smooths them into curves. Accented Latin
letters combine these original base drawings with original pixel marks.

No other font or glyph table was imported, adapted or traced. The existing
Kluftkrone Inscribed outlines were not used. FontTools builds TrueType/OpenType
tables, Brotli compresses the WOFF2, and Pillow renders the generated TTF for
verification; none provides the character drawings.

The design uses angular bowls, clipped corners and restrained diagonal cuts.
Most letters are five pixels wide; M/W are seven pixels wide. Actual lowercase
letters use a nine-row body; ascenders and capitals use eleven rows. Compact
five-pixel lowercase m/w preserve room-button legibility. The zero has an
interior diagonal; capital O does not. Capital I has a top/bottom bar, digit 1
has an angled entry, and lowercase l has a distinct turned foot.

## Delivered files

- [KluftkroneRunenpixel-Regular.woff2](../public/fonts/KluftkroneRunenpixel-Regular.woff2) — browser font.
- [KluftkroneRunenpixel-Regular.ttf](../public/fonts/KluftkroneRunenpixel-Regular.ttf) — installable TrueType font.
- [scripts/build_runenpixel.py](../scripts/build_runenpixel.py) — complete original raster definitions and generator.
- [requirements-runenpixel.txt](../scripts/requirements-runenpixel.txt) — exact build dependency versions.
- [runenpixel-specimen.png](fonts/runenpixel-specimen.png) — proof rendered from the delivered TTF.
- [runenpixel-specimen.svg](fonts/runenpixel-specimen.svg) — self-contained SVG with the original WOFF2 embedded.
- [runenpixel-glyphs.json](fonts/runenpixel-glyphs.json) — machine-readable original filled cells and advance widths.
- [runenpixel-validation.json](fonts/runenpixel-validation.json) — glyph count, metrics, width checks, file sizes and hashes.
- [app/rune-hud.css](../app/rune-hud.css) — active game integration.
- [RUNENPIXEL-LICENSE.md](fonts/RUNENPIXEL-LICENSE.md) — CC0 dedication/design provenance.

## Metrics and sizing

- Units per em: **1400**; one raster cell: **100** units.
- Cap height: **1100**; x-height: **900**; descenders: **200**.
- Typographic ascender: **1400**; descender: **−200**; line gap: **0**.
- At **14 px**, each cell is exactly one CSS pixel; at **28 px**, exactly two.
- Preferred sizes: 14 px menus/buttons, 28 px headings. 16/24 px remain usable
  with antialiasing. Passive 12 px metadata is deliberately smaller; uppercase
  works best there. Use roughly `line-height: 1.2`.
- Avoid letter-spacing, synthetic bold, noninteger container transforms and
  scaled ancestors when exact pixel alignment matters. A browser/device may
  still antialias according to its text rasterizer and device pixel ratio.
- Proportional spacing is the default. `font-variant-numeric: tabular-nums`
  selects six-cell numeral advances through the OpenType `tnum` feature.
- A small `kern` feature exists for conventional display pairs. UI text can
  use `font-kerning: none` for strictly predictable integral advances.

`Schatzkammer` and `Sammelbanner` each occupy **69 px at 14 px** or **78.86 px
at 16 px**, before any CSS letter-spacing. Both fit a 90 px room slot with
approximately 5 px side padding even at 16 px. `Runenarchiv` occupies 63/72 px.

## Character coverage

223 glyphs and 212 Unicode mappings: printable ASCII; A–Z and true a–z; digits;
Ä Ö Ü ä ö ü ß ẞ; common additional accented Latin letters; curly German/English
quotes, guillemets, en/em dashes and ellipsis; currencies; directional arrows;
plus/minus/multiply/divide/comparison signs; check marks and basic HUD symbols.
These are deliberately drawn icons, not emoji or OS-dependent symbol fallbacks.

This is a single weight. It does not implement arbitrary combining-mark layout
or scripts beyond this explicit character set. German/English UI strings and
the supported precomposed Latin characters are covered.

## Rebuild and verification

```sh
python3 -m venv /tmp/kluftkrone-font-build
/tmp/kluftkrone-font-build/bin/python -m pip install -r scripts/requirements-runenpixel.txt
/tmp/kluftkrone-font-build/bin/python scripts/build_runenpixel.py --out /tmp/kluftkrone-font-output
```

The generator writes beside itself by default; `--out DIRECTORY` chooses a
separate output directory. Creation and modification timestamps are fixed to
2026-09-09 12:00 UTC. Two builds using the pinned dependencies produce identical
TTF/WOFF2 binaries. Reopening both final formats verifies required coverage,
UPEM and that all outline coordinates remain on the original 100-unit lattice.
The PNG is rendered from the final TTF and was visually inspected at the stated
UI sizes, including 90 px room-slot samples and confusable-character pairs.

The exact dependency versions describe the reproducibility environment; they
are not an instruction to freeze unrelated project dependencies.

## Permission

Original work for the user, dedicated under CC0 1.0 Universal to the extent
rights apply. See [RUNENPIXEL-LICENSE.md](fonts/RUNENPIXEL-LICENSE.md). No attribution or reserved font names.
