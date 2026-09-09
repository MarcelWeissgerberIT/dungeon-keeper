# Asset provenance

## Graphics

- `public/art/basalt.webp`: newly generated original basalt paving texture. Used as albedo and bump detail for procedural stone geometry and HUD materials. Generated with built-in Imagegen, then resized and WebP-encoded. Tiling edges are not certified seamless.
- `public/art/room-atlas.webp`: newly generated original 3×2 equipment atlas: treasure chest, resting alcove, mushrooms, training dummy, rune lectern, furnace/anvil. Built-in Imagegen; WebP conversion. These are functional room-tool illustrations.
- `public/art/sanctuary.webp`: original underground amber-obelisk artwork, built-in Imagegen; resized and WebP-encoded. Retained as optional expedition artwork; the immersive HUD does not display a website hero panel.
- 3D terrain, structures and creatures: original procedural geometry authored in `app/scene.ts`. No imported commercial game models.
- Functional icons: Lucide via `lucide-react`, under its ISC license.
- Favicon: original geometric ember symbol.

## OpenArt request

`https://mcp.openart.ai/mcp` was tried on 2026-09-09. An unauthenticated initialize request required OAuth; an authenticated request was rejected by the service firewall (HTTP 403, browser signature denied). No generated output was returned. The limitation was communicated, and Imagegen was used as the available fallback. No credentials are included in the repository.

## Audio

All music, ambience, effects and creature voices are synthesized by original code in `app/audio.ts` using Web Audio. The evolving tonal sequence, reverberation impulse, brown-noise ambience, pitched effects and formant-based creature voices use no external samples, copyrighted soundtrack or recorded speech. Music and effects have independent gain buses and mute switches. Creature voices go through the effects bus.

## Typography

The original Kluftkrone Inscribed font is used only for display labels and headings. Body text uses local system fonts for readability. The font source and authorship record are included alongside the font assets.
