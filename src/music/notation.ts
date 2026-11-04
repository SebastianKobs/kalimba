import { parseNote } from '../pitch';

export interface SongNote {
  /** onset, in beats from the start */
  readonly beat: number;
  readonly beats: number;
  readonly midi: number;
}

export interface Song {
  readonly title: string;
  readonly beatsPerMinute: number;
  readonly notes: readonly SongNote[];
  readonly lengthBeats: number;
}

/** Song text the user typed or pasted that can't be read; the message says where and why. */
export class SongTextError extends Error {}

const DEFAULT_TEMPO = 90;
const TEMPO_RANGE = [20, 300] as const;
const CIPHER_TO_LETTER = 'CDEFGAB';
const NOTE_NAME = /^([A-G][#b]?-?\d)([_.]*)$/;
const CIPHER = /^([#b]?)([1-7])(['’,]*)([_.]*)$/;
const REST = /^0([_.]*)$/;
const CHORD = /^\[([^\]]*)\]([_.]*)$/;
const TOKEN = /\[[^\]]*\][_.]*|[^\s|]+/g;

interface Onset {
  midis: number[];
  beats: number;
}

/** Duration suffixes, jianpu style: each _ halves, a trailing . adds half. */
function durationOf(suffix: string): number {
  const halvings = suffix.split('_').length - 1;
  const dotted = suffix.endsWith('.');
  return 2 ** -halvings * (dotted ? 1.5 : 1);
}

function cipherToMidi(accidental: string, digit: string, octaveMarks: string): number {
  const up = (octaveMarks.match(/['’]/g) ?? []).length;
  const down = (octaveMarks.match(/,/g) ?? []).length;
  const accidentalName = accidental === '#' ? '#' : accidental === 'b' ? 'b' : '';
  return parseNote(`${CIPHER_TO_LETTER[Number(digit) - 1]}${accidentalName}${4 + up - down}`);
}

/** One pitch, without duration: "F#4" or "5'" → MIDI, or undefined if it isn't one. */
function pitchOf(token: string): number | undefined {
  const name = NOTE_NAME.exec(token);
  if (name && !name[2]) return parseNote(name[1]);
  const cipher = CIPHER.exec(token);
  if (cipher && !cipher[4]) return cipherToMidi(cipher[1], cipher[2], cipher[3]);
  return undefined;
}

function readOnset(token: string): Onset | undefined {
  const rest = REST.exec(token);
  if (rest) return { midis: [], beats: durationOf(rest[1]) };
  const chord = CHORD.exec(token);
  if (chord) {
    const pitches = chord[1].trim().split(/\s+/).map(pitchOf);
    if (pitches.some((p) => p === undefined) || pitches.length === 0) return undefined;
    return { midis: pitches as number[], beats: durationOf(chord[2]) };
  }
  const name = NOTE_NAME.exec(token);
  if (name) return { midis: [parseNote(name[1])], beats: durationOf(name[2]) };
  const cipher = CIPHER.exec(token);
  if (cipher) return { midis: [cipherToMidi(cipher[1], cipher[2], cipher[3])], beats: durationOf(cipher[4]) };
  return undefined;
}

function readTempo(value: string, line: number): number {
  const tempo = Number(value);
  const [min, max] = TEMPO_RANGE;
  if (!Number.isFinite(tempo) || tempo < min || tempo > max) {
    throw new SongTextError(`Line ${line}: tempo must be a number of beats per minute from ${min} to ${max}, got "${value}".`);
  }
  return tempo;
}

/**
 * Reads a song from text. Pitches as note names (C4, F#4, Bb3) or kalimba cipher digits
 * (1 = C4 … 7 = B4, ' per octave up, , per octave down, # or b in front).
 * Durations: one beat each; _ halves, . adds half, a separate - holds one more beat; 0 is a rest.
 * [1 3 5] is a chord. Bar lines | and // comments are ignored. Headers: "title: …", "tempo: 90".
 */
export function parseSong(text: string): Song {
  let title = 'Untitled';
  let beatsPerMinute = DEFAULT_TEMPO;
  const onsets: { beat: number; onset: Onset }[] = [];
  let beat = 0;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const lineNumber = i + 1;
    const line = rawLine.replace(/\/\/.*$/, '');
    const header = /^\s*(title|tempo)\s*:\s*(.*?)\s*$/i.exec(line);
    if (header) {
      if (header[1].toLowerCase() === 'title') title = header[2];
      else beatsPerMinute = readTempo(header[2], lineNumber);
      return;
    }
    for (const token of line.match(TOKEN) ?? []) {
      if (token === '-') {
        const last = onsets.at(-1);
        if (!last) throw new SongTextError(`Line ${lineNumber}: a hold "-" needs a note or rest before it.`);
        last.onset.beats += 1;
        beat += 1;
        continue;
      }
      const onset = readOnset(token);
      if (!onset) {
        throw new SongTextError(
          `Line ${lineNumber}: "${token}" is not a note. Use note names (C4, F#4, Bb3), cipher digits 1–7 with ' or , for octaves, 0 for a rest, - to hold, [ ] for chords.`,
        );
      }
      onsets.push({ beat, onset });
      beat += onset.beats;
    }
  });

  const notes = onsets.flatMap(({ beat, onset }) => onset.midis.map((midi) => ({ beat, beats: onset.beats, midi })));
  if (notes.length === 0) throw new SongTextError('The song has no notes.');
  return { title, beatsPerMinute, notes, lengthBeats: beat };
}
