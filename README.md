# Kluftkrone — Herrschaft der Tiefe

An original, playable 2.5D dungeon management game for the browser. German and English HUD, real-time autonomous creatures, a fully playable four-wave expedition and three difficulty levels.

**Play:** https://MarcelWeissgerberIT.github.io/dungeon-keeper/

## Play

Kindle the ember, designate earth and gold, and let your delvers excavate and claim the ground. Build training yards and a rune archive. Feed, rest, pay and strengthen your creatures. Research magic, craft defences, and withstand four invasions while protecting the eternal ember.

- Six room types, limited gold storage and real hauling.
- Delvers, Ash Wardens, Rune Weavers and Basalt Colossi with autonomous needs, work, combat and experience.
- Healing, lightning, rally orders, three-charge snares and protective gates.
- Direct creature drag-and-drop, slapping, possession and individual creature vocalizations.
- Original evolving ambient score and spatial effects with **independent music and effects volume/mute controls**.
- OpenArt terrain, illustrated furnishings and powers, a carved command HUD and original display font. Five original articulated 3D creature models have animated limbs, faces, armour and equipment.
- A fresh random map seed on every page load and new expedition; loading a save retains its world. The seed is shown in Settings.
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

### Excavation and future-room grids

Use **Excavate** or a room tool and drag a rectangle across known earth, gold or empty ground. The visible grid previews the exact tiles. In **Build afterwards**, choose **Excavate only** or a future room without redrawing the area; press **Enter** or **Place order**. Red tiles are unsuitable; room-coloured tiles with inset diamonds are future rooms, and amber grids are excavation-only orders.

Orders remain visible in the dungeon, minimap and order list. Delvers automatically excavate reachable tiles, claim exposed ground, then walk to and construct planned room tiles. Planning is free; each completed room tile charges its normal price. If gold runs out, excavation can continue and construction waits. An inaccessible area stays marked until a passage is opened. Orders are included in saved games; older saves remain compatible.

**Escape** discards only the unconfirmed draft. The order list lets you focus/edit an existing plan or remove its remaining orders. **Remove orders** on a selected area, or Sell on a designated tile, removes unfinished work without selling completed rooms or charging gold. Changing a future room replaces its unpaid order. Direct WebMCP construction remains a separate immediate-build operation on claimed ground, with an atomic total-price check.

### Moving creatures

With Inspect, Excavate or a room tool, click a visible resident to lift it, then click explored open ground to drop it. Alternatively, drag the resident and release over the destination. Green marks a valid landing tile; red means blocked ground. Unclaimed and disconnected open ground are allowed. Invalid or off-canvas drops keep the resident in hand. **Escape**, right-click, changing tools or cancelling returns it to its pickup position. **Right-click a resident on the ground to slap it**, with recoil and a creature voice. It loses a little health and happiness and gains a small energy boost. Dragging the right button rotates the camera without slapping. Creature portraits still open needs, slapping and possession.

A held creature leaves the world simulation: no walking, work or combat, and no minimap dot at its old location. It remains part of your population and payroll. Saving while holding it records it safely at its pickup location. Existing saves remain compatible.
