# Validation record

Validated on 2026-09-09 using Node.js 24.

- 22 automated tests pass: room costs and rejected actions, reachable gold excavation/hauling/claiming, inaccessible mining, worker independence from rally orders, save/load at fractional positions, feeding and rest, traps during combat, combat needs and leveling, walls blocking ranged damage, recruitment/research/payroll, malformed saves, terminal outcomes, and full expeditions on relaxed/normal/hard using regular player commands.
- All three complete expeditions include a midgame save/load and end with victory using normal resources and powers.
- Independent music/effects gain and mute settings are verified with a Web Audio test double. Audio requires a user interaction, as enforced by browsers. Synthetic creature voices and music are original; perceived sound quality has not been measured by an automated listening test.
- Room, creature, room-description and dynamic-event translations are tested, including callback/key/accessibility preservation in the translated React tree and a regression test for unkeyed static siblings during English rendering.
- WebMCP read/order/pause registration and shared-state actions pass in a mocked registry, including invalid input and cleanup. The live browser also reported all three WebMCP tools registered on both development and production-preview origins. Browser WebMCP calls themselves were not exercised; the action implementation remains covered by the registry tests.
- TypeScript checking and the production build pass. Vite reports the expected large Three.js renderer chunk. Shared atlas source images avoid uploading a separate full image for each frame. Loading waits for the real atlas image before attaching GPU textures, avoiding invalid placeholder-size reuse. State replacement invalidates terrain and creature caches.
- The production build is served at the repository subpath and loads the complete OpenArt texture/sprite set, font and HUD. The final production-preview browser console has no warnings or errors.
- All twelve OpenArt images and the prepared sprite sheets were visually reviewed. Transparency defects, stray neighbouring-frame pieces and inconsistent sprite baselines were corrected before use. The final game was screenshot-reviewed in the in-app browser. UI smoke tests cover start/pause, selecting a creature, slap damage/needs feedback, grabbing/cancelling placement, German/English switching, settings and independent music mute while effects remain enabled. Audio callbacks executed without runtime errors; this is not a subjective listening review.

## Practical boundaries

One replayable expedition, not a remake of another game's campaign. Resource layouts vary by seed while the starting dungeon stays learnable. Desktop mouse/keyboard is the primary input; narrow displays use a compact command column; secondary passive indicators are reduced on short windows. No multiplayer, cloud saves or imported third-party game assets. Persistent data stays in the local browser; blocked browser storage leaves the live session playable but prevents saves. The build is static and requires no server secrets.
