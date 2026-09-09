# Kluftkrone — Herrschaft der Tiefe

An original, playable 2.5D dungeon management game for the browser. German and English HUD, real-time autonomous creatures, a fully playable four-wave expedition and three difficulty levels.

**Play:** https://MarcelWeissgerberIT.github.io/dungeon-keeper/

## Play

Kindle the ember, designate earth and gold, and let your delvers excavate and claim the ground. Build training yards and a rune archive. Feed, rest, pay and strengthen your creatures. Research magic, craft defences, and withstand four invasions while protecting the eternal ember.

- Six room types, limited gold storage and real hauling.
- Delvers, Ash Wardens, Rune Weavers and Basalt Colossi with autonomous needs, work, combat and experience.
- Healing, lightning, rally orders, three-charge snares and protective gates.
- Creature pickup, slapping, direct possession and individual creature vocalizations.
- Original evolving ambient score and spatial effects with **independent music and effects volume/mute controls**.
- OpenArt terrain, illustrated furnishings and powers, a carved command HUD and original display font. Five original articulated 3D creature models have animated limbs, faces, armour and equipment.
- Local autosave every 30 seconds, manual save/load, pause and 1×/2×/3× speed.
- A German/English language switch. Desktop keyboard/mouse recommended; compact touch HUD supported.

Keyboard: **1** inspect, **2** dig, **3** sell, **4** rally, **5** heal, **WASD/arrows** move, **Q/E** rotate, **F** centre, **Space** pause, **Esc** leave possession/cancel tool, **Ctrl/Cmd+S** save. Drag the right mouse button to orbit; scroll to zoom. Drag the left mouse button with a build/dig tool for a rectangular order.

## Develop

Node.js 24 recommended (minimum 22.13).

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the URL printed by Vite, including `/dungeon-keeper/`. The game is a static React/TypeScript/Three.js application. `app/game.ts` is a renderer-independent simulation; `app/scene.ts` renders and controls the 3D world; `app/creature-models.ts` builds and animates the original shared-mesh creature rigs; `app/construction.ts` quotes and commits area plans; `app/audio.ts` generates all audio in the browser. No backend or API keys are required. Game saves and preferences use device-local browser storage.

GitHub Actions runs tests, builds and deploys `dist/` to GitHub Pages on pushes to `main`. Set Pages source to **GitHub Actions**. The repository name is retained from the user's supplied destination; the released game's title and assets are independent.

## Scope and provenance

This release contains one replayable expedition with three difficulty settings and varied resource distribution. It is not the original game's campaign, code, levels or art. See [design and sources](docs/DESIGN.md), [asset provenance](docs/ASSETS.md) and [validation](docs/VALIDATION.md).

The current visual set was generated through the authenticated OpenArt MCP connection. Generation identifiers and prompts are recorded in `docs/openart-generations.json`. The initial fallback illustrations have been replaced. No OpenArt credentials or runtime generation calls are shipped in the game.

### Area construction

Choose a room and drag across the dungeon (a single click selects one tile). Releasing the mouse leaves a construction plan. Green tiles are buildable, red tiles are blocked; amber means the plan needs more gold. The HUD shows dimensions, valid/blocked counts and the total cost. Press **Enter** or **Build area** to construct all valid fields, or **Escape** to discard. Insufficient total gold changes nothing. New selections replace the plan; changing tools or loading a game clears it. Plans are temporary and are not saved as completed construction. Excavation orders still mark work for the delvers.
