import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  applyTool,
  tick,
  idx,
  findPath,
  spawn,
  deserialize,
  serialize,
  countRoom,
  type GameState,
} from '../app/game';
const advance = (s: GameState, seconds: number) => {
  for (let n = 0; n < Math.round(seconds * 10); n++) tick(s, 0.1);
};
const quiet = () => {
  const s = createGame();
  s.nextWave = s.nextArrival = s.nextPayday = 100000;
  return s;
};

test('room building charges per valid field and rejects rock/unowned terrain without charging', () => {
  const s = quiet();
  const before = s.gold;
  assert.equal(applyTool(s, 'training', idx(10, 11)).ok, true);
  assert.equal(s.gold, before - 140);
  assert.equal(applyTool(s, 'training', idx(10, 11)).ok, false);
  assert.equal(applyTool(s, 'library', idx(0, 0)).ok, false);
  assert.equal(applyTool(s, 'food', idx(13, 5)).ok, false);
  assert.equal(s.gold, before - 140);
  assert.equal(applyTool(s, 'sell', idx(10, 11)).ok, true);
  assert.equal(s.gold, before - 70);
});
test('workers excavate reachable gold, carry it to storage and claim exposed ground', () => {
  const s = quiet();
  s.gold = 0;
  const t = s.tiles[idx(6, 13)];
  t.kind = 'gold';
  t.seen = true;
  t.gold = 600;
  assert.ok(applyTool(s, 'dig', idx(6, 13)).ok);
  advance(s, 60);
  assert.equal(t.kind, 'floor');
  assert.equal(t.owned, true);
  assert.equal(s.mined, 600);
  assert.ok(s.gold >= 600);
});
test('a rally orders fighters but workers continue excavation', () => {
  const s = quiet();
  const t = s.tiles[idx(9, 11)];
  t.kind = 'earth';
  t.seen = true;
  applyTool(s, 'dig', idx(9, 11));
  applyTool(s, 'rally', idx(14, 12));
  advance(s, 20);
  assert.equal(t.kind, 'floor');
  assert.ok(
    s.units.some((u) => u.kind === 'guard' && u.state === 'Sammelt sich'),
  );
});
test('unreachable marked terrain is not mined through walls', () => {
  const s = quiet();
  const t = s.tiles[idx(3, 22)];
  t.kind = 'gold';
  t.gold = 600;
  t.seen = true;
  applyTool(s, 'dig', idx(3, 22));
  advance(s, 25);
  assert.equal(t.kind, 'gold');
  assert.equal(t.gold, 600);
  assert.equal(findPath(s, idx(13, 14), idx(3, 22)).length, 0);
});
test('fractional worker position recovers after save/load and deposits gold', () => {
  let s = quiet();
  s.units = [];
  const u = spawn(s, 'worker', 8.3, 13.2);
  u.carry = 200;
  s.gold = 0;
  s = deserialize(serialize(s))!;
  assert.ok(s);
  advance(s, 10);
  assert.equal(s.gold, 200);
  assert.equal(s.units[0].carry, 0);
});
test('hungry and tired residents resume reaching room centers after loading', () => {
  for (const need of ['hunger', 'energy'] as const) {
    let s = quiet();
    s.units = [];
    const u = spawn(s, 'guard', need === 'hunger' ? 16.3 : 12.3, 19.2);
    u[need] = 15;
    s = deserialize(serialize(s))!;
    advance(s, 10);
    assert.ok(s.units[0][need] > 70, need);
  }
});
test('traps trigger during active combat independently of attack cooldown', () => {
  const s = quiet();
  s.units = [];
  const tile = s.tiles[idx(13, 12)];
  tile.trap = 3;
  const invader = spawn(s, 'invader', 13, 12);
  invader.hp = invader.maxHp = 500;
  invader.cooldown = 5;
  spawn(s, 'guard', 13, 13);
  tick(s, 0.1);
  assert.equal(tile.trap, 2);
  assert.ok(invader.hp <= 405);
  advance(s, 1.1);
  assert.equal(tile.trap, 1);
});
test('combat updates needs and levels; ranged attacks cannot cross rock', () => {
  const s = quiet();
  s.units = [];
  const guard = spawn(s, 'guard', 13, 12),
    enemy = spawn(s, 'invader', 13, 11);
  enemy.hp = enemy.maxHp = 10000;
  guard.xp = 61;
  tick(s, 0.1);
  assert.equal(guard.level, 2);
  assert.ok(guard.hunger < 90);
  const s2 = quiet();
  s2.units = [];
  spawn(s2, 'scholar', 10, 14);
  const e = spawn(s2, 'invader', 8, 14);
  s2.tiles[idx(9, 14)].kind = 'rock';
  tick(s2, 0.1);
  assert.equal(e.hp, e.maxHp);
});
test('research, recruitment, training costs and wages progress through simulation', () => {
  const s = quiet();
  s.nextArrival = 1;
  for (let z = 15; z < 17; z++)
    for (let x = 10; x < 12; x++)
      assert.ok(applyTool(s, 'library', idx(x, z)).ok);
  advance(s, 2);
  assert.ok(s.units.some((u) => u.kind === 'scholar'));
  advance(s, 190);
  assert.ok(s.unlocked);
  assert.ok(applyTool(s, 'forge', idx(10, 11)).ok);
  const before = s.gold;
  s.nextPayday = s.time + 0.05;
  const wages = s.units.reduce((a, u) => a + u.wage, 0);
  tick(s, 0.1);
  assert.equal(s.gold, before - wages);
});
test('insufficient gold, mana and locked technology have no partial side effects', () => {
  const s = quiet();
  s.gold = 0;
  s.mana = 0;
  const before = serialize(s);
  assert.equal(applyTool(s, 'worker', idx(13, 14)).ok, false);
  assert.equal(applyTool(s, 'heal', idx(13, 14)).ok, false);
  assert.equal(applyTool(s, 'forge', idx(10, 11)).ok, false);
  assert.equal(serialize(s), before);
});
test('malformed saves are rejected before changing live state', () => {
  const valid = serialize(quiet());
  const mutations = [
    (s: any) => (s.rally = 9999),
    (s: any) => delete s.units[0].wage,
    (s: any) => (s.units[0].kind = 'toString'),
    (s: any) => (s.tiles[0].room = 'toString'),
    (s: any) => (s.messages[0].text = {}),
    (s: any) => (s.units[0].x = 26.9),
    (s: any) => (s.tutorial = 100),
    (s: any) => (s.gold = -10),
  ];
  for (const change of mutations) {
    const data = JSON.parse(valid);
    change(data);
    assert.equal(deserialize(JSON.stringify(data)), null);
  }
  assert.equal(deserialize('garbage'), null);
  assert.ok(deserialize(valid));
});
test('loss and final-wave victory are terminal; controlled actor does not auto-path', () => {
  const s = quiet();
  s.units = [];
  const u = spawn(s, 'guard', 13, 13);
  tick(s, 0.1, u.id);
  assert.equal(u.x, 13);
  assert.equal(u.z, 13);
  s.coreHp = 0;
  tick(s, 0.1);
  assert.equal(s.status, 'lost');
  const t = s.time;
  tick(s, 0.1);
  assert.equal(s.time, t);
  const s2 = quiet();
  s2.wave = 4;
  tick(s2, 0.1);
  assert.equal(s2.status, 'won');
});

for (const difficulty of ['relaxed', 'normal', 'hard'] as const)
  test(`full ${difficulty} expedition can be won using normal player orders and save/load`, () => {
    let s = createGame(92841, difficulty);
    for (let z = 12; z < 14; z++)
      for (let x = 10; x < 13; x++) applyTool(s, 'training', idx(x, z));
    for (let z = 15; z < 17; z++)
      for (let x = 10; x < 12; x++) applyTool(s, 'library', idx(x, z));
    for (let x = 14; x <= 15; x++)
      for (let z = 15; z <= 16; z++) applyTool(s, 'rest', idx(x, z));
    for (let n = 0; n < 15000 && s.status === 'playing'; n++) {
      if (n % 50 === 0)
        for (let z = 10; z <= 18; z++)
          for (let x = 2; x <= 6; x++) {
            const t = s.tiles[idx(x, z)];
            if (t.seen && ['earth', 'gold'].includes(t.kind) && !t.marked)
              applyTool(s, 'dig', idx(x, z));
          }
      const enemies = s.units.filter((u) => u.kind === 'invader' && u.hp > 0);
      if (enemies.length && s.unlocked && s.mana >= 45) {
        const target = enemies
          .toSorted(
            (a, b) =>
              enemies.filter((e) => Math.hypot(a.x - e.x, a.z - e.z) < 2.6)
                .length -
              enemies.filter((e) => Math.hypot(b.x - e.x, b.z - e.z) < 2.6)
                .length,
          )
          .pop()!;
        applyTool(s, 'bolt', idx(Math.round(target.x), Math.round(target.z)));
      }
      const injured = s.units.find(
        (u) => u.kind !== 'invader' && u.hp < u.maxHp * 0.4,
      );
      if (injured && s.mana >= 90)
        applyTool(s, 'heal', idx(Math.round(injured.x), Math.round(injured.z)));
      tick(s, 0.1);
      if (n === 1800) {
        const loaded = deserialize(serialize(s));
        assert.ok(loaded);
        s = loaded;
      }
    }
    assert.equal(s.status, 'won');
    assert.equal(s.wave, 4);
    assert.ok(s.kills >= 20);
    assert.ok(s.coreHp > 0);
    assert.ok(countRoom(s, 'training') >= 4);
  });
