import { SIZE, ROOMS, type GameState, type Tool } from './game';
import { translate, type Locale } from './i18n';
interface Context {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function registerGameTools(
  api: {
    state: () => GameState;
    act: (tool: Tool, indices: number[]) => unknown;
    pause: () => boolean;
  },
  locale: Locale = 'de',
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools = [
    {
      name: 'read_dungeon',
      title: 'Reich ansehen',
      description:
        'Read live resources, units, objectives and all explored tile coordinates in the current Kluftkrone game.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const s = api.state();
        return {
          gold: s.gold,
          mana: s.mana,
          coreHp: s.coreHp,
          wave: s.wave,
          time: s.time,
          status: s.status,
          units: s.units.map(({ id, kind, x, z, state }) => ({
            id,
            kind,
            x,
            z,
            state: translate(state, locale),
          })),
          tiles: s.tiles
            .filter((t) => t.seen)
            .map(({ x, z, kind, room, owned, marked, plannedRoom }) => ({
              x,
              z,
              kind,
              room,
              owned,
              marked,
              plannedRoom,
            })),
        };
      },
    },
    {
      name: 'apply_dungeon_orders',
      title: 'Bauaufträge ausführen',
      description:
        'Toggle excavation designations or immediately construct room fields on already claimed ground at explicit coordinates. Room batches skip blocked tiles and require enough gold for all valid tiles; insufficient gold builds nothing. This immediate operation is separate from the HUD future-room queue.',
      inputSchema: {
        type: 'object',
        properties: {
          tool: { type: 'string', enum: ['dig', ...Object.keys(ROOMS)] },
          tiles: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              properties: {
                x: { type: 'integer', minimum: 0, maximum: SIZE - 1 },
                z: { type: 'integer', minimum: 0, maximum: SIZE - 1 },
              },
              required: ['x', 'z'],
              additionalProperties: false,
            },
          },
        },
        required: ['tool', 'tiles'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        const value = input as {
          tool: Tool;
          tiles: { x: number; z: number }[];
        };
        if (
          !value ||
          !['dig', ...Object.keys(ROOMS)].includes(value.tool) ||
          !Array.isArray(value.tiles) ||
          value.tiles.length < 1 ||
          value.tiles.length > 100 ||
          value.tiles.some(
            (t) =>
              !t ||
              !Number.isInteger(t.x) ||
              !Number.isInteger(t.z) ||
              t.x < 0 ||
              t.x >= SIZE ||
              t.z < 0 ||
              t.z >= SIZE,
          )
        )
          throw new Error(
            'Invalid order: provide supported tool and 1–100 in-bounds coordinates.',
          );
        return api.act(value.tool, [
          ...new Set(value.tiles.map((t) => t.z * SIZE + t.x)),
        ]);
      },
    },
    {
      name: 'pause_dungeon',
      title: 'Reich pausieren',
      description: 'Pause the live dungeon simulation for planning.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => ({ paused: api.pause() }),
    },
  ];
  for (const tool of tools)
    try {
      void Promise.resolve(
        context.registerTool(
          { ...tool, title: translate(tool.title, locale) },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Browsers without a working registry retain all manual controls. */
    }
  return () => lifecycle.abort();
}
