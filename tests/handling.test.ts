import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  grabUnit,
  dropUnit,
  cancelGrab,
  canDropUnit,
  tick,
  applyTool,
  spawn,
  idx,
  serialize,
  deserialize,
  creatures,
  slapUnit,
  type GameState,
} from '../app/game';
import { freshMapSeed } from '../app/seeds';

function quiet(): GameState {
  const s = createGame(92841);
  s.nextWave = s.nextArrival = s.nextPayday = 100000;
  return s;
}
function advance(s: GameState, seconds: number) {
  for (let n = 0; n < seconds * 10; n++) tick(s, 0.1);
}

void test('a held worker leaves world jobs and resumes after landing', () => {
  const s = quiet();
  const u = s.units.find((u) => u.kind === 'worker')!;
  s.units = [u];
  u.x = 10;
  u.z = 11;
  u.carry = 150;
  const wall = s.tiles[idx(9, 11)];
  wall.kind = 'earth';
  wall.seen = true;
  wall.marked = true;
  const before = { gold: s.gold, hunger: u.hunger, energy: u.energy };
  assert.equal(grabUnit(s, u.id), true);
  advance(s, 10);
  assert.equal(u.x, 10);
  assert.equal(u.z, 11);
  assert.equal(wall.progress, 0);
  assert.equal(u.carry, 150);
  assert.equal(s.gold, before.gold);
  assert.equal(u.hunger, before.hunger);
  assert.equal(u.energy, before.energy);
  assert.equal(dropUnit(s, u.id, idx(10, 11)), true);
  advance(s, 12);
  assert.equal(wall.kind, 'floor');
});

void test('held fighters cannot attack or be attacked, but still count and receive wages', () => {
  const s = quiet();
  const u = s.units.find((u) => u.kind === 'guard')!;
  s.units = [u];
  u.x = 12;
  u.z = 14;
  const enemy = spawn(s, 'invader', 12.2, 14);
  s.nextPayday = 1;
  const hp = u.hp,
    enemyHp = enemy.hp,
    gold = s.gold;
  assert.ok(grabUnit(s, u.id));
  advance(s, 3);
  assert.equal(u.hp, hp);
  assert.equal(enemy.hp, enemyHp);
  assert.equal(u.xp, 0);
  assert.equal(creatures(s).length, 1);
  assert.equal(s.gold, gold - u.wage);
  assert.equal(grabUnit(s, enemy.id), false);
});

void test('holding removes a scholar from research and area healing', () => {
  const s = quiet();
  s.units = [];
  const u = spawn(s, 'scholar', 10, 11);
  s.tiles[idx(10, 11)].room = 'library';
  u.hp = 40;
  assert.ok(grabUnit(s, u.id));
  advance(s, 5);
  assert.ok(s.research <= 0.401, 'only passive archive research remains');
  applyTool(s, 'heal', idx(10, 11));
  assert.equal(u.hp, 40);
});

void test('drops allow explored unclaimed disconnected floor and preserve the hand on invalid targets', () => {
  const s = quiet(),
    u = s.units[0];
  const origin = [u.x, u.z];
  assert.ok(grabUnit(s, u.id));
  assert.equal(grabUnit(s, s.units[1].id), false);
  for (const destination of [idx(0, 0), idx(4, 4), -1, idx(1, 1)]) {
    assert.equal(canDropUnit(s, destination), false);
    assert.equal(dropUnit(s, u.id, destination), false);
    assert.equal(s.heldUnitId, u.id);
    assert.deepEqual([u.x, u.z], origin);
  }
  const destination = idx(3, 23);
  Object.assign(s.tiles[destination], {
    kind: 'floor',
    seen: true,
    owned: false,
  });
  assert.equal(dropUnit(s, s.units[1].id, destination), false);
  assert.equal(dropUnit(s, u.id, destination), true);
  assert.equal(s.heldUnitId, null);
  assert.deepEqual([u.x, u.z], [3, 23]);
  tick(s, 0.1);
  assert.deepEqual([u.x, u.z], [3, 23], 'no world work during landing');
  assert.ok(grabUnit(s, u.id), 'a paused landing can be picked up again');
});

void test('cancel and save/load cannot strand, duplicate or penalize a held creature', () => {
  const s = quiet(),
    u = s.units[0];
  const origin = [u.x, u.z],
    energy = u.energy;
  assert.ok(grabUnit(s, u.id));
  const raw = serialize(s);
  assert.equal(s.heldUnitId, u.id, 'saving does not mutate the live hand');
  const loaded = deserialize(raw)!;
  assert.equal(loaded.heldUnitId, null);
  assert.equal(loaded.units.length, s.units.length);
  assert.deepEqual([loaded.units[0].x, loaded.units[0].z], origin);
  cancelGrab(s);
  cancelGrab(s);
  assert.equal(s.heldUnitId, null);
  assert.deepEqual([u.x, u.z], origin);
  assert.equal(u.energy, energy);
  assert.deepEqual(u.path, []);
  assert.equal(u.target, null);
  const old = JSON.parse(raw);
  delete old.heldUnitId;
  old.units.forEach((unit: { dropTimer?: number }) => delete unit.dropTimer);
  assert.equal(deserialize(JSON.stringify(old))?.heldUnitId, null);
});

void test('fresh initial worlds and restarts differ while explicit seeds and saves reproduce terrain', (t) => {
  const a = createGame(),
    b = createGame();
  assert.notEqual(a.seed, b.seed);
  assert.notDeepEqual(
    a.tiles.map((tile) => tile.kind),
    b.tiles.map((tile) => tile.kind),
  );
  assert.deepEqual(createGame(92841).tiles, createGame(92841).tiles);
  assert.equal(deserialize(serialize(a))?.seed, a.seed);
  // Even repeated entropy cannot repeat the previous world seed.
  t.mock.method(
    globalThis.crypto,
    'getRandomValues',
    () => new Uint32Array([123456]),
  );
  assert.notEqual(freshMapSeed(123456), 123456);
  const first = freshMapSeed();
  assert.notEqual(freshMapSeed(first), first);
});

void test('slapping a resident causes capped damage, mood loss, energy and a hit reaction', () => {
  const s = quiet(),
    u = s.units[0];
  u.hp = 2;
  u.energy = 99;
  u.mood = 3;
  assert.equal(slapUnit(s, u.id), true);
  assert.equal(u.hp, 1);
  assert.equal(u.energy, 100);
  assert.equal(u.mood, 0);
  assert.deepEqual(s.effects.at(-1), {
    x: u.x,
    z: u.z,
    type: 'hit',
    life: 0.4,
  });
  assert.ok(grabUnit(s, u.id));
  assert.equal(slapUnit(s, u.id), false);
  cancelGrab(s);
  const enemy = spawn(s, 'invader', 13, 2);
  assert.equal(slapUnit(s, enemy.id), false);
});
