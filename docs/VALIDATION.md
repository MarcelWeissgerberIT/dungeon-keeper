# Validation record

Validated on 2026-09-09 using Node.js 24.

- 21 automated tests pass: room costs and rejected actions, reachable gold excavation/hauling/claiming, inaccessible mining, worker independence from rally orders, save/load at fractional positions, feeding and rest, traps during combat, combat needs and leveling, walls blocking ranged damage, recruitment/research/payroll, malformed saves, terminal outcomes, and full expeditions on relaxed/normal/hard using regular player commands.
- All three complete expeditions include a midgame save/load and end with victory using normal resources and powers.
- Independent music/effects gain and mute settings are verified with a Web Audio test double. Audio requires a user interaction, as enforced by browsers. Synthetic creature voices and music are original; perceived sound quality has not been measured by an automated listening test.
- Room, creature, room-description and dynamic-event translations are tested, including callback/key/accessibility preservation in the translated React tree.
- WebMCP read/order/pause registration and shared-state actions pass in a mocked registry, including invalid input and cleanup. A supported live browser WebMCP context was not available; live registration is not claimed as verified.
- TypeScript checking and the production build pass. Vite reports the expected large Three.js renderer chunk.
- Production entry, all referenced JS/CSS, texture atlas, basalt texture, font and favicon return HTTP 200 with appropriate content types from the local static preview at the repository subpath.
- Generated artwork and custom-font specimen were visually inspected. The foreground local game preview was handed to the user. No automated browser interaction or screenshot audit was run.

## Practical boundaries

One replayable expedition, not a remake of another game's campaign. Resource layouts vary by seed while the starting dungeon stays learnable. Desktop mouse/keyboard is the primary input; narrow displays use a scrollable room palette. No multiplayer, cloud saves or imported third-party game assets. Persistent data stays in the local browser; blocked browser storage leaves the live session playable but prevents saves. The build is static and requires no server secrets.
