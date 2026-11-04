import type { Tongue } from '../layout';
import type { Song } from './notation';

export interface ArrangedNote {
  readonly beat: number;
  readonly beats: number;
  readonly tongue: Tongue;
  /** exact: the transposed pitch has a tongue; octave: played an octave or more away */
  readonly fit: 'exact' | 'octave';
}

export interface SkippedNote {
  readonly beat: number;
  /** transposed pitch that no tongue has in any octave */
  readonly midi: number;
}

export interface Arrangement {
  readonly title: string;
  readonly beatsPerMinute: number;
  readonly lengthBeats: number;
  /** semitones the song was moved by */
  readonly transpose: number;
  readonly notes: readonly ArrangedNote[];
  readonly skipped: readonly SkippedNote[];
}

export interface ArrangeOptions {
  /** force a shift instead of searching for the best one */
  readonly transpose?: number;
}

const MAX_SHIFT = 48;

function nearestByPitchClass(midi: number, tongues: readonly Tongue[]): Tongue | undefined {
  const sameClass = tongues.filter((t) => (t.midi - midi) % 12 === 0);
  return sameClass.sort((a, b) => Math.abs(a.midi - midi) - Math.abs(b.midi - midi))[0];
}

function arrangeAt(song: Song, tongues: readonly Tongue[], transpose: number): Arrangement {
  const byMidi = new Map(tongues.map((t) => [t.midi, t]));
  const notes: ArrangedNote[] = [];
  const skipped: SkippedNote[] = [];
  const taken = new Set<string>(); // beat + tongue: a folded note may land on one already in the chord
  for (const note of song.notes) {
    const midi = note.midi + transpose;
    const exact = byMidi.get(midi);
    const tongue = exact ?? nearestByPitchClass(midi, tongues);
    if (!tongue) {
      skipped.push({ beat: note.beat, midi });
      continue;
    }
    const key = `${note.beat}:${tongue.index}`;
    if (taken.has(key)) continue;
    taken.add(key);
    notes.push({ beat: note.beat, beats: note.beats, tongue, fit: exact ? 'exact' : 'octave' });
  }
  return { title: song.title, beatsPerMinute: song.beatsPerMinute, lengthBeats: song.lengthBeats, transpose, notes, skipped };
}

/** Higher is better: most notes exact, then most playable at all, then keep the key (octave shifts), then the smallest shift. */
function rank(a: Arrangement): number[] {
  const exact = a.notes.filter((n) => n.fit === 'exact').length;
  const keepsKey = a.transpose % 12 === 0 ? 1 : 0;
  return [exact, a.notes.length, keepsKey, -Math.abs(a.transpose)];
}

function better(a: Arrangement, b: Arrangement): boolean {
  const [ra, rb] = [rank(a), rank(b)];
  const i = ra.findIndex((v, k) => v !== rb[k]);
  return i >= 0 && ra[i] > rb[i];
}

/** Fits any song onto any set of tongues: picks the transposition, folds octaves, skips what can't be played. */
export function arrange(song: Song, tongues: readonly Tongue[], options: ArrangeOptions = {}): Arrangement {
  if (options.transpose !== undefined) return arrangeAt(song, tongues, options.transpose);
  let best = arrangeAt(song, tongues, 0);
  for (let shift = -MAX_SHIFT; shift <= MAX_SHIFT; shift++) {
    const candidate = arrangeAt(song, tongues, shift);
    if (better(candidate, best)) best = candidate;
  }
  return best;
}
