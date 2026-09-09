import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  idx,
  tick,
  serialize,
  deserialize,
  applyTool,
  capacity,
} from '../app/game';
import {
  rectangleIndices,
  quoteDesignation,
  queueDesignation,
  cancelDesignations,
} from '../app/construction';
import { translate } from '../app/i18n';
const quiet = () => {
  const s = createGame(92841);
  s.nextWave = s.nextArrival = s.nextPayday = 1e6;
  return s;
};
const advance = (s: ReturnType<typeof quiet>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.1) tick(s, 0.1);
};

void test('a free future-room designation survives excavation, claiming and save/load until workers build it once', () => {
  let s = quiet();
  const area = rectangleIndices(idx(7, 11), idx(8, 12));
  for (const i of area)
    Object.assign(s.tiles[i], {
      kind: 'earth',
      seen: true,
      owned: false,
      room: null,
      gold: 0,
    });
  const before = s.gold;
  const quote = quoteDesignation(s, 'library', area);
  assert.equal(quote.excavate.length, 4);
  assert.equal(quote.cost, 720);
  assert.equal(queueDesignation(s, 'library', area).queued, 4);
  assert.equal(s.gold, before);
  advance(s, 10);
  const loaded = deserialize(serialize(s));
  assert.ok(loaded);
  s = loaded;
  advance(s, 180);
  assert.ok(
    area.every(
      (i) =>
        s.tiles[i].kind === 'floor' &&
        s.tiles[i].owned &&
        s.tiles[i].room === 'library' &&
        s.tiles[i].plannedRoom === null,
    ),
  );
  assert.equal(s.gold, before - 720);
  advance(s, 5);
  assert.equal(s.gold, before - 720);
});

void test('future rooms wait for gold without cancelling excavation, then finish when funded', () => {
  const s = quiet(),
    i = idx(8, 11);
  s.gold = 0;
  Object.assign(s.tiles[i], {
    kind: 'earth',
    seen: true,
    owned: false,
    room: null,
    gold: 0,
  });
  assert.equal(quoteDesignation(s, 'training', [i]).canPlan, true);
  queueDesignation(s, 'training', [i]);
  advance(s, 80);
  assert.equal(s.tiles[i].kind, 'floor');
  assert.equal(s.tiles[i].owned, true);
  assert.equal(s.tiles[i].room, null);
  assert.equal(s.tiles[i].plannedRoom, 'training');
  assert.equal(s.gold, 0);
  s.gold = 140;
  advance(s, 10);
  assert.equal(s.tiles[i].room, 'training');
  assert.equal(s.tiles[i].plannedRoom, null);
  assert.equal(s.gold, 0);
});

void test('idempotent orders can be repurposed and cancelled without selling completed rooms', () => {
  const s = quiet(),
    area = [idx(10, 11), idx(11, 11)];
  s.gold = 140;
  queueDesignation(s, 'training', area);
  queueDesignation(s, 'training', area);
  assert.equal(s.gold, 140);
  advance(s, 10);
  assert.equal(area.filter((i) => s.tiles[i].room === 'training').length, 1);
  const pending = area.find((i) => s.tiles[i].plannedRoom)!;
  queueDesignation(s, 'library', [pending]);
  assert.equal(s.tiles[pending].plannedRoom, 'library');
  queueDesignation(s, 'dig', [pending]);
  assert.equal(s.tiles[pending].plannedRoom, null);
  assert.equal(s.tiles[pending].room, null);
  queueDesignation(s, 'library', [pending]);
  assert.equal(cancelDesignations(s, area), 1);
  assert.equal(s.gold, 0);
  assert.equal(area.filter((i) => s.tiles[i].room === 'training').length, 1);
  const earth = idx(8, 11);
  Object.assign(s.tiles[earth], {
    kind: 'earth',
    seen: true,
    room: null,
    owned: false,
  });
  queueDesignation(s, 'training', [earth]);
  queueDesignation(s, 'dig', [earth]);
  queueDesignation(s, 'dig', [earth]);
  assert.equal(s.tiles[earth].marked, true);
  assert.equal(s.tiles[earth].plannedRoom, null);
  assert.equal(applyTool(s, 'sell', earth).ok, true);
  assert.equal(s.tiles[earth].marked, false);
  assert.equal(s.gold, 0);
});

void test('unreachable plans persist, unsuitable ground stays protected, and old saves still load', () => {
  const s = quiet(),
    i = idx(2, 23);
  Object.assign(s.tiles[i], { kind: 'earth', seen: true, owned: false });
  for (const n of [i - 1, i + 1, i - 27, i + 27])
    Object.assign(s.tiles[n], { kind: 'rock', seen: true, owned: false });
  queueDesignation(s, 'rest', [i]);
  advance(s, 20);
  assert.equal(s.tiles[i].kind, 'earth');
  assert.equal(s.tiles[i].plannedRoom, 'rest');
  const blocked = [idx(0, 0), idx(13, 14), idx(13, 8), idx(3, 3)];
  assert.equal(queueDesignation(s, 'rest', blocked).queued, 0);
  const old = JSON.parse(serialize(quiet()));
  for (const t of old.tiles) delete t.plannedRoom;
  const migrated = deserialize(JSON.stringify(old));
  assert.ok(migrated);
  assert.ok(migrated.tiles.every((t) => t.plannedRoom === null));
  old.tiles[i].plannedRoom = ['rest'];
  assert.equal(deserialize(JSON.stringify(old)), null);
  old.tiles[i].plannedRoom = 'invalid';
  assert.equal(deserialize(JSON.stringify(old)), null);
  old.tiles[i].plannedRoom = 'vault';
  old.tiles[i].kind = 'water';
  assert.equal(deserialize(JSON.stringify(old)), null);
});

void test('save/load resumes partially paid plans without charging completed tiles twice', () => {
  let s = quiet();
  s.gold = 90;
  const area = [idx(10, 11), idx(11, 11)];
  queueDesignation(s, 'rest', area);
  advance(s, 10);
  assert.equal(s.gold, 0);
  assert.equal(area.filter((i) => s.tiles[i].room === 'rest').length, 1);
  const restored = deserialize(serialize(s));
  assert.ok(restored);
  s = restored;
  s.gold = 90;
  advance(s, 10);
  assert.equal(s.gold, 0);
  assert.ok(
    area.every((i) => s.tiles[i].room === 'rest' && !s.tiles[i].plannedRoom),
  );
  assert.equal(translate('Geplant: Ruhestätte', 'en'), 'Planned: Sanctuary');
  assert.equal(
    translate('Aufträge löschen: Nur graben', 'en'),
    'Remove orders: Excavate only',
  );
});

void test('a full treasury and full worker hands do not prevent a queued vault expansion', () => {
  const s = quiet(),
    i = idx(10, 11);
  s.units = s.units.filter((u) => u.kind === 'worker');
  for (const u of s.units) u.carry = 200;
  s.gold = capacity(s);
  queueDesignation(s, 'vault', [i]);
  advance(s, 20);
  assert.equal(s.tiles[i].room, 'vault');
  assert.equal(s.tiles[i].plannedRoom, null);
  assert.ok(s.gold >= 0);
  assert.ok(s.gold <= capacity(s));
});
