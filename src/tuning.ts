import type { Tongue } from './layout';

const PRIMES = ['', '′', '″', '‴'];
export const DOT_BELOW = '\u0323';

export interface TongueNumberParts {
  readonly accidental: string;
  readonly digit: string;
  /** primes for octaves above 4 */
  readonly above: string;
  /** dots under the digit for octaves below 4 */
  readonly below: number;
}

/** The tongue's number split for styling: octave marks are easy to overlook, so views draw them apart. */
export function tongueNumberParts(tongue: Tongue): TongueNumberParts {
  const dots = tongue.octaveDots;
  return { accidental: tongue.accidental, digit: String(tongue.cipher), above: PRIMES[Math.max(0, dots)], below: Math.max(0, -dots) };
}

/** The tongue as tabs write it: cipher digit, primes per octave above 4, a dot below per octave under it. */
export function tongueNumber(tongue: Tongue): string {
  const { digit, above, below } = tongueNumberParts(tongue);
  return `${digit}${above}${DOT_BELOW.repeat(below)}`;
}

function listed(items: string[]): string {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** "Tuning: Standard C with 4̣, 4 and 4′ raised from F to F#": retuned tongues grouped by change, lowest first. */
export function describeTuning(tongues: readonly Tongue[]): string {
  const retuned = tongues.filter((t) => t.tuning !== 0).sort((a, b) => a.midi - a.tuning - (b.midi - b.tuning));
  if (retuned.length === 0) return 'Tuning: Standard C';
  const groups = new Map<string, Tongue[]>();
  for (const tongue of retuned) {
    const change = `${tongue.letter}${tongue.tuning}`;
    groups.set(change, [...(groups.get(change) ?? []), tongue]);
  }
  const changes = [...groups.values()].map((group) => {
    const { letter, accidental, tuning } = group[0];
    return `${listed(group.map(tongueNumber))} ${tuning > 0 ? 'raised' : 'lowered'} from ${letter} to ${letter}${accidental}`;
  });
  return `Tuning: Standard C with ${changes.join('; ')}`;
}
