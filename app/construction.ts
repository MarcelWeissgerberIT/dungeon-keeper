import {
  SIZE,
  ROOMS,
  applyTool,
  roomBuildProblem,
  roomLocked,
  type GameState,
  type Room,
  type Tool,
} from './game';

export type DesignationTool = Room | 'dig';
export const isDesignationTool = (tool: Tool): tool is DesignationTool =>
  tool === 'dig' || isRoomTool(tool);

export interface ConstructionSelection {
  room: DesignationTool;
  indices: number[];
  dragging: boolean;
}
export const isRoomTool = (tool: Tool): tool is Room =>
  Object.hasOwn(ROOMS, tool);

export function rectangleIndices(
  start: number | null,
  end: number | null,
): number[] {
  if (
    start === null ||
    end === null ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0 ||
    start >= SIZE * SIZE ||
    end >= SIZE * SIZE
  )
    return [];
  const ax = start % SIZE,
    az = Math.floor(start / SIZE),
    bx = end % SIZE,
    bz = Math.floor(end / SIZE);
  const result: number[] = [];
  for (let z = Math.min(az, bz); z <= Math.max(az, bz); z++)
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      result.push(x + z * SIZE);
  return result;
}

/** A quote never changes the dungeon. Gold is checked for the entire valid area. */
export function quoteConstruction(s: GameState, room: Room, indices: number[]) {
  const selected = [...new Set(indices)].filter(
    (i) => Number.isInteger(i) && i >= 0 && i < s.tiles.length,
  );
  const valid: number[] = [],
    blocked: number[] = [];
  let reason = '';
  for (const i of selected) {
    const problem = roomBuildProblem(s, room, i);
    if (problem) {
      blocked.push(i);
      reason ||= problem;
    } else valid.push(i);
  }
  const xs = selected.map((i) => i % SIZE),
    zs = selected.map((i) => Math.floor(i / SIZE));
  const cost = valid.length * ROOMS[room].cost;
  return {
    selected,
    valid,
    blocked,
    reason,
    cost,
    width: selected.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0,
    depth: selected.length ? Math.max(...zs) - Math.min(...zs) + 1 : 0,
    shortfall: Math.max(0, cost - Math.floor(s.gold)),
    canBuild: valid.length > 0 && s.gold >= cost && s.status === 'playing',
  };
}

export function commitConstruction(
  s: GameState,
  room: Room,
  indices: number[],
) {
  // Recheck current terrain, research and treasury: a plan can outlive a payday.
  const quote = quoteConstruction(s, room, indices);
  if (!quote.canBuild)
    return {
      built: 0,
      message: quote.shortfall
        ? 'Nicht genug Gold für den gesamten Bauplan.'
        : quote.reason || 'Keine bebaubaren Felder ausgewählt.',
    };
  for (const i of quote.valid) applyTool(s, room, i);
  return { built: quote.valid.length, message: 'Bauplan errichtet.' };
}

/** A future room may occupy known earth/gold or cleared, as-yet unclaimed floor. */
export function quoteDesignation(
  s: GameState,
  tool: DesignationTool,
  indices: number[],
) {
  const selected = [...new Set(indices)].filter(
    (i) => Number.isInteger(i) && i >= 0 && i < s.tiles.length,
  );
  const valid: number[] = [],
    blocked: number[] = [],
    excavate: number[] = [],
    claim: number[] = [],
    ready: number[] = [];
  let reason = '';
  for (const i of selected) {
    const t = s.tiles[i];
    const problem =
      s.status !== 'playing'
        ? 'Diese Expedition ist beendet.'
        : !t.seen
          ? 'Dieses Gebiet ist noch nicht erkundet.'
          : t.room || t.trap || t.door
            ? 'Dieses Feld ist bereits bebaut.'
            : !['earth', 'gold', 'floor'].includes(t.kind)
              ? 'Fels, Wasser und besondere Orte bleiben frei.'
              : tool === 'dig' && t.kind === 'floor' && !t.plannedRoom
                ? 'Hier ist bereits ausgegraben.'
                : tool === 'forge' && !s.unlocked
                  ? 'Die Werkstatt benötigt abgeschlossene Forschung.'
                  : roomLocked(s, tool)
                    ? 'Dieser Raum benötigt abgeschlossene Forschung.'
                    : '';
    if (problem) {
      blocked.push(i);
      reason ||= problem;
      continue;
    }
    valid.push(i);
    if (t.kind !== 'floor') excavate.push(i);
    else if (!t.owned) claim.push(i);
    else ready.push(i);
  }
  const xs = selected.map((i) => i % SIZE),
    zs = selected.map((i) => Math.floor(i / SIZE));
  const cost = tool === 'dig' ? 0 : valid.length * ROOMS[tool].cost;
  return {
    selected,
    valid,
    blocked,
    excavate,
    claim,
    ready,
    cost,
    reason,
    width: selected.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0,
    depth: selected.length ? Math.max(...zs) - Math.min(...zs) + 1 : 0,
    shortfall: Math.max(0, cost - Math.floor(s.gold)),
    canPlan: valid.length > 0 && s.status === 'playing',
    existing: selected.filter(
      (i) => s.tiles[i].marked || s.tiles[i].plannedRoom,
    ),
  };
}

/** Idempotent designations; changing the future room replaces the old order. */
export function queueDesignation(
  s: GameState,
  tool: DesignationTool,
  indices: number[],
) {
  const quote = quoteDesignation(s, tool, indices);
  if (!quote.canPlan)
    return {
      queued: 0,
      message: quote.reason || 'Keine geeigneten Felder ausgewählt.',
    };
  for (const i of quote.valid) {
    const t = s.tiles[i],
      room = tool === 'dig' ? null : tool;
    if (t.kind === 'floor' && t.plannedRoom !== room) t.progress = 0;
    t.plannedRoom = room;
    t.marked = t.kind === 'earth' || t.kind === 'gold';
  }
  s.revision++;
  return {
    queued: quote.valid.length,
    message:
      tool === 'dig'
        ? 'Grabungsauftrag gesetzt.'
        : 'Raumplan gesetzt. Deine Schürflinge übernehmen den Ausbau.',
  };
}

export function cancelDesignations(s: GameState, indices: number[]) {
  if (s.status !== 'playing') return 0;
  let removed = 0;
  for (const i of new Set(indices)) {
    const t = s.tiles[i];
    if (!t || (!t.marked && !t.plannedRoom)) continue;
    t.marked = false;
    t.plannedRoom = null;
    t.progress = 0;
    removed++;
  }
  if (removed) s.revision++;
  return removed;
}
