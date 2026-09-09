import {
  SIZE,
  ROOMS,
  applyTool,
  roomBuildProblem,
  type GameState,
  type Room,
  type Tool,
} from './game';

export interface ConstructionSelection {
  room: Room;
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
