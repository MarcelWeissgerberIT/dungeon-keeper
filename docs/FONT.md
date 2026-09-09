# Kluftkrone Inscribed

The active game font is now [Kluftkrone Runenpixel](RUNENPIXEL.md), newly drawn
from a pixel grid. This document records the earlier original display face.

An original display typeface created for Kluftkrone on 9 September 2026.

The alphabet was designed specifically for this project in `scripts/build_kluftkrone.py`.
Every glyph is drawn from the explicit geometric centerlines and polygonal pen
defined in that source. No font file, commercial typeface outline, downloaded
glyph, image tracing, or external typeface source was used as design input.
FontTools compiles the original outlines; skia-pathops unites overlapping
strokes. Neither library supplies the glyph designs.

The design uses 700-unit capitals, faceted bowls, angular shoulder serifs and a
restrained geometric skeleton. Lowercase Unicode characters produce smaller
capital forms. Ä, Ö, Ü, ẞ, ä, ö, ü and ß are included, alongside A–Z, digits and
basic punctuation. It is a display face for titles, room names and banners;
use a standard readable interface font for body text and small controls.

## Files

- `KluftkroneInscribed-Regular.ttf` — installable TrueType font.
- `KluftkroneInscribed-Regular.woff2` — compressed browser font, about 5 KB.
- `scripts/build_kluftkrone.py` — original, reproducible outline and build source.
- `kluftkrone-specimen.png` — rendered proof of the generated TrueType font.
- `font-face.css` — minimal browser integration example.

## Rebuild

Requires Python 3 and `fonttools`, `brotli`, `skia-pathops`, plus optional
`pillow` for the specimen. Run `python scripts/build_kluftkrone.py` from the repository root.
The generated font records a fixed 2026-09-09 creation/modification timestamp.

Example isolated setup:

```sh
python3 -m venv .venv
.venv/bin/pip install fonttools brotli skia-pathops pillow
.venv/bin/python build_kluftkrone.py
```

## Authorship and permission

Created by Codex for the user's original Kluftkrone project. To the extent any
copyright or related rights apply to these new outlines and this source, they
are dedicated to the public domain under CC0 1.0 Universal. The user may use,
modify, embed and redistribute them, including commercially. There are no
reserved font names or attribution requirements. Third-party build libraries
retain their own licenses and are not embedded as source in the font.

## Verification

Both delivered font files were reopened with FontTools. Required character
coverage was verified for A–Z, a–z, 0–9 and the eight German characters above.
The specimen was rendered from the delivered TTF and visually inspected for
legibility and outline integrity. The font contains 90 glyphs and 91 Unicode
mappings. It is intentionally a small display family with one regular style.
