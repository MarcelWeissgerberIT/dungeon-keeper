import { freshMapSeed } from './seeds';

export const SIZE = 27;
export type Room =
  | 'vault'
  | 'rest'
  | 'food'
  | 'training'
  | 'library'
  | 'forge'
  | 'prison'
  | 'torment'
  | 'ritual';
export type TileKind =
  | 'rock'
  | 'earth'
  | 'gold'
  | 'floor'
  | 'core'
  | 'portal'
  | 'entry'
  | 'water';
export type Tool =
  | 'inspect'
  | 'dig'
  | 'sell'
  | 'rally'
  | 'heal'
  | 'bolt'
  | 'worker'
  | 'trap'
  | 'door'
  | 'ritualBlessing'
  | Room;
export interface Tile {
  x: number;
  z: number;
  kind: TileKind;
  owned: boolean;
  marked: boolean;
  progress: number;
  room: Room | null;
  plannedRoom: Room | null;
  trap: number;
  door: number;
  trapCooldown: number;
  seen: boolean;
  gold: number;
}
export type UnitKind = 'worker' | 'guard' | 'scholar' | 'brute' | 'invader';
export interface Unit {
  id: number;
  name: string;
  kind: UnitKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  hunger: number;
  energy: number;
  mood: number;
  level: number;
  xp: number;
  carry: number;
  state: string;
  target: number | null;
  path: number[];
  cooldown: number;
  wage: number;
  dropTimer: number;
  prisoner: boolean;
  conversion: number;
}
export interface Message {
  id: number;
  time: number;
  text: string;
  tone: 'info' | 'warn' | 'good';
}
export interface Effect {
  x: number;
  z: number;
  type:
    | 'dig'
    | 'gold'
    | 'heal'
    | 'bolt'
    | 'hit'
    | 'spawn'
    | 'capture'
    | 'torment'
    | 'ritual';
  life: number;
}
export interface GameState {
  version: 1;
  seed: number;
  difficulty: 'relaxed' | 'normal' | 'hard';
  tiles: Tile[];
  units: Unit[];
  heldUnitId: number | null;
  gold: number;
  mana: number;
  coreHp: number;
  time: number;
  wave: number;
  nextWave: number;
  nextArrival: number;
  nextPayday: number;
  research: number;
  unlocked: boolean;
  forge: number;
  status: 'playing' | 'won' | 'lost';
  messages: Message[];
  effects: Effect[];
  id: number;
  revision: number;
  mined: number;
  kills: number;
  built: number;
  explored: number;
  rally: number | null;
  tutorial: number;
  portalClaimed: boolean;
  lastSave: number;
  captured: number;
  converted: number;
  ritualUntil: number;
  ritualReadyAt: number;
}
export const ROOMS: Record<
  Room,
  {
    name: string;
    cost: number;
    color: string;
    description: string;
    short: string;
  }
> = {
  vault: {
    name: 'Schatzkammer',
    cost: 70,
    color: '#d6aa52',
    description:
      'Lagert abgebautes Gold. Jedes Feld erweitert die Kapazität um 700.',
    short: 'Gold lagern',
  },
  rest: {
    name: 'Ruhestätte',
    cost: 90,
    color: '#9971b7',
    description:
      'Bewohner schlafen und erholen sich. Vier Felder locken neue Wächter an.',
    short: 'Bewohner erholen',
  },
  food: {
    name: 'Pilzgarten',
    cost: 110,
    color: '#83af6d',
    description:
      'Nährende Leuchtpilze stillen den Hunger. Nahrung wächst ohne weitere Kosten.',
    short: 'Hunger stillen',
  },
  training: {
    name: 'Übungshof',
    cost: 140,
    color: '#c16a4b',
    description:
      'Wächter trainieren automatisch. Erfahrung erhöht Stärke und Lebenskraft; kostet Gold.',
    short: 'Kampfkraft steigern',
  },
  library: {
    name: 'Runenarchiv',
    cost: 180,
    color: '#57b4b4',
    description:
      'Vier Felder locken Runenweber an. Forschung schaltet Sturmfunken und die Werkstatt frei.',
    short: 'Magie erforschen',
  },
  forge: {
    name: 'Werkstatt',
    cost: 210,
    color: '#939dac',
    description:
      'Bewohner schmieden Vorräte für Fangrunen und Schutzpforten. Benötigt abgeschlossene Forschung.',
    short: 'Verteidigung fertigen',
  },
  prison: {
    name: 'Gefängnis',
    cost: 160,
    color: '#839aa8',
    description:
      'Je zwei Gefängnisfelder halten einen besiegten Sonnenritter fest. Nur erreichbare, freie Zellen fangen Gegner. Gefangene kannst du greifen und in die Folterkammer versetzen.',
    short: 'Feinde gefangen nehmen',
  },
  torment: {
    name: 'Folterkammer',
    cost: 240,
    color: '#b564ba',
    description:
      'Ab vier Feldern: Runenweber brechen den Widerstand eines Gefangenen in 75 Sekunden. Er wird zum Aschewächter; benötigt einen freien Ruheplatz und vier Pilzgartenfelder. Forschung erforderlich.',
    short: 'Gefangene bekehren',
  },
  ritual: {
    name: 'Ritualkammer',
    cost: 220,
    color: '#e19a4b',
    description:
      'Vier Felder ermöglichen den Aschensegen: 60 Sekunden mehr Kampfkraft, Mana und Zufriedenheit. Auslösen unter Mächte für 250 Gold; 120 Sekunden Abklingzeit. Forschung erforderlich.',
    short: 'Aschensegen entfesseln',
  },
};
export const ROOM_KEYS = Object.keys(ROOMS) as Room[];
export const roomLocked = (s: GameState, r: string) =>
  !s.unlocked && ['forge', 'torment', 'ritual'].includes(r);
export const NAMES: Record<UnitKind, string> = {
  worker: 'Schürfling',
  guard: 'Aschewächter',
  scholar: 'Runenweber',
  brute: 'Basaltkoloss',
  invader: 'Sonnenritter',
};
export const UNIT_COLORS: Record<UnitKind, string> = {
  worker: '#dfb374',
  guard: '#d46a53',
  scholar: '#60d5c4',
  brute: '#9f8fcb',
  invader: '#e7e5bf',
};
export const idx = (x: number, z: number) => z * SIZE + x;
export const inBounds = (x: number, z: number) =>
  x >= 0 && z >= 0 && x < SIZE && z < SIZE;
export const adjacent = (i: number) => {
  const x = i % SIZE,
    z = Math.floor(i / SIZE);
  return [
    [x - 1, z],
    [x + 1, z],
    [x, z - 1],
    [x, z + 1],
  ]
    .filter(([a, b]) => inBounds(a, b))
    .map(([a, b]) => idx(a, b));
};
export const walkable = (t: Tile) =>
  ['floor', 'core', 'portal', 'entry'].includes(t.kind);
export const countRoom = (s: GameState, r: Room) =>
  s.tiles.filter((t) => t.room === r).length;
export const capacity = (s: GameState) => 2500 + countRoom(s, 'vault') * 700;
export const army = (s: GameState) =>
  s.units.filter((u) => u.kind !== 'worker' && u.kind !== 'invader');
export const creatures = (s: GameState) =>
  s.units.filter((u) => u.kind !== 'invader');
export const prisoners = (s: GameState) => s.units.filter((u) => u.prisoner);
export const hostiles = (s: GameState) =>
  s.units.filter((u) => u.kind === 'invader' && !u.prisoner);
export const prisonCapacity = (s: GameState) =>
  Math.floor(countRoom(s, 'prison') / 2);
export const coreIndex = idx(13, 14);
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function log(
  s: GameState,
  text: string,
  tone: Message['tone'] = 'info',
) {
  s.messages.unshift({ id: ++s.id, time: s.time, text, tone });
  s.messages = s.messages.slice(0, 20);
}
export function spawn(
  s: GameState,
  kind: UnitKind,
  x: number,
  z: number,
  level = 1,
) {
  const health =
    { worker: 65, guard: 160, scholar: 100, brute: 290, invader: 115 }[kind] *
    (1 + (level - 1) * 0.22);
  const u: Unit = {
    id: ++s.id,
    name: NAMES[kind],
    kind,
    prisoner: false,
    conversion: 0,
    x,
    z,
    hp: health,
    maxHp: health,
    hunger: 90,
    energy: 95,
    mood: 95,
    level,
    xp: 0,
    carry: 0,
    state: kind === 'invader' ? 'Greift an' : 'Orientiert sich',
    target: null,
    path: [],
    cooldown: 0,
    wage: kind === 'worker' ? 0 : kind === 'brute' ? 65 : 35,
    dropTimer: 0,
  };
  s.units.push(u);
  s.effects.push({ x, z, type: 'spawn', life: 1 });
  return u;
}
export function createGame(
  seed = freshMapSeed(),
  difficulty: GameState['difficulty'] = 'normal',
): GameState {
  const rng = random(seed);
  const s: GameState = {
    version: 1,
    seed,
    difficulty,
    tiles: [],
    units: [],
    heldUnitId: null,
    gold: 2400,
    mana: 100,
    coreHp: 1500,
    time: 0,
    wave: 0,
    nextWave:
      difficulty === 'relaxed' ? 300 : difficulty === 'hard' ? 140 : 210,
    nextArrival: 38,
    nextPayday: 100,
    research: 0,
    unlocked: false,
    forge: 3,
    status: 'playing',
    messages: [],
    effects: [],
    id: 0,
    revision: 0,
    mined: 0,
    kills: 0,
    built: 0,
    explored: 0,
    rally: null,
    tutorial: 0,
    portalClaimed: true,
    lastSave: 0,
    captured: 0,
    converted: 0,
    ritualUntil: 0,
    ritualReadyAt: 0,
  };
  for (let z = 0; z < SIZE; z++)
    for (let x = 0; x < SIZE; x++) {
      const boundary = x === 0 || z === 0 || x === SIZE - 1 || z === SIZE - 1;
      let kind: TileKind = boundary ? 'rock' : rng() < 0.025 ? 'rock' : 'earth';
      if (
        (x < 7 && z > 8 && z < 19) ||
        (x > 19 && z > 11 && z < 22) ||
        (z > 20 && x > 8 && x < 18)
      )
        if (rng() < 0.5) kind = 'gold';
      if (
        (x >= 3 && x <= 5 && z >= 3 && z <= 6) ||
        (x >= 21 && x <= 23 && z >= 4 && z <= 7)
      )
        kind = 'water';
      s.tiles.push({
        x,
        z,
        kind,
        owned: false,
        marked: false,
        progress: 0,
        room: null,
        plannedRoom: null,
        trap: 0,
        door: 0,
        trapCooldown: 0,
        seen: false,
        gold: kind === 'gold' ? 600 : 0,
      });
    }
  function open(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    room: Room | null = null,
    owned = true,
  ) {
    for (let z = z1; z <= z2; z++)
      for (let x = x1; x <= x2; x++) {
        const t = s.tiles[idx(x, z)];
        Object.assign(t, { kind: 'floor', owned, room, seen: true });
      }
  }
  open(10, 11, 16, 17);
  open(7, 12, 9, 14, 'vault');
  open(11, 18, 13, 20, 'rest');
  open(15, 18, 17, 20, 'food');
  open(12, 8, 14, 10);
  open(12, 5, 14, 7, null, false);
  s.tiles[coreIndex].kind = 'core';
  s.tiles[idx(13, 8)].kind = 'portal';
  s.tiles[idx(13, 2)].kind = 'entry';
  s.tiles[idx(13, 2)].seen = true;
  // A narrow approach lets invaders reach the dungeon; workers may claim it later.
  open(13, 3, 13, 10, null, false);
  s.tiles[idx(13, 8)].kind = 'portal';
  s.tiles[idx(13, 8)].owned = true;
  for (const t of s.tiles) if (walkable(t)) reveal(s, idx(t.x, t.z));
  spawn(s, 'worker', 12, 13);
  spawn(s, 'worker', 14, 13);
  spawn(s, 'worker', 12, 15);
  spawn(s, 'worker', 14, 15);
  spawn(s, 'guard', 12, 18);
  spawn(s, 'guard', 16, 18);
  log(s, 'Die Glut erwacht. Markiere Erdreich, um dein Reich zu erweitern.');
  return s;
}
function reveal(s: GameState, i: number) {
  const t = s.tiles[i];
  for (let z = t.z - 2; z <= t.z + 2; z++)
    for (let x = t.x - 2; x <= t.x + 2; x++)
      if (inBounds(x, z)) s.tiles[idx(x, z)].seen = true;
}
export function findPath(
  s: GameState,
  start: number,
  goal: number,
  enemy = false,
): number[] {
  if (start === goal) return [];
  const q = [start],
    from = new Map<number, number>();
  from.set(start, -1);
  for (let k = 0; k < q.length; k++) {
    for (const n of adjacent(q[k])) {
      if (from.has(n) || !walkable(s.tiles[n])) continue;
      if (!enemy && s.tiles[n].door < 0) continue;
      from.set(n, q[k]);
      if (n === goal) {
        const out = [n];
        let p = q[k];
        while (p !== start) {
          out.push(p);
          p = from.get(p)!;
        }
        return out.reverse();
      }
      q.push(n);
    }
  }
  return [];
}
function nearest(
  s: GameState,
  u: Unit,
  predicate: (t: Tile) => boolean,
): number | null {
  const start = idx(Math.round(u.x), Math.round(u.z));
  const q = [start],
    visited = new Set(q);
  for (let k = 0; k < q.length; k++) {
    const n = q[k];
    if (predicate(s.tiles[n])) return n;
    for (const a of adjacent(n)) {
      if (visited.has(a) || !walkable(s.tiles[a])) continue;
      visited.add(a);
      q.push(a);
    }
  }
  return null;
}
function effect(s: GameState, t: Tile, type: Effect['type']) {
  s.effects.push({ x: t.x, z: t.z, type, life: 1 });
}
/** Shared by single-tile building and the area-plan preview; excludes price. */
export function roomBuildProblem(
  s: GameState,
  room: Room,
  i: number,
): string | null {
  const t = s.tiles[i];
  if (s.status !== 'playing') return 'Diese Expedition ist beendet.';
  if (
    !t ||
    !walkable(t) ||
    !t.owned ||
    t.kind === 'core' ||
    t.kind === 'portal'
  )
    return 'Wähle freigelegten Boden, den deine Schürflinge beansprucht haben.';
  if (t.room || t.trap || t.door) return 'Dieses Feld ist bereits bebaut.';
  if (room === 'forge' && !s.unlocked)
    return 'Die Werkstatt benötigt abgeschlossene Forschung.';
  if (roomLocked(s, room))
    return 'Dieser Raum benötigt abgeschlossene Forschung.';
  return null;
}
export function applyTool(
  s: GameState,
  tool: Tool,
  i: number,
): { ok: boolean; message?: string } {
  const t = s.tiles[i];
  if (!t || s.status !== 'playing') return { ok: false };
  if (tool === 'inspect') return { ok: true };
  if (tool === 'ritualBlessing') return invokeRitual(s);
  if (tool === 'dig') {
    if (!t.seen)
      return { ok: false, message: 'Dieses Gebiet ist noch nicht erkundet.' };
    if (!['earth', 'gold'].includes(t.kind))
      return { ok: false, message: 'Hier gibt es kein abbaubares Erdreich.' };
    t.marked = !t.marked;
    if (!t.marked) t.plannedRoom = null;
    s.revision++;
    return { ok: true };
  }
  if (tool === 'worker') {
    if (s.gold < 250) return { ok: false, message: 'Du benötigst 250 Gold.' };
    if (creatures(s).filter((u) => u.kind === 'worker').length >= 12)
      return { ok: false, message: 'Maximal 12 Schürflinge.' };
    s.gold -= 250;
    spawn(s, 'worker', 13, 15);
    log(s, 'Ein neuer Schürfling steht bereit.', 'good');
    return { ok: true };
  }
  if (tool === 'heal') {
    if (s.mana < 30) return { ok: false, message: 'Du benötigst 30 Mana.' };
    const targets = creatures(s).filter(
      (u) => u.id !== s.heldUnitId && Math.hypot(u.x - t.x, u.z - t.z) < 3,
    );
    const atCore = Math.hypot(t.x - 13, t.z - 14) < 3;
    if (!targets.length && !atCore)
      return {
        ok: false,
        message: 'Wirke Heilung in der Nähe deiner Bewohner oder der Glut.',
      };
    s.mana -= 30;
    targets.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 75)));
    if (atCore) s.coreHp = Math.min(1500, s.coreHp + 120);
    effect(s, t, 'heal');
    return { ok: true };
  }
  if (tool === 'bolt') {
    if (!s.unlocked)
      return {
        ok: false,
        message: 'Erforsche zuerst Sturmfunken im Runenarchiv.',
      };
    if (s.mana < 45) return { ok: false, message: 'Du benötigst 45 Mana.' };
    const targets = s.units.filter(
      (u) =>
        u.kind === 'invader' &&
        !u.prisoner &&
        Math.hypot(u.x - t.x, u.z - t.z) < 2.6,
    );
    if (!targets.length)
      return { ok: false, message: 'In diesem Gebiet stehen keine Gegner.' };
    s.mana -= 45;
    targets.forEach((u) => (u.hp -= 130));
    effect(s, t, 'bolt');
    return { ok: true };
  }
  if (tool === 'sell' && (t.plannedRoom || t.marked)) {
    t.plannedRoom = null;
    t.marked = false;
    t.progress = 0;
    s.revision++;
    return { ok: true, message: 'Auftrag entfernt.' };
  }
  if (!walkable(t) || !t.owned || t.kind === 'core' || t.kind === 'portal')
    return {
      ok: false,
      message:
        'Wähle freigelegten Boden, den deine Schürflinge beansprucht haben.',
    };
  if (tool === 'rally') {
    s.rally = i;
    army(s).forEach((u) => {
      u.path = [];
      u.target = null;
    });
    log(s, 'Deine Kämpfer sammeln sich am Banner.');
    return { ok: true };
  }
  if (tool === 'sell') {
    if (prisoners(s).some((u) => idx(Math.round(u.x), Math.round(u.z)) === i))
      return {
        ok: false,
        message: 'Versetze zuerst den Gefangenen auf diesem Feld.',
      };
    if (
      t.room === 'prison' &&
      prisoners(s).filter(
        (u) => s.tiles[idx(Math.round(u.x), Math.round(u.z))].room === 'prison',
      ).length > Math.floor((countRoom(s, 'prison') - 1) / 2)
    )
      return {
        ok: false,
        message: 'Für die Gefangenen werden diese Zellen noch benötigt.',
      };
    let refund = 0;
    if (t.room) {
      refund = ROOMS[t.room].cost * 0.5;
      t.room = null;
    } else if (t.trap) {
      refund = 80;
      t.trap = 0;
    } else if (t.door) {
      refund = 60;
      t.door = 0;
    } else return { ok: false, message: 'Hier steht nichts zum Verkaufen.' };
    s.gold = Math.min(capacity(s), s.gold + refund);
    s.revision++;
    return { ok: true };
  }
  if (tool === 'trap' || tool === 'door') {
    if (!s.unlocked)
      return { ok: false, message: 'Benötigt abgeschlossene Forschung.' };
    if (t.room || t.trap || t.door || t.plannedRoom)
      return { ok: false, message: 'Wähle einen freien Gang ohne Raumplan.' };
    if (s.forge < 1 || s.gold < 150)
      return { ok: false, message: 'Du benötigst 1 Werkstück und 150 Gold.' };
    s.gold -= 150;
    s.forge--;
    if (tool === 'trap') t.trap = 3;
    else t.door = 280;
    s.revision++;
    return { ok: true };
  }
  if (Object.hasOwn(ROOMS, tool)) {
    const r = tool as Room;
    const problem = roomBuildProblem(s, r, i);
    if (problem) return { ok: false, message: problem };
    if (s.gold < ROOMS[r].cost)
      return {
        ok: false,
        message: 'Dein Gold reicht für dieses Feld nicht aus.',
      };
    s.gold -= ROOMS[r].cost;
    t.room = r;
    t.plannedRoom = null;
    t.progress = 0;
    s.built++;
    s.revision++;
    effect(s, t, 'spawn');
    return { ok: true };
  }
  return { ok: false };
}
export function grabUnit(s: GameState, id: number) {
  const u = s.units.find((u) => u.id === id);
  if (
    s.status !== 'playing' ||
    s.heldUnitId !== null ||
    !u ||
    u.hp <= 0 ||
    (u.kind === 'invader' && !u.prisoner)
  )
    return false;
  s.heldUnitId = id;
  u.dropTimer = 0;
  u.path = [];
  u.target = null;
  u.state = 'In der Hand';
  return true;
}

export function cancelGrab(s: GameState) {
  const u = s.units.find((u) => u.id === s.heldUnitId);
  if (u) {
    // Coordinates stay at the pickup location until a valid drop is committed.
    u.state = 'Abgesetzt';
    u.path = [];
    u.target = null;
  }
  s.heldUnitId = null;
}

export function canDropUnit(s: GameState, i: number) {
  const t = s.tiles[i];
  const u = s.units.find((u) => u.id === s.heldUnitId);
  if (u?.prisoner) return validPrisonerCell(s, u, i);
  return !!t && t.seen && walkable(t);
}

export function slapUnit(s: GameState, id: number) {
  const u = s.units.find((u) => u.id === id);
  if (
    s.status !== 'playing' ||
    !u ||
    u.kind === 'invader' ||
    u.hp <= 0 ||
    u.id === s.heldUnitId
  )
    return false;
  u.hp = Math.max(1, u.hp - 3);
  u.mood = Math.max(0, u.mood - 5);
  u.energy = Math.min(100, u.energy + 4);
  s.effects.push({ x: u.x, z: u.z, type: 'hit', life: 0.4 });
  return true;
}

export function dropUnit(s: GameState, id: number, i: number) {
  const t = s.tiles[i],
    u = s.units.find(
      (u) => u.id === id && (u.kind !== 'invader' || u.prisoner),
    );
  if (!u || s.heldUnitId !== id || !canDropUnit(s, i)) return false;
  s.heldUnitId = null;
  u.x = t.x;
  u.z = t.z;
  u.path = [];
  u.target = null;
  u.state = 'Abgesetzt';
  u.dropTimer = 0.45;
  u.energy = Math.max(0, u.energy - 3);
  return true;
}
function validPrisonerCell(s: GameState, u: Unit, i: number) {
  const t = s.tiles[i];
  if (
    !t ||
    !t.seen ||
    !t.owned ||
    t.kind !== 'floor' ||
    !['prison', 'torment'].includes(t.room ?? '')
  )
    return false;
  const others = prisoners(s).filter((p) => p.id !== u.id);
  if (others.some((p) => idx(Math.round(p.x), Math.round(p.z)) === i))
    return false;
  return (
    t.room === 'torment' ||
    others.filter(
      (p) => s.tiles[idx(Math.round(p.x), Math.round(p.z))].room === 'prison',
    ).length < prisonCapacity(s)
  );
}
function captureDefeated(s: GameState, u: Unit) {
  if (u.prisoner) return;
  const goal = nearest(
    s,
    u,
    (t) => t.room === 'prison' && validPrisonerCell(s, u, idx(t.x, t.z)),
  );
  if (goal === null) return;
  const t = s.tiles[goal];
  u.prisoner = true;
  u.conversion = 0;
  u.hp = Math.max(1, Math.ceil(u.maxHp * 0.35));
  u.x = t.x;
  u.z = t.z;
  u.path = [];
  u.target = null;
  u.cooldown = 0;
  u.dropTimer = 0;
  u.state = 'Gefangen';
  s.captured++;
  effect(s, t, 'capture');
  log(s, 'Ein Sonnenritter wurde im Gefängnis gebunden.', 'good');
}
function tickPrisoners(s: GameState, dt: number, controlledId: number | null) {
  for (const u of prisoners(s)) {
    if (u.id === s.heldUnitId) continue;
    if (u.dropTimer > 0) {
      u.dropTimer = Math.max(0, u.dropTimer - dt);
      continue;
    }
    const t = s.tiles[idx(Math.round(u.x), Math.round(u.z))];
    if (t.room !== 'torment') {
      u.state = 'Gefangen';
      continue;
    }
    if (!s.unlocked || countRoom(s, 'torment') < 4) {
      u.state = 'Benötigt vier Folterfelder';
      continue;
    }
    const keeper = s.units.some(
      (v) =>
        v.kind === 'scholar' &&
        v.hp > 0 &&
        v.id !== s.heldUnitId &&
        v.id !== controlledId &&
        v.dropTimer <= 0 &&
        v.state === 'Leitet Folterritual' &&
        Math.hypot(v.x - u.x, v.z - u.z) < 0.65,
    );
    if (!keeper) {
      u.state = 'Wartet auf Runenweber';
      continue;
    }
    u.state = 'Widerstand schwindet';
    u.conversion = Math.min(100, u.conversion + (dt * 100) / 75);
    s.mana = Math.min(200, s.mana + dt * 0.4);
    if (Math.floor(s.time / 5) !== Math.floor((s.time - dt) / 5))
      effect(s, t, 'torment');
    if (u.conversion < 100) continue;
    if (
      army(s).length >= Math.floor(countRoom(s, 'rest') / 2) ||
      countRoom(s, 'food') < 4
    ) {
      u.state = 'Wartet auf Ruheplatz und Nahrung';
      continue;
    }
    u.prisoner = false;
    u.kind = 'guard';
    u.name = NAMES.guard;
    u.maxHp = 160 * (1 + (u.level - 1) * 0.22);
    u.hp = u.maxHp;
    u.hunger = 75;
    u.energy = 75;
    u.mood = 70;
    u.wage = 35;
    u.xp = 0;
    u.carry = 0;
    u.path = [];
    u.target = null;
    u.state = 'Übergelaufen';
    u.dropTimer = 0.45;
    s.converted++;
    effect(s, t, 'ritual');
    log(s, 'Ein Sonnenritter hat sich deinem Reich angeschlossen.', 'good');
  }
}
export function invokeRitual(s: GameState): { ok: boolean; message: string } {
  if (s.status !== 'playing')
    return { ok: false, message: 'Diese Expedition ist beendet.' };
  if (!s.unlocked || countRoom(s, 'ritual') < 4)
    return {
      ok: false,
      message: 'Erforsche die Runen und baue vier Ritualfelder.',
    };
  if (s.time < s.ritualReadyAt)
    return { ok: false, message: 'Der Aschensegen klingt noch ab.' };
  if (s.gold < 250) return { ok: false, message: 'Du benötigst 250 Gold.' };
  s.gold -= 250;
  s.ritualUntil = s.time + 60;
  s.ritualReadyAt = s.time + 120;
  const altar = s.tiles.find((t) => t.room === 'ritual')!;
  effect(s, altar, 'ritual');
  log(s, 'Aschensegen: Dein Reich erstarkt für 60 Sekunden.', 'good');
  return {
    ok: true,
    message: 'Aschensegen: Dein Reich erstarkt für 60 Sekunden.',
  };
}
function moveTo(
  s: GameState,
  u: Unit,
  i: number,
  dt: number,
  speed = 1.8,
): boolean {
  if (u.target !== i) {
    u.target = i;
    u.path = findPath(
      s,
      idx(Math.round(u.x), Math.round(u.z)),
      i,
      u.kind === 'invader',
    );
  }
  if (!u.path.length) {
    const destination = s.tiles[i];
    const distance = Math.hypot(u.x - destination.x, u.z - destination.z);
    if (distance < 0.06) {
      u.x = destination.x;
      u.z = destination.z;
      return true;
    }
    if (idx(Math.round(u.x), Math.round(u.z)) === i) {
      const step = Math.min(distance, dt * speed);
      u.x += ((destination.x - u.x) / distance) * step;
      u.z += ((destination.z - u.z) / distance) * step;
      return distance <= step;
    }
    return false;
  }
  const n = s.tiles[u.path[0]],
    dist = Math.hypot(n.x - u.x, n.z - u.z);
  if (u.kind === 'invader' && n.door > 0) {
    n.door -= dt * 24;
    u.state = 'Zerstört Pforte';
    if (n.door <= 0) {
      n.door = 0;
      s.revision++;
    }
    return false;
  }
  const step = dt * speed;
  if (dist <= step) {
    u.x = n.x;
    u.z = n.z;
    u.path.shift();
  } else {
    u.x += ((n.x - u.x) / dist) * step;
    u.z += ((n.z - u.z) / dist) * step;
  }
  return !u.path.length;
}
function workerTick(s: GameState, u: Unit, dt: number) {
  if (
    s.gold < capacity(s) &&
    (u.carry >= 200 || (u.carry > 0 && !s.tiles.some((t) => t.marked)))
  ) {
    const goal = nearest(s, u, (t) => t.room === 'vault' || t.kind === 'core');
    if (goal !== null) {
      u.state = 'Trägt Gold';
      if (moveTo(s, u, goal, dt)) {
        const deposit = Math.min(u.carry, Math.max(0, capacity(s) - s.gold));
        s.gold += deposit;
        u.carry -= deposit;
        u.target = null;
        if (deposit === 0) u.state = 'Goldlager voll';
      }
      return;
    }
  }
  // A claimed construction tile is a worker job. Planning itself reserves no gold.
  const building = nearest(
    s,
    u,
    (t) =>
      !!t.plannedRoom &&
      !roomBuildProblem(s, t.plannedRoom, idx(t.x, t.z)) &&
      s.gold >= ROOMS[t.plannedRoom].cost,
  );
  if (building !== null) {
    const t = s.tiles[building];
    u.state = 'Errichtet Raum';
    if (moveTo(s, u, building, dt, 2)) {
      t.progress += dt;
      if (t.progress >= 1.4 && t.plannedRoom) {
        const result = applyTool(s, t.plannedRoom, building);
        if (result.ok) u.target = null;
      }
    }
    return;
  }
  // Keep a chosen dig job while walking; select only reachable exposed faces.
  const jobs = s.tiles.filter(
    (t) =>
      t.marked && (t.kind === 'earth' || (t.kind === 'gold' && u.carry < 200)),
  );
  jobs.sort(
    (a, b) =>
      Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
  );
  for (const t of jobs) {
    const face = adjacent(idx(t.x, t.z))
      .filter((i) => walkable(s.tiles[i]))
      .sort(
        (a, b) =>
          Math.hypot(s.tiles[a].x - u.x, s.tiles[a].z - u.z) -
          Math.hypot(s.tiles[b].x - u.x, s.tiles[b].z - u.z),
      )
      .find(
        (i) =>
          i === idx(Math.round(u.x), Math.round(u.z)) ||
          findPath(s, idx(Math.round(u.x), Math.round(u.z)), i).length,
      );
    if (face === undefined) continue;
    u.state = t.kind === 'gold' ? 'Baut Gold ab' : 'Gräbt';
    if (moveTo(s, u, face, dt, 2.1)) {
      t.progress += dt * (t.kind === 'gold' ? 0.21 : 0.3);
      if (t.progress >= 1) {
        if (t.kind === 'gold') {
          const amount = Math.min(200, t.gold);
          u.carry += amount;
          t.gold -= amount;
          s.mined += amount;
          t.progress = 0;
          effect(s, t, 'gold');
          if (t.gold > 0) return;
        }
        t.kind = 'floor';
        t.marked = false;
        t.owned = false;
        t.progress = 0;
        s.explored++;
        s.revision++;
        reveal(s, idx(t.x, t.z));
        effect(s, t, 'dig');
        u.target = null;
      }
    }
    return;
  }
  const unclaimed = nearest(
    s,
    u,
    (t) => walkable(t) && !t.owned && t.kind !== 'entry',
  );
  if (unclaimed !== null) {
    u.state = 'Beansprucht Boden';
    if (moveTo(s, u, unclaimed, dt, 2)) {
      s.tiles[unclaimed].progress += dt;
      if (s.tiles[unclaimed].progress > 1) {
        s.tiles[unclaimed].owned = true;
        s.tiles[unclaimed].progress = 0;
        reveal(s, unclaimed);
        s.revision++;
        u.target = null;
      }
    }
    return;
  }
  if (
    s.tiles.some(
      (t) =>
        t.plannedRoom &&
        t.owned &&
        t.kind === 'floor' &&
        s.gold < ROOMS[t.plannedRoom].cost,
    )
  ) {
    u.state = 'Wartet auf Baugold';
    return;
  }
  if (u.carry >= 200 && s.gold >= capacity(s)) {
    u.state = 'Goldlager voll';
    return;
  }
  u.state = 'Wartet auf Arbeit';
  if (u.target !== null) moveTo(s, u, u.target, dt);
  else if ((Math.floor(s.time) + u.id) % 7 === 0) {
    const goal = nearest(
      s,
      { ...u, x: 11 + (u.id % 5), z: 13 + (u.id % 3) },
      (t) => t.owned && walkable(t),
    );
    if (goal !== null) moveTo(s, u, goal, dt);
  }
}
function lineOfSight(s: GameState, a: Unit, b: Unit) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.ceil(distance * 5);
  for (let j = 1; j < steps; j++) {
    const x = Math.round(a.x + ((b.x - a.x) * j) / steps),
      z = Math.round(a.z + ((b.z - a.z) * j) / steps);
    if (!inBounds(x, z) || !walkable(s.tiles[idx(x, z)])) return false;
  }
  return true;
}
function combat(s: GameState, u: Unit, dt: number): boolean {
  const foes = s.units.filter(
    (v) =>
      v.hp > 0 &&
      !v.prisoner &&
      v.id !== s.heldUnitId &&
      v.dropTimer <= 0 &&
      (u.kind === 'invader' ? v.kind !== 'invader' : v.kind === 'invader'),
  );
  foes.sort(
    (a, b) =>
      Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
  );
  const enemy = foes[0];
  if (
    enemy &&
    Math.hypot(enemy.x - u.x, enemy.z - u.z) <
      (u.kind === 'invader' ? 5.5 : u.kind === 'worker' ? 1.2 : 7)
  ) {
    const distance = Math.hypot(enemy.x - u.x, enemy.z - u.z);
    const range = u.kind === 'scholar' ? 3.1 : 1.2;
    u.state = 'Im Kampf';
    if (distance > range || !lineOfSight(s, u, enemy)) {
      moveTo(s, u, idx(Math.round(enemy.x), Math.round(enemy.z)), dt, 2);
    } else if (u.cooldown <= 0) {
      const damage =
        { worker: 4, guard: 21, scholar: 17, brute: 35, invader: 15 }[u.kind] *
        (1 + (u.level - 1) * 0.28);
      enemy.hp -=
        damage * (u.kind !== 'invader' && s.ritualUntil > s.time ? 1.2 : 1);
      u.cooldown = 0.9;
      s.effects.push({
        x: enemy.x,
        z: enemy.z,
        type: u.kind === 'scholar' ? 'bolt' : 'hit',
        life: 0.45,
      });
      u.xp += 1;
    }
    return true;
  }
  return false;
}
function residentTick(s: GameState, u: Unit, dt: number) {
  let room: Room | null = null;
  if (u.hunger < 38 || (u.state === 'Isst' && u.hunger < 95)) room = 'food';
  else if (
    u.energy < 30 ||
    u.hp < u.maxHp * 0.5 ||
    (u.state === 'Schläft' && u.energy < 95)
  )
    room = 'rest';
  if (room) {
    const goal = nearest(s, u, (t) => t.room === room);
    if (goal !== null) {
      u.state = room === 'food' ? 'Isst' : 'Schläft';
      if (moveTo(s, u, goal, dt)) {
        if (room === 'food') u.hunger = Math.min(100, u.hunger + dt * 13);
        else {
          u.energy = Math.min(100, u.energy + dt * 9);
          u.hp = Math.min(u.maxHp, u.hp + dt * 3);
        }
      }
      return;
    }
  }
  if (s.rally !== null && u.kind !== 'worker') {
    u.state = 'Sammelt sich';
    moveTo(s, u, s.rally, dt);
    return;
  }
  if (u.kind === 'worker') {
    workerTick(s, u, dt);
    return;
  }
  if (u.kind === 'scholar' && s.unlocked && countRoom(s, 'torment') >= 4) {
    const goal = nearest(
      s,
      u,
      (t) =>
        t.room === 'torment' &&
        t.owned &&
        prisoners(s).some(
          (p) => p.id !== s.heldUnitId && p.x === t.x && p.z === t.z,
        ),
    );
    if (goal !== null) {
      u.state = 'Leitet Folterritual';
      moveTo(s, u, goal, dt);
      return;
    }
  }
  if (
    s.unlocked &&
    countRoom(s, 'forge') > 0 &&
    s.forge < 12 &&
    u.kind === 'brute'
  )
    room = 'forge';
  else if (u.kind === 'scholar' && countRoom(s, 'library')) room = 'library';
  else if (countRoom(s, 'training')) room = 'training';
  if (room) {
    const goal = nearest(s, u, (t) => t.room === room);
    if (goal !== null) {
      u.state =
        room === 'library'
          ? 'Erforscht Runen'
          : room === 'forge'
            ? 'Schmiedet'
            : 'Trainiert';
      if (moveTo(s, u, goal, dt)) {
        if (room === 'library') {
          s.research = Math.min(100, s.research + dt * 0.55);
          s.mana = Math.min(200, s.mana + dt * 0.35);
        } else if (room === 'forge')
          s.forge = Math.min(12, s.forge + dt * 0.025);
        else if (s.gold > 0) {
          s.gold = Math.max(0, s.gold - dt * 1.2);
          u.xp += dt * 1.4;
        }
      }
      return;
    }
  }
  u.state = 'Patrouilliert';
  if (u.target === null || !u.path.length) {
    const tiles = s.tiles.filter((t) => t.owned && walkable(t));
    const t = tiles[(u.id * 31 + Math.floor(s.time / 4) * 17) % tiles.length];
    moveTo(s, u, idx(t.x, t.z), dt, 1.1);
  } else moveTo(s, u, u.target, dt, 1.1);
}
export function tick(
  s: GameState,
  dt: number,
  controlledId: number | null = null,
) {
  if (s.status !== 'playing') return;
  dt = Math.min(dt, 0.25);
  s.time += dt;
  s.mana = Math.min(200, s.mana + dt * 0.7);
  if (s.ritualUntil > s.time) s.mana = Math.min(200, s.mana + dt * 2);
  s.effects = s.effects.filter((e) => (e.life -= dt) > 0);
  for (const t of s.tiles)
    if (t.trapCooldown > 0) t.trapCooldown = Math.max(0, t.trapCooldown - dt);
  for (const u of s.units) {
    if (u.hp <= 0 || u.id === s.heldUnitId) continue;
    if (u.prisoner) continue;
    if (u.dropTimer > 0) {
      u.dropTimer = Math.max(0, u.dropTimer - dt);
      continue;
    }
    u.cooldown -= dt;
    if (u.kind !== 'invader') {
      u.hunger = Math.max(0, u.hunger - dt * 0.25);
      u.energy = Math.max(0, u.energy - dt * 0.17);
      u.mood = Math.max(
        0,
        Math.min(
          100,
          u.mood + dt * (u.hunger < 15 || u.energy < 12 ? -0.7 : 0.06),
        ),
      );
      if (u.hunger === 0) u.hp -= dt * 0.6;
      if (s.ritualUntil > s.time) u.mood = Math.min(100, u.mood + dt * 0.4);
    }
    if (u.kind === 'invader') {
      const t = s.tiles[idx(Math.round(u.x), Math.round(u.z))];
      if (t.trap > 0 && t.trapCooldown <= 0) {
        u.hp -= 95;
        t.trap--;
        t.trapCooldown = 1;
        effect(s, t, 'bolt');
        s.revision++;
        if (u.hp <= 0) continue;
      }
    }
    if (u.xp >= 60 * u.level && u.level < 8) {
      u.xp = 0;
      u.level++;
      u.maxHp += 22;
      u.hp = Math.min(u.maxHp, u.hp + 40);
      log(s, `${u.name} erreicht Stufe ${u.level}.`, 'good');
    }
    if (u.id === controlledId) {
      const close = s.units.some(
        (v) =>
          v.kind === 'invader' &&
          !v.prisoner &&
          Math.hypot(v.x - u.x, v.z - u.z) < 1.2,
      );
      if (close) combat(s, u, dt);
      continue;
    }
    if (combat(s, u, dt)) continue;
    if (u.kind === 'invader') {
      u.state = 'Zieht zur Glut';
      if (moveTo(s, u, coreIndex, dt, 1.25) && u.cooldown <= 0) {
        s.coreHp -= 24 * (1 + 0.15 * (u.level - 1));
        u.cooldown = 1;
        s.effects.push({ x: 13, z: 14, type: 'hit', life: 0.6 });
      }
    } else residentTick(s, u, dt);
    if (u.xp >= 60 * u.level && u.level < 8) {
      u.xp = 0;
      u.level++;
      u.maxHp += 22;
      u.hp = Math.min(u.maxHp, u.hp + 40);
      log(s, `${u.name} erreicht Stufe ${u.level}.`, 'good');
    }
  }
  const dead = s.units.filter((u) => u.hp <= 0);
  for (const u of dead) {
    if (u.kind === 'invader' && !u.prisoner) {
      s.kills++;
      s.gold = Math.min(capacity(s), s.gold + 90);
      captureDefeated(s, u);
    } else log(s, `${u.name} ist gefallen.`, 'warn');
  }
  s.units = s.units.filter((u) => u.hp > 0);
  tickPrisoners(s, dt, controlledId);
  if (s.time >= s.nextArrival) {
    s.nextArrival = s.time + 38;
    const roomCapacity = Math.floor(countRoom(s, 'rest') / 2);
    if (army(s).length < roomCapacity && countRoom(s, 'food') >= 4) {
      let kind: UnitKind =
        countRoom(s, 'library') >= 4 &&
        !s.units.some((u) => u.kind === 'scholar')
          ? 'scholar'
          : s.unlocked &&
              countRoom(s, 'training') >= 6 &&
              !s.units.some((u) => u.kind === 'brute')
            ? 'brute'
            : 'guard';
      spawn(s, kind, 13, 8);
      log(s, `${NAMES[kind]} tritt durch das Tiefentor.`, 'good');
    }
  }
  if (s.time >= s.nextPayday) {
    s.nextPayday += 100;
    const wages = creatures(s).reduce((a, u) => a + u.wage, 0);
    if (s.gold >= wages) {
      s.gold -= wages;
      log(s, `Zahltag: ${wages} Gold an deine Bewohner.`);
    } else {
      creatures(s).forEach((u) => (u.mood = Math.max(0, u.mood - 30)));
      log(s, 'Leere Kassen. Deine Bewohner warten auf ihren Lohn.', 'warn');
    }
  }
  const departed = creatures(s).filter(
    (u) => u.mood <= 0 && u.id !== s.heldUnitId,
  );
  if (departed.length) {
    s.units = s.units.filter(
      (u) => u.mood > 0 || u.kind === 'invader' || u.id === s.heldUnitId,
    );
    log(s, 'Unzufriedene Bewohner haben dein Reich verlassen.', 'warn');
  }
  if (s.research >= 100 && !s.unlocked) {
    s.unlocked = true;
    log(
      s,
      'Runen entziffert: Sturmfunken, Fangrune und Werkstatt freigeschaltet.',
      'good',
    );
  }
  if (!s.unlocked && countRoom(s, 'library') > 0)
    s.research = Math.min(100, s.research + dt * 0.08);
  if (s.time >= s.nextWave && s.wave < 4) {
    s.wave++;
    const count =
      s.wave * 2 +
      (s.difficulty === 'hard' ? 3 : s.difficulty === 'relaxed' ? 0 : 1);
    for (let i = 0; i < count; i++)
      spawn(
        s,
        'invader',
        13 + (i % 2) * 0.3,
        2 + (i % 3) * 0.2,
        Math.max(1, s.wave - 1),
      );
    s.nextWave =
      s.time +
      (s.difficulty === 'relaxed' ? 240 : s.difficulty === 'hard' ? 130 : 180);
    log(
      s,
      s.wave === 4
        ? 'Der Sonnenmarsch ist hier. Halte der letzten Belagerung stand!'
        : `Angriff ${s.wave}/4: Sonnenritter dringen in dein Reich ein.`,
      'warn',
    );
  }
  if (s.coreHp <= 0) {
    s.coreHp = 0;
    s.status = 'lost';
    log(s, 'Die letzte Glut ist erloschen.', 'warn');
  } else if (s.wave === 4 && !hostiles(s).length) {
    s.status = 'won';
    log(s, 'Der Sonnenmarsch ist gebrochen. Die Tiefe gehört dir.', 'good');
  }
  s.tutorial =
    s.explored === 0
      ? 0
      : countRoom(s, 'training') < 4
        ? 1
        : countRoom(s, 'library') < 4
          ? 2
          : !s.unlocked
            ? 3
            : s.wave < 4
              ? 4
              : 5;
}
export const SAVE_KEY = 'kluftkrone-save-v1';
export function serialize(s: GameState) {
  // Pointer gestures are transient: a saved carried resident returns safely to its origin.
  return JSON.stringify({
    ...s,
    heldUnitId: null,
    effects: [],
    units: s.units.map((u) => ({
      ...u,
      dropTimer: 0,
      state: u.id === s.heldUnitId ? 'Abgesetzt' : u.state,
    })),
  });
}
export function deserialize(raw: string): GameState | null {
  try {
    const s = JSON.parse(raw);
    if (
      s?.version !== 1 ||
      !Array.isArray(s.tiles) ||
      s.tiles.length !== SIZE * SIZE ||
      !Array.isArray(s.units) ||
      s.units.length > 300 ||
      !['playing', 'won', 'lost'].includes(s.status)
    )
      return null;
    const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
    for (const key of [
      'captured',
      'converted',
      'ritualUntil',
      'ritualReadyAt',
    ]) {
      if (s[key] === undefined) s[key] = 0;
      if (!finite(s[key]) || s[key] < 0 || s[key] > 100000000) return null;
    }
    for (const u of s.units) {
      if (!u) return null;
      if (u.prisoner === undefined) u.prisoner = false;
      if (u.conversion === undefined) u.conversion = 0;
      if (
        typeof u.prisoner !== 'boolean' ||
        !finite(u.conversion) ||
        u.conversion < 0 ||
        u.conversion > 100 ||
        (u.prisoner && u.kind !== 'invader')
      )
        return null;
    }
    for (const key of [
      'gold',
      'mana',
      'coreHp',
      'time',
      'wave',
      'nextWave',
      'nextArrival',
      'nextPayday',
      'research',
      'forge',
      'id',
      'seed',
      'revision',
      'mined',
      'kills',
      'built',
      'explored',
      'tutorial',
    ])
      if (!finite(s[key])) return null;
    if (
      !['relaxed', 'normal', 'hard'].includes(s.difficulty) ||
      !Array.isArray(s.messages) ||
      s.messages.length > 30
    )
      return null;
    const kinds = [
      'rock',
      'earth',
      'gold',
      'floor',
      'core',
      'portal',
      'entry',
      'water',
    ];
    if (
      s.tiles.some(
        (t: Tile, i: number) =>
          !t ||
          t.x !== i % SIZE ||
          t.z !== Math.floor(i / SIZE) ||
          !kinds.includes(t.kind) ||
          ![t.progress, t.trap, t.door, t.gold].every(finite) ||
          (t.room !== null && !Object.hasOwn(ROOMS, t.room)) ||
          (t.plannedRoom !== undefined &&
            t.plannedRoom !== null &&
            (typeof t.plannedRoom !== 'string' ||
              !Object.hasOwn(ROOMS, t.plannedRoom) ||
              !['earth', 'gold', 'floor'].includes(t.kind) ||
              !!t.room ||
              !!t.trap ||
              !!t.door ||
              !t.seen)),
      )
    )
      return null;
    if (
      s.units.some(
        (u: Unit) =>
          !u ||
          !Object.hasOwn(NAMES, u.kind) ||
          ![
            u.x,
            u.z,
            u.hp,
            u.maxHp,
            u.hunger,
            u.energy,
            u.mood,
            u.level,
            u.xp,
            u.carry,
            u.cooldown,
            u.id,
            u.wage,
          ].every(finite) ||
          u.x < 0 ||
          u.x > SIZE - 1 ||
          u.z < 0 ||
          u.z > SIZE - 1 ||
          !Array.isArray(u.path) ||
          u.path.some((i) => !Number.isInteger(i) || i < 0 || i >= SIZE * SIZE),
      )
    )
      return null;
    if (
      s.rally !== null &&
      (!Number.isInteger(s.rally) ||
        s.rally < 0 ||
        s.rally >= SIZE * SIZE ||
        !walkable(s.tiles[s.rally]) ||
        !s.tiles[s.rally].owned)
    )
      return null;
    if (
      s.gold < 0 ||
      s.gold > 1000000 ||
      s.mana < 0 ||
      s.mana > 200 ||
      s.coreHp < 0 ||
      s.coreHp > 1500 ||
      s.time < 0 ||
      !Number.isInteger(s.wave) ||
      s.wave < 0 ||
      s.wave > 4 ||
      s.research < 0 ||
      s.research > 100 ||
      s.tutorial < 0 ||
      s.tutorial > 5 ||
      !Number.isInteger(s.tutorial)
    )
      return null;
    if (
      s.messages.some(
        (m: Message) =>
          !m ||
          !finite(m.id) ||
          !finite(m.time) ||
          typeof m.text !== 'string' ||
          m.text.length > 500 ||
          !['info', 'warn', 'good'].includes(m.tone),
      )
    )
      return null;
    if (
      s.units.some(
        (u: Unit) =>
          u.wage < 0 ||
          u.wage > 1000 ||
          u.hp < 0 ||
          u.maxHp <= 0 ||
          u.hunger < 0 ||
          u.hunger > 100 ||
          u.energy < 0 ||
          u.energy > 100 ||
          u.mood < 0 ||
          u.mood > 100 ||
          !Number.isInteger(u.level) ||
          u.level < 1 ||
          u.level > 8 ||
          typeof u.name !== 'string' ||
          typeof u.state !== 'string',
      )
    )
      return null;
    if (typeof s.unlocked !== 'boolean' || typeof s.portalClaimed !== 'boolean')
      return null;
    if (
      s.ritualUntil > s.time + 60.001 ||
      s.ritualReadyAt > s.time + 120.001 ||
      s.ritualUntil > s.ritualReadyAt ||
      !Number.isInteger(s.captured) ||
      !Number.isInteger(s.converted)
    )
      return null;
    const occupiedCells = new Set<number>();
    for (const u of prisoners(s)) {
      if (u.hp <= 0) return null;
      const i = idx(Math.round(u.x), Math.round(u.z)),
        t = s.tiles[i];
      if (
        !t ||
        !t.owned ||
        !t.seen ||
        t.kind !== 'floor' ||
        !['prison', 'torment'].includes(t.room ?? '') ||
        occupiedCells.has(i) ||
        u.x !== t.x ||
        u.z !== t.z
      )
        return null;
      occupiedCells.add(i);
    }
    if (
      prisoners(s).filter(
        (u) => s.tiles[idx(Math.round(u.x), Math.round(u.z))].room === 'prison',
      ).length > prisonCapacity(s)
    )
      return null;
    s.tiles.forEach((t: Tile) => {
      t.trapCooldown = 0;
      t.plannedRoom ??= null;
      if (t.plannedRoom && ['earth', 'gold'].includes(t.kind)) t.marked = true;
    });
    s.units.forEach((u: Unit) => {
      u.path = [];
      u.target = null;
      u.dropTimer = 0;
      if (u.id === s.heldUnitId) u.state = 'Abgesetzt';
    });
    s.heldUnitId = null;
    s.effects = [];
    s.revision++;
    return s as GameState;
  } catch {
    return null;
  }
}
