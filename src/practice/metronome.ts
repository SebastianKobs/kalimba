export interface Click {
  readonly beat: number;
  /** first beat of a bar */
  readonly accent: boolean;
}

/** The beats the clock passed going from `from` (inclusive) to `to` (exclusive), each a click. */
export function clicksBetween(from: number, to: number, beatsPerBar: number): Click[] {
  const clicks: Click[] = [];
  for (let beat = Math.ceil(from); beat < to; beat++) {
    clicks.push({ beat, accent: ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar === 0 });
  }
  return clicks;
}
