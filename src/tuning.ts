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

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
// the modes by the degree of the major scale they start on
const MODES = ['Dur', 'Dorisch', 'Phrygisch', 'Lydisch', 'Mixolydisch', 'Moll', 'Lokrisch'];

/**
 * The scale the tongues make, when their notes are a major scale's seven: named from the song's home note (a pitch class) in it,
 * as its mode (E in G major's notes: E-Moll), else as the major key; spelled as the tongues are.
 */
export function scaleOf(tongues: readonly Tongue[], home?: number): string | undefined {
  const notes = new Set(tongues.map((t) => pitchClass(t.midi)));
  if (notes.size !== 7) return undefined;
  const major = [...notes].find((root) => MAJOR_SCALE.every((step) => notes.has(pitchClass(root + step))));
  if (major === undefined) return undefined;
  const root = home !== undefined && notes.has(pitchClass(home)) ? pitchClass(home) : major;
  const tongue = tongues.find((t) => pitchClass(t.midi) === root)!;
  return `${tongue.letter}${tongue.accidental}-${MODES[MAJOR_SCALE.indexOf(pitchClass(root - major))]}`;
}

// standard, the kalimba's own name; retuned, the scale it makes, if it makes one
function tuningName(tongues: readonly Tongue[], home?: number): string {
  return (tongues.some((t) => t.tuning !== 0) && scaleOf(tongues, home)) || 'Standard-C';
}

/** "Stimmung: G-Dur (Standard-C mit 4̣, 4 und 4′ erhöht von F auf F#)": the scale, if it's one, and the tongues retuned by change, lowest first. */
export function describeTuning(tongues: readonly Tongue[], home?: number): string {
  const changes = tuningChanges(tongues).map((group) => {
    const { letter, accidental, tuning } = group[0];
    return `${listed(group.map(tongueNumber))} ${tuning > 0 ? 'erhöht' : 'erniedrigt'} von ${letter} auf ${letter}${accidental}`;
  });
  if (changes.length === 0) return 'Stimmung: Standard-C';
  const name = tuningName(tongues, home);
  const detail = `Standard-C mit ${changes.join('; ')}`;
  return name === 'Standard-C' ? `Stimmung: ${detail}` : `Stimmung: ${name} (${detail})`;
}

const ENGRAVED_CHANGES = 3;

/** The tuning short enough to burn into the wood: its scale or "Standard-C", then a line per change, "4̣ 4 4′  F → F#"; past three, two and "+ n weitere". */
export function engravedTuning(tongues: readonly Tongue[], home?: number): string[] {
  const changes = tuningChanges(tongues).map((group) => {
    const { letter, accidental } = group[0];
    return `${group.map(tongueNumber).join(' ')}  ${letter} → ${letter}${accidental}`;
  });
  const name = tuningName(tongues, home);
  if (changes.length <= ENGRAVED_CHANGES) return [name, ...changes];
  const shown = ENGRAVED_CHANGES - 1;
  return [name, ...changes.slice(0, shown), `+ ${changes.length - shown} weitere`];
}
