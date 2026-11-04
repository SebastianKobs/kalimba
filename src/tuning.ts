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
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;
}

/** The retuned tongues grouped by change (same letter, same step), lowest tongue first. */
function tuningChanges(tongues: readonly Tongue[]): Tongue[][] {
  const retuned = tongues.filter((t) => t.tuning !== 0).sort((a, b) => a.midi - a.tuning - (b.midi - b.tuning));
  const groups = new Map<string, Tongue[]>();
  for (const tongue of retuned) {
    const change = `${tongue.letter}${tongue.tuning}`;
    groups.set(change, [...(groups.get(change) ?? []), tongue]);
  }
  return [...groups.values()];
}

/** "Stimmung: Standard-C mit 4̣, 4 und 4′ erhöht von F auf F#": retuned tongues grouped by change, lowest first. */
export function describeTuning(tongues: readonly Tongue[]): string {
  const changes = tuningChanges(tongues).map((group) => {
    const { letter, accidental, tuning } = group[0];
    return `${listed(group.map(tongueNumber))} ${tuning > 0 ? 'erhöht' : 'erniedrigt'} von ${letter} auf ${letter}${accidental}`;
  });
  return changes.length === 0 ? 'Stimmung: Standard-C' : `Stimmung: Standard-C mit ${changes.join('; ')}`;
}

const ENGRAVED_CHANGES = 3;

/** The tuning short enough to burn into the wood: "Standard-C", then a line per change, "4̣ 4 4′  F → F#"; past three, two and "+ n weitere". */
export function engravedTuning(tongues: readonly Tongue[]): string[] {
  const changes = tuningChanges(tongues).map((group) => {
    const { letter, accidental } = group[0];
    return `${group.map(tongueNumber).join(' ')}  ${letter} → ${letter}${accidental}`;
  });
  if (changes.length <= ENGRAVED_CHANGES) return ['Standard-C', ...changes];
  const shown = ENGRAVED_CHANGES - 1;
  return ['Standard-C', ...changes.slice(0, shown), `+ ${changes.length - shown} weitere`];
}
