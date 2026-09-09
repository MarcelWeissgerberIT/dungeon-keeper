const LAST_SEED_KEY = 'kluftkrone-last-map-seed';
const usedSeeds = new Set<number>();

/** Fresh worlds use 32-bit entropy; explicit game seeds remain reproducible. */
export function freshMapSeed(previous?: number): number {
  let stored: number | undefined;
  try {
    const raw = globalThis.localStorage?.getItem(LAST_SEED_KEY);
    if (raw !== null && raw !== undefined) stored = Number(raw);
  } catch {
    /* Storage can be disabled without preventing a new game. */
  }
  let seed = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 0x100000000);
  while (seed === previous || usedSeeds.has(seed) || seed === stored)
    seed = (seed + 1) >>> 0;
  usedSeeds.add(seed);
  try {
    globalThis.localStorage?.setItem(LAST_SEED_KEY, String(seed));
  } catch {}
  return seed;
}
