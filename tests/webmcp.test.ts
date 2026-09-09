import test from 'node:test';
import assert from 'node:assert/strict';
import { registerGameTools } from '../app/webmcp';
import { createGame, applyTool } from '../app/game';
interface RegisteredTool {
  name: string;
  title: string;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
}
void test('WebMCP registrations share simulation actions, validate batches and abort on cleanup', async () => {
  const registry = new Map<string, RegisteredTool>();
  const tool = (name: string) => {
    const entry = registry.get(name);
    assert.ok(entry, `${name} is registered`);
    return entry;
  };
  const readDomain = () =>
    tool('read_dungeon').execute({}) as {
      gold: number;
      units: { state: string }[];
    };
  Object.assign(globalThis, {
    document: {
      modelContext: {
        registerTool(
          tool: RegisteredTool,
          { signal }: { signal: AbortSignal },
        ) {
          registry.set(tool.name, tool);
          signal.addEventListener('abort', () => registry.delete(tool.name));
        },
      },
    },
  });
  const s = createGame(92841);
  let paused = false;
  const cleanup = registerGameTools({
    state: () => s,
    act: (tool, tiles) => tiles.map((i) => applyTool(s, tool, i)),
    pause: () => (paused = true),
  });
  assert.equal(registry.size, 3);
  assert.equal(tool('read_dungeon').annotations.readOnlyHint, true);
  const before = s.gold;
  tool('apply_dungeon_orders').execute({
    tool: 'training',
    tiles: [
      { x: 10, z: 11 },
      { x: 11, z: 11 },
    ],
  });
  assert.equal(s.gold, before - 280);
  assert.equal(readDomain().gold, s.gold);
  const after = s.gold;
  assert.throws(() =>
    tool('apply_dungeon_orders').execute({
      tool: 'training',
      tiles: [{ x: 100, z: 11 }],
    }),
  );
  assert.equal(s.gold, after);
  tool('pause_dungeon').execute({});
  assert.equal(paused, true);
  cleanup();
  assert.equal(registry.size, 0);
  s.units[0].state = 'Wartet auf Arbeit';
  const cleanupEnglish = registerGameTools(
    {
      state: () => s,
      act: (tool, tiles) => tiles.map((i) => applyTool(s, tool, i)),
      pause: () => (paused = true),
    },
    'en',
  );
  assert.equal(tool('read_dungeon').title, 'Inspect domain');
  assert.equal(tool('apply_dungeon_orders').title, 'Apply construction orders');
  assert.equal(tool('pause_dungeon').title, 'Pause domain');
  assert.equal(readDomain().units[0].state, 'Awaiting work');
  assert.equal(s.units[0].state, 'Wartet auf Arbeit');
  cleanupEnglish();
  assert.equal(registry.size, 0);
});
