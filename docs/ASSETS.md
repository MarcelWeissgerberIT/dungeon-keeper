# Asset provenance

## OpenArt visual set — 2026-09-09

Twelve original images were generated through `https://mcp.openart.ai/mcp` using the authenticated native MCP client and the `gpt-image-2-5-sunburst` text-to-image model. The original game's screenshots were studied for composition, camera framing, material density and HUD proportions; they were not uploaded as generation references or copied into this repository.

Generation IDs, model settings and exact prompts are in [openart-generations.json](openart-generations.json). An earlier working title appears inside some stored prompts; the final game is **Kluftkrone** and the images contain no title text. Credentials, account records and expiring download URLs are not included.

Runtime graphics live in `public/art/openart/`:

| File | Contents / use |
| --- | --- |
| `floor.webp` | Worn small-stone corridor and room paving, tinted by room function |
| `wall.webp` | Chipped masonry courses with dark mortar |
| `earth.webp` | Layered earth, roots and rock |
| `gold.webp` | Mineral gold seams |
| `water.webp` | Subterranean water surface, animated texture coordinates |
| `hud-stone.webp` | Continuous carved basalt and aged copper command panel |
| `creatures.webp` | 5×4 atlas: delver, warden, scholar, colossus, invader; four directional views |
| `room-atlas.webp` | 3×2 atlas: treasury, rest, food, training, library, forge furnishings |
| `monuments.webp` | 4×1 atlas: mineral furnace, fissure portal, gate, snare |
| `powers.webp` | 3×2 atlas: summon, healing, lightning, rally, snare, gate icons |
| `hand-open.png`, `hand-grab.png` | Two cursor states cut from the generated gauntlet sheet |
| `sanctuary.webp` | Original chamber illustration used behind game dialogs |

Generated black extraction mattes are converted conservatively to transparency. Sprites are packed into square cells with preserved aspect ratio and a common foot baseline. Runtime files are resized and WebP-encoded; cursors use PNG. Creature movement combines directional views, bobbing and swaying; the sheets contain directional poses, not a full hand-animated walk cycle. Terrain remains original 3D geometry with albedo/bump textures, lighting and contact shadows. Flat decorative sprites face the camera; they are not volumetric 3D models.

The original Kluftkrone font and geometric ember favicon remain independently authored. Small functional interface symbols use Lucide under its ISC license. No commercial game artwork, models, maps or UI graphics are shipped. The earlier built-in Imagegen fallback graphics are removed from this release.

## Audio

All music, ambience, effects and creature voices are synthesized by original code in `app/audio.ts` using Web Audio. The evolving tonal sequence, reverberation impulse, brown-noise ambience, pitched effects and formant-based creature voices use no external samples, copyrighted soundtrack or recorded speech. Music and effects have independent gain buses and mute switches. Creature voices go through the effects bus.

## Typography

The original Kluftkrone Inscribed font is used for display labels and headings. Body text uses local system fonts for readability. The font source and authorship record are included alongside the font assets.
