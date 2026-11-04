// ---------- util/random: a seeded generator, the same run of draws for a seed; a seed from a text; a pick from a list, each as likely or by its weight; draws kept to draw again; a seeded source of draws, each play a seed of its own ----------
// mulberry32 (Tommy Ettinger's): a 32-bit state, stepped and scrambled at each draw.
// Small and fast: enough for a game's or a sequencer's choices, not for anything secret.

// a play's draws: its seed, and the generator made with it
export interface PlayDraws {
  seed: number;
  random: () => number;
}

const SEEDS = 2 ** 32; // how many seeds there are: mulberry32's state, 32 bits
const FNV_OFFSET = 2166136261; // FNV-1a's start and prime, 32 bits
const FNV_PRIME = 16777619;

// a generator from a seed: the same seed, the same numbers, each in [0, 1)
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
// a seed from a text, the same text the same seed: FNV-1a, each character xored in, then multiplied by a prime
export function seedOf(text: string): number {
  let hash = FNV_OFFSET;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}
// an item from a list, each as likely, by the random given; none from an empty list
export function pickFrom<Item>(list: readonly Item[], random: () => number = Math.random): Item | undefined {
  return list[Math.floor(random() * list.length)];
}
// an item from a list, each as likely as its weight, by the random given; none from an empty list
export function pickWeighted<Item>(
  list: readonly Item[],
  weightOf: (item: Item) => number,
  random: () => number = Math.random,
): Item | undefined {
  const weights = list.map(weightOf);
  const sum = weights.reduce((total, weight) => total + weight, 0);
  let pick = random() * sum;
  for (let i = 0; i < list.length; i++) {
    if ((pick -= weights[i]!) <= 0) {
      return list[i];
    }
  }
  return list.at(-1); // a sum's rounding left over: the last
}
// A source of random draws kept as it draws, so a plan made again draws the same (a note's, an FX module's).
// again(): a source handing them back in turn, then fresh ones once they've run out.
export function keptDraws(random: () => number): { random: () => number; again: () => () => number } {
  const drawn: number[] = [];
  return {
    random: () => {
      const draw = random();
      drawn.push(draw);
      return draw;
    },
    again: () => {
      let next = 0;
      return () => {
        next += 1;
        return drawn[next - 1] ?? random();
      };
    },
  };
}

// a slice of a record of count events: [where it starts, how many], a random length from 1 to all of it, from the start, or anywhere
// (from: 'random'). The length is drawn first
export function slice(count: number, from: string | undefined, rand: () => number): [number, number] {
  const len = 1 + Math.floor(rand() * count);
  return [from === 'random' ? Math.floor(rand() * (count - len + 1)) : 0, len];
}

// A source of random draws, seeded as it's made, so a run is drawn again from its seed:
// its own draws (random(), what its owner plays: a pick, a contour, a rhythm),
// and a play's (play()), a seed of its own drawn from it,
// with a generator made from that seed, so a play is drawn again from its seed alone;
// seeded again from the start (reseed()).
export class Draws {
  #random: () => number;

  constructor({ seed }: { seed: number }) {
    this.#random = seeded(seed);
  }
  // a draw of its own, in [0, 1)
  random(): number {
    return this.#random();
  }
  // a play's own seed, drawn from its own draws, and its generator
  play(): PlayDraws {
    const seed = Math.floor(this.#random() * SEEDS);
    return { seed, random: seeded(seed) };
  }
  // seeded again, as from the start: a test's or a recorder's case at a time, on one
  // owner that runs on between them
  reseed(seed: number): void {
    this.#random = seeded(seed);
  }
}
