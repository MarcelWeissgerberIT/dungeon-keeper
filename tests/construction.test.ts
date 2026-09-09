import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, idx, serialize, applyTool } from '../app/game';
import {
  rectangleIndices,
  quoteConstruction,
  commitConstruction,
} from '../app/construction';

const emptyArea = () => {
  const s = createGame();
  const tiles = rectangleIndices(idx(10, 10), idx(12, 12));
  for (const i of tiles)
    Object.assign(s.tiles[i], {
      kind: 'floor',
      owned: true,
      seen: true,
      room: null,
      trap: 0,
      door: 0,
    });
  return { s, tiles };
};

void test('rectangles include both ends regardless of drag direction and reject off-map endpoints', () => {
  const forward = rectangleIndices(idx(2, 3), idx(4, 5));
  assert.equal(forward.length, 9);
  assert.deepEqual(rectangleIndices(idx(4, 5), idx(2, 3)), forward);
  assert.deepEqual(rectangleIndices(idx(4, 3), idx(2, 5)), forward);
  assert.deepEqual(rectangleIndices(0, 0), [0]);
  assert.equal(rectangleIndices(0, 728).length, 729);
  for (const end of [null, -1, 729, 1.2, NaN])
    assert.deepEqual(rectangleIndices(0, end), []);
});

void test('planning is read-only, deduplicates tiles, excludes obstacles and matches single-tile rules', () => {
  const { s, tiles } = emptyArea();
  Object.assign(s.tiles[tiles[0]], { kind: 'core' });
  Object.assign(s.tiles[tiles[1]], { owned: false });
  Object.assign(s.tiles[tiles[2]], { room: 'rest' });
  Object.assign(s.tiles[tiles[3]], { trap: 3 });
  Object.assign(s.tiles[tiles[4]], { door: 280 });
  Object.assign(s.tiles[tiles[5]], { kind: 'earth' });
  s.units[0].x = 12;
  s.units[0].z = 12; // Creatures do not block a room.
  const before = serialize(s);
  const quote = quoteConstruction(s, 'training', [...tiles, ...tiles, -1, 900]);
  assert.equal(quote.valid.length, 3);
  assert.equal(quote.blocked.length, 6);
  assert.equal(quote.cost, 420);
  assert.equal(quote.width, 3);
  assert.equal(quote.depth, 3);
  assert.equal(serialize(s), before);
  for (const i of tiles) {
    const copy = structuredClone(s);
    assert.equal(applyTool(copy, 'training', i).ok, quote.valid.includes(i));
  }
});

void test('area construction never spends partial gold and commits once when fully affordable', () => {
  const { s, tiles } = emptyArea();
  s.gold = 1259;
  const before = serialize(s);
  assert.equal(quoteConstruction(s, 'training', tiles).shortfall, 1);
  assert.equal(commitConstruction(s, 'training', tiles).built, 0);
  assert.equal(serialize(s), before);
  s.gold = 1260;
  assert.equal(
    commitConstruction(s, 'training', [...tiles, ...tiles]).built,
    9,
  );
  assert.equal(s.gold, 0);
  assert.ok(tiles.every((i) => s.tiles[i].room === 'training'));
  assert.equal(commitConstruction(s, 'training', tiles).built, 0);
  assert.equal(s.gold, 0);
});

void test('commit rechecks research, ownership, current gold and expedition status', () => {
  const { s, tiles } = emptyArea();
  assert.equal(quoteConstruction(s, 'forge', tiles).valid.length, 0);
  s.unlocked = true;
  assert.equal(quoteConstruction(s, 'forge', tiles).valid.length, 9);
  s.gold = 0; // A payday after drawing must not result in partial construction.
  assert.equal(commitConstruction(s, 'forge', tiles).built, 0);
  s.gold = 3000;
  s.tiles[tiles[0]].owned = false;
  assert.equal(commitConstruction(s, 'forge', tiles).built, 8);
  assert.equal(s.tiles[tiles[0]].room, null);
  const next = emptyArea();
  next.s.status = 'lost';
  assert.equal(commitConstruction(next.s, 'training', next.tiles).built, 0);
});
