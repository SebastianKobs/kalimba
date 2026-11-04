// ---------- midi-sequencer/pattern-note: a pattern's note, the music's: its pitch, its step of the scale, its phrase, its vibrato; a record's phrases ----------
import type { Pattern, PatternEvent } from '../sequencer/index.ts';
import { slice } from '../../base/util/index.ts';

// A note of a pattern: an event, and what else its pattern gives it:
//   - a step of the scale from the pattern's own note, or a note number of its
//     own, a drum's;
//   - the phrase of a record it's in, its vibrato.
// What a record keeps beside (where it was swung, the part that sounded it,
// its shape, its glides) is its owner's, carried along unread.
export interface PatternNote extends PatternEvent {
  step?: number | undefined;
  pitch?: number | undefined;
  phrase?: number | undefined;
  vibrato?: number | undefined; // a field given as undefined is one not given: a record keeps its pattern's, which may have none
}
// a pattern of notes, and its rhythm's shape and vibrato, as its owner's bank gives them
export interface NotePattern extends Pattern<PatternNote> {
  shape?: string;
  vibrato?: number;
}
// whole phrases of a record kept in phrases (each event's phrase): 1 up to all of them, so a line never stops before its end. A record not
// all in phrases is sliced as above
export function phrases(record: PatternNote[], from: string | undefined, rand: () => number): [number, number] {
  if (record.some((ev) => ev.phrase == null)) {
    return slice(record.length, from, rand);
  }
  const starts = record.flatMap((ev, index) => (index === 0 || ev.phrase !== record[index - 1]?.phrase ? [index] : []));
  const count = starts.length;
  const len = 1 + Math.floor(rand() * count);
  const firstPhrase = from === 'random' ? Math.floor(rand() * (count - len + 1)) : 0;
  const first = starts[firstPhrase];
  if (first === undefined) {
    return [0, 0]; // an empty record: nothing to play
  }
  const end = starts[firstPhrase + len] ?? record.length; // the next phrase's start, or the record's end
  return [first, end - first];
}
