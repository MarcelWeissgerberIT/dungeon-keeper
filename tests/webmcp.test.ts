import test from 'node:test';
import assert from 'node:assert/strict';
import { registerGameTools } from '../app/webmcp';
import { createGame, applyTool } from '../app/game';
test('WebMCP registrations share simulation actions, validate batches and abort on cleanup', async () => {
  const registry = new Map<string, any>();
  Object.assign(globalThis, {
    document: {
      modelContext: {
        registerTool(tool: any, { signal }: { signal: AbortSignal }) {
          registry.set(tool.name, tool);
          signal.addEventListener('abort', () => registry.delete(tool.name));
        },
      },
    },
  });
  const s = createGame();
  let paused = false;
  const cleanup = registerGameTools({
    state: () => s,
    act: (tool, tiles) => tiles.map((i) => applyTool(s, tool, i)),
    pause: () => (paused = true),
  });
  assert.equal(registry.size, 3);
  assert.equal(registry.get('read_dungeon').annotations.readOnlyHint, true);
  const before = s.gold;
  registry.get('apply_dungeon_orders').execute({
    tool: 'training',
    tiles: [
      { x: 10, z: 11 },
      { x: 11, z: 11 },
    ],
  });
  assert.equal(s.gold, before - 280);
  assert.equal(registry.get('read_dungeon').execute({}).gold, s.gold);
  const after = s.gold;
  assert.throws(() =>
    registry
      .get('apply_dungeon_orders')
      .execute({ tool: 'training', tiles: [{ x: 100, z: 11 }] }),
  );
  assert.equal(s.gold, after);
  registry.get('pause_dungeon').execute({});
  assert.equal(paused, true);
  cleanup();
  assert.equal(registry.size, 0);
});
