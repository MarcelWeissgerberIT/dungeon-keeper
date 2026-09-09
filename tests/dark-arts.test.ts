import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  spawn,
  tick,
  idx,
  prisoners,
  hostiles,
  army,
  creatures,
  applyTool,
  grabUnit,
  cancelGrab,
  dropUnit,
  serialize,
  deserialize,
  invokeRitual,
  ROOMS,
  type GameState,
  type Room,
} from '../app/game';
import { queueDesignation } from '../app/construction';
import { translate } from '../app/i18n';

function world() {
  const s = createGame(92841);
  s.units = [];
  s.nextWave = s.nextArrival = s.nextPayday = 1e6;
  s.gold = 1000;
  s.mana = 0;
  s.unlocked = true;
  s.research = 100;
  for (const t of s.tiles)
    Object.assign(t, {
      kind: t.x > 0 && t.x < 26 && t.z > 0 && t.z < 26 ? 'floor' : 'rock',
      owned: true,
      seen: true,
      room: null,
      plannedRoom: null,
      marked: false,
      trap: 0,
      door: 0,
    });
  return s;
}
function room(s: GameState, r: Room, x: number, z: number, n: number) {
  for (let j = 0; j < n; j++) s.tiles[idx(x + j, z)].room = r;
}
function advance(
  s: GameState,
  seconds: number,
  controlled: number | null = null,
) {
  for (let n = 0; n < seconds * 4; n++) tick(s, 0.25, controlled);
}
function captive() {
  const s = world();
  room(s, 'prison', 7, 10, 2);
  const u = spawn(s, 'invader', 9, 10);
  u.hp = 0;
  tick(s, 0.25);
  assert.ok(u.prisoner);
  return { s, u };
}
function conversion() {
  const { s, u } = captive();
  room(s, 'torment', 10, 10, 4);
  room(s, 'rest', 7, 15, 4);
  room(s, 'food', 7, 16, 4);
  assert.ok(grabUnit(s, u.id));
  assert.ok(dropUnit(s, u.id, idx(10, 10)));
  advance(s, 0.5);
  const keeper = spawn(s, 'scholar', 10, 10);
  return { s, u, keeper };
}
void test('simultaneous defeats reserve prison capacity and pay the defeat reward only once', () => {
  const s = world();
  room(s, 'prison', 7, 10, 2);
  for (let i = 0; i < 3; i++) spawn(s, 'invader', 9, 10).hp = 0;
  tick(s, 0.25);
  advance(s, 1);
  assert.equal(prisoners(s).length, 1);
  assert.equal(s.captured, 1);
  assert.equal(s.kills, 3);
  assert.equal(s.gold, 1270);
});
void test('melee, traps and magic all capture through reachable cells; inaccessible cells do not', () => {
  for (const source of ['melee', 'trap', 'bolt', 'unreachable']) {
    const s = world();
    room(s, 'prison', 7, 10, 2);
    const u = spawn(s, 'invader', 10, 10);
    u.hp = 1;
    if (source === 'melee') spawn(s, 'guard', 10.1, 10);
    if (source === 'trap') s.tiles[idx(10, 10)].trap = 1;
    if (source === 'bolt') {
      s.mana = 100;
      assert.ok(applyTool(s, 'bolt', idx(10, 10)).ok);
    }
    if (source === 'unreachable') {
      for (const i of [
        idx(6, 10),
        idx(9, 10),
        idx(7, 9),
        idx(8, 9),
        idx(7, 11),
        idx(8, 11),
      ])
        s.tiles[i].kind = 'rock';
      u.hp = 0;
    }
    tick(s, 0.25);
    assert.equal(u.prisoner, source !== 'unreachable', source);
    assert.equal(s.kills, 1);
    assert.equal(s.gold, 1090);
  }
});
void test('captives cannot fight, consume wages, be hit by lightning or block final victory', () => {
  const { s, u } = captive();
  const hp = u.hp,
    gold = s.gold;
  s.nextPayday = s.time + 0.25;
  advance(s, 2);
  assert.equal(u.hp, hp);
  assert.equal(s.gold, gold);
  assert.equal(creatures(s).length, 0);
  assert.equal(army(s).length, 0);
  assert.equal(hostiles(s).length, 0);
  s.mana = 100;
  assert.equal(applyTool(s, 'bolt', idx(u.x, u.z)).ok, false);
  assert.equal(s.mana, 100);
  s.wave = 4;
  tick(s, 0.25);
  assert.equal(s.status, 'won');
  const losing = captive().s;
  losing.wave = 4;
  losing.coreHp = 0;
  tick(losing, 0.25);
  assert.equal(losing.status, 'lost');
});
void test('hand reserves the cell, invalid drops preserve the prisoner, and held saves restore safely', () => {
  const { s, u } = captive();
  const origin = idx(u.x, u.z);
  u.conversion = 37;
  assert.ok(grabUnit(s, u.id));
  assert.equal(dropUnit(s, u.id, idx(12, 12)), false);
  spawn(s, 'invader', 9, 10).hp = 0;
  tick(s, 0.25);
  assert.equal(prisoners(s).length, 1);
  assert.equal(applyTool(s, 'sell', origin).ok, false);
  const loaded = deserialize(serialize(s));
  assert.ok(loaded);
  assert.equal(s.heldUnitId, u.id);
  assert.equal(loaded.heldUnitId, null);
  assert.equal(loaded.units[0].conversion, 37);
  assert.equal(idx(loaded.units[0].x, loaded.units[0].z), origin);
  cancelGrab(s);
  assert.ok(grabUnit(s, u.id));
  assert.ok(dropUnit(s, u.id, origin));
  advance(s, 0.5);
  assert.equal(u.dropTimer, 0);
});
void test('selling a supporting empty cell cannot reduce capacity below occupancy', () => {
  const { s, u } = captive();
  const empty = s.tiles.find(
    (t) => t.room === 'prison' && idx(t.x, t.z) !== idx(u.x, u.z),
  )!;
  const gold = s.gold;
  assert.equal(applyTool(s, 'sell', idx(empty.x, empty.z)).ok, false);
  assert.equal(s.gold, gold);
});
void test('a staffed torment room converts once after 75 seconds and preserves saved progress', () => {
  const { s, u } = conversion();
  const gold = s.gold;
  advance(s, 20);
  assert.ok(u.conversion > 20 && u.conversion < 30);
  const loaded = deserialize(serialize(s));
  assert.ok(loaded);
  advance(loaded, 55.25);
  const convert = loaded.units.find((v) => v.id === u.id)!;
  assert.equal(convert.kind, 'guard');
  assert.equal(convert.prisoner, false);
  assert.equal(convert.maxHp, 160);
  assert.equal(loaded.converted, 1);
  assert.equal(loaded.kills, 1);
  assert.equal(loaded.gold, gold);
  advance(loaded, 1);
  assert.equal(loaded.converted, 1);
});
void test('conversion pauses without a keeper, with a held or possessed keeper, and when the prisoner is held', () => {
  for (const mode of [
    'missing',
    'held-keeper',
    'possessed',
    'small-room',
    'held-prisoner',
  ]) {
    const { s, u, keeper } = conversion();
    keeper.state = 'Leitet Folterritual';
    if (mode === 'missing') s.units = s.units.filter((v) => v.id !== keeper.id);
    if (mode === 'held-keeper') grabUnit(s, keeper.id);
    if (mode === 'held-prisoner') grabUnit(s, u.id);
    if (mode === 'small-room') s.tiles[idx(13, 10)].room = null;
    advance(s, 1, mode === 'possessed' ? keeper.id : null);
    assert.equal(u.conversion, 0, mode);
  }
});
void test('a completed conversion waits for accommodation and finishes after expansion', () => {
  const { s, u } = conversion();
  s.tiles[idx(9, 15)].room = s.tiles[idx(10, 15)].room = null;
  advance(s, 76);
  assert.equal(u.conversion, 100);
  assert.ok(u.prisoner);
  room(s, 'rest', 7, 15, 4);
  tick(s, 0.25);
  assert.equal(u.kind, 'guard');
  assert.equal(s.converted, 1);
});
void test('new-room plans share research gates, delayed costs and worker execution', () => {
  for (const r of ['prison', 'torment', 'ritual'] as const) {
    const s = world();
    const i = idx(10, 10);
    s.unlocked = false;
    assert.equal(queueDesignation(s, r, [i]).queued, r === 'prison' ? 1 : 0);
    s.unlocked = true;
    const gold = s.gold;
    queueDesignation(s, r, [i]);
    assert.equal(s.gold, gold);
    spawn(s, 'worker', 10, 10);
    advance(s, 2);
    assert.equal(s.tiles[i].room, r);
    assert.equal(s.gold, gold - ROOMS[r].cost);
    assert.ok(deserialize(serialize(s)));
  }
});
void test('ritual requirements, cost, cooldown and save durations are enforced', () => {
  const s = world();
  assert.equal(invokeRitual(s).ok, false);
  room(s, 'ritual', 7, 10, 4);
  s.gold = 249;
  assert.equal(invokeRitual(s).ok, false);
  s.gold = 1000;
  assert.ok(invokeRitual(s).ok);
  assert.equal(s.gold, 750);
  assert.equal(invokeRitual(s).ok, false);
  advance(s, 15);
  const loaded = deserialize(serialize(s));
  assert.ok(loaded);
  assert.equal(loaded.ritualUntil - loaded.time, 45);
  assert.equal(loaded.ritualReadyAt - loaded.time, 105);
  advance(s, 104.75);
  assert.equal(invokeRitual(s).ok, false);
  tick(s, 0.25);
  assert.ok(invokeRitual(s).ok);
  assert.equal(s.gold, 500);
});
void test('ritual strengthens allied attacks but not enemy attacks, and increases mana and morale', () => {
  const damage = (blessed: boolean) => {
    const s = world();
    room(s, 'ritual', 7, 10, 4);
    const own = spawn(s, 'guard', 10, 10),
      enemy = spawn(s, 'invader', 10.1, 10);
    own.mood = 50;
    if (blessed) invokeRitual(s);
    tick(s, 0.25);
    return {
      ownDamage: enemy.maxHp - enemy.hp,
      enemyDamage: own.maxHp - own.hp,
      mana: s.mana,
      mood: own.mood,
    };
  };
  const plain = damage(false),
    blessed = damage(true);
  assert.ok(Math.abs(blessed.ownDamage - plain.ownDamage * 1.2) < 1e-8);
  assert.equal(blessed.enemyDamage, plain.enemyDamage);
  assert.ok(blessed.mana > plain.mana);
  assert.ok(blessed.mood > plain.mood);
});
void test('old saves migrate while corrupt captive and effectively infinite ritual imports are rejected', () => {
  const old = JSON.parse(serialize(createGame(1))) as Record<string, unknown>;
  for (const key of ['captured', 'converted', 'ritualUntil', 'ritualReadyAt'])
    delete old[key];
  for (const u of old.units as Record<string, unknown>[]) {
    delete u.prisoner;
    delete u.conversion;
  }
  const loaded = deserialize(JSON.stringify(old));
  assert.ok(loaded);
  assert.equal(loaded.units[0].prisoner, false);
  for (const change of [
    (s: GameState) => (s.ritualUntil = s.ritualReadyAt = 1e8),
    (s: GameState) => (s.units[0].conversion = 101),
    (s: GameState) => (s.units[0].hp = 0),
  ]) {
    const s = captive().s;
    change(s);
    assert.equal(deserialize(serialize(s)), null);
  }
});
void test('all new captive states and messages have English text', () => {
  const states = [
    'Gefangen',
    'Leitet Folterritual',
    'Benötigt vier Folterfelder',
    'Wartet auf Runenweber',
    'Widerstand schwindet',
    'Wartet auf Ruheplatz und Nahrung',
    'Übergelaufen',
  ];
  const { s } = captive();
  room(s, 'ritual', 7, 10, 4);
  invokeRitual(s);
  for (const text of [...states, ...s.messages.map((m) => m.text)])
    assert.notEqual(translate(text, 'en'), text);
});
