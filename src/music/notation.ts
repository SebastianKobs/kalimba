import { keySignature, NO_KEY_SIGNATURE, type KeySignature } from './key';

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
  readonly ignored: readonly IgnoredText[];
}

/** Song text with no notes in it; the message says so. */
export class SongTextError extends Error {}

export const DEFAULT_TEMPO = 90;
const TEMPO_RANGE = [20, 300] as const;
const CIPHER_TO_LETTER = 'CDEFGAB';
const SEMITONES_FROM_C = [0, 2, 4, 5, 7, 9, 11];
// octave marks as tabs write them; U+0307 / U+0323 are dots above / below, after NFD
const MARKS_UP = "'’‘′°º*\u0307";
const MARKS_UP_TWO = '″”"'; // double prime, and the quotes tabs type for it
const MARKS_DOWN = ',\u0323';
const MARKS = `[${MARKS_UP}${MARKS_UP_TWO}${MARKS_DOWN}]*`;
// letter (bare = octave 4, or with octave number) or cipher digit, then octave marks
const PITCH = `(?:([A-G])([#b]?)(\\d)?(${MARKS})|([#b]?)([1-7])(${MARKS}))`;
const DURATION = '([_.]*)';
const SINGLE = new RegExp(`^${PITCH}${DURATION}$`);
// inside ( ) or [ ] notes sound together, separated by spaces, - or nothing
const CHORD_JOINERS = /[[\]()\s-]/g;
const HOLD = '-';
const GROUP = /^(?:\([^)]*\)|\[[^\]]*\])$/;
const REST = /^0([_.]*)$/;
const AMBIGUOUS_DOT = /[•·]/;
// a run of non-space text, where [ ] and ( ) groups may contain spaces
const TOKEN = /(?:\[[^\]]*\]|\([^)]*\)|[^\s|[(])+/g;

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

function octaveShift(marks: string): number {
  const shiftOf = (mark: string) => (MARKS_UP_TWO.includes(mark) ? 2 : MARKS_UP.includes(mark) ? 1 : -1);
  return [...marks].reduce((sum, mark) => sum + shiftOf(mark), 0);
}

/** MIDI from the groups of PITCH: letter, accidental, octave, marks | accidental, digit, marks. An unmarked note takes the key's accidental. */
function pitchFrom(groups: (string | undefined)[], key: KeySignature): number {
  const [letter, letterAccidental, octave, letterMarks, digitAccidental, digit, digitMarks] = groups;
  const name = letter ?? CIPHER_TO_LETTER[Number(digit) - 1];
  const accidental = (letter ? letterAccidental : digitAccidental) ?? '';
  const baseOctave = octave === undefined ? 4 : Number(octave);
  const shift = octaveShift((letter ? letterMarks : digitMarks) ?? '');
  const alteration = accidental === '#' ? 1 : accidental === 'b' ? -1 : (key.get(name) ?? 0);
  const semitone = SEMITONES_FROM_C[CIPHER_TO_LETTER.indexOf(name)] + alteration;
  return 12 * (baseOctave + shift + 1) + semitone;
}

/** Chord content, joined by - or spaces, with ( ) or [ ] groups, or run together: "1-(5-7)", "1 3 5", "135". */
function chordPitches(content: string, key: KeySignature): number[] | undefined {
  const compact = content.replace(CHORD_JOINERS, '');
  const pitch = new RegExp(PITCH, 'y');
  const midis: number[] = [];
  while (pitch.lastIndex < compact.length) {
    const match = pitch.exec(compact);
    if (!match) return undefined;
    midis.push(pitchFrom(match.slice(1), key));
  }
  return midis.length > 0 ? midis : undefined;
}

/** Splits "1-(5-7)" at the - outside groups: ["1", "(5-7)"]; each - between parts is a hold. */
function splitAtHolds(content: string): string[] {
  const parts = [''];
  let depth = 0;
  for (const char of content) {
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (char === '-' && depth === 0) parts.push('');
    else parts[parts.length - 1] += char;
  }
  return parts;
}

/** A rest, a note, or a group ( ) or [ ] sounding together, each with its duration suffix. */
function readOnset(part: string, key: KeySignature): Onset | undefined {
  const rest = REST.exec(part);
  if (rest) return { midis: [], beats: durationOf(rest[1]) };
  const single = SINGLE.exec(part);
  if (single) return { midis: [pitchFrom(single.slice(1, 8), key)], beats: durationOf(single[8]) };
  const [, group, duration] = /^(.*?)([_.]*)$/.exec(part)!;
  if (!GROUP.test(group)) return undefined;
  const midis = chordPitches(group, key);
  return midis && { midis, beats: durationOf(duration) };
}

/**
 * What one token says, in order: onsets and holds. A - after a note holds it a beat longer,
 * whether it stands alone ("2 -") or the next note follows without a space ("2-4").
 */
function readToken(token: string, key: KeySignature): (Onset | typeof HOLD)[] | undefined {
  const items: (Onset | typeof HOLD)[] = [];
  const parts = splitAtHolds(token);
  for (const [i, part] of parts.entries()) {
    if (i > 0) items.push(HOLD);
    if (part === '') continue;
    const onset = readOnset(part, key);
    if (!onset) return undefined;
    items.push(onset);
  }
  return items;
}

const AMBIGUOUS_DOT_REASON = "a • can't say whether the dot was above the note (octave up) or below (octave down): write ' or * for above, , for below";

/** Text the parser left out, so the player can see what was dropped. */
export interface IgnoredText {
  readonly line: number;
  readonly text: string;
  readonly reason?: string;
}

function ignoredToken(token: string, line: number): IgnoredText {
  return AMBIGUOUS_DOT.test(token) ? { line, text: token, reason: AMBIGUOUS_DOT_REASON } : { line, text: token };
}

function readTempo(value: string): number | undefined {
  const tempo = Number(value);
  const [min, max] = TEMPO_RANGE;
  return Number.isFinite(tempo) && tempo >= min && tempo <= max ? tempo : undefined;
}

const TEMPO_HEADER = /^[ \t]*tempo[ \t]*:[ \t]*(.*?)[ \t]*$/im;

/** The tempo a song text names in a valid "tempo:" header, if any. */
export function tempoOf(text: string): number | undefined {
  const header = TEMPO_HEADER.exec(text);
  return header ? readTempo(header[1]) : undefined;
}

const TITLE_HEADER = /^[ \t]*title[ \t]*:[ \t]*(.*?)[ \t]*$/im;

/** The title a song text names in a "title:" header, if any. */
export function titleOf(text: string): string | undefined {
  return TITLE_HEADER.exec(text)?.[1] || undefined;
}

const KEY_HEADER = /^[ \t]*key[ \t]*:[ \t]*(.*?)[ \t]*$/im;

/** The key a song text names in a "key:" header, as written, if any. */
export function keyOf(text: string): string | undefined {
  return KEY_HEADER.exec(text)?.[1] || undefined;
}


/** A line is music when its notes outnumber what can't be read; prose with a stray "A" is not. */
function isMostlyNotes(readings: ((Onset | typeof HOLD)[] | undefined)[]): boolean {
  const notes = readings.filter((r) => r !== undefined && r.some((item) => item !== HOLD)).length;
  const unknown = readings.filter((r) => r === undefined).length;
  return unknown === 0 || notes > unknown;
}

/**
 * Reads a song from text, skipping what it can't read and listing it in `ignored`.
 * Pitches as note names (C4, F#4, Bb3; a bare letter is octave 4) or kalimba
 * cipher digits (1 = C4 … 7 = B4, # or b in front). Octave marks after either, as tabs write them:
 * ' ’ ° º * or a dot above for up, , or a dot below for down; doubled for two octaves.
 * Durations: one beat each; _ halves, . adds half, - holds one more beat; 0 is a rest.
 * ( ) or [ ] group notes sounding together: (1 3 5), (135), (5-7), [C E G]. A - after a note holds it
 * a beat longer, also when the next note follows without a space: "2-4" is 2 for two beats, then 4. "key: G" applies a key signature: every unmarked F becomes F#. Bar lines | and // comments are ignored. Headers: "title: …", "tempo: 90".
 * Lines that are mostly not notes (page titles, lyrics, links) are skipped whole.
 * Throws SongTextError only when no notes are left.
 */
export function parseSong(text: string): Song {
  // a key signature holds for the whole song, wherever its line is
  const keyName = keyOf(text);
  const key = (keyName && keySignature(keyName)) || NO_KEY_SIGNATURE;
  let title = 'Untitled';
  let beatsPerMinute = DEFAULT_TEMPO;
  const onsets: { beat: number; onset: Onset }[] = [];
  const ignored: IgnoredText[] = [];
  let beat = 0;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const lineNumber = i + 1;
    const line = rawLine.replace(/(^|\s)\/\/.*$/, ''); // not the // inside a URL
    const header = /^\s*(title|tempo|key)\s*:\s*(.*?)\s*$/i.exec(line);
    if (header && header[1].toLowerCase() === 'key') {
      if (!keySignature(header[2])) ignored.push({ line: lineNumber, text: line.trim(), reason: 'unknown key: write e.g. G, F, Bb, Em' });
      return;
    }
    if (header) {
      const isTitle = header[1].toLowerCase() === 'title';
      const tempo = isTitle ? undefined : readTempo(header[2]);
      if (isTitle) title = header[2];
      else if (tempo !== undefined) beatsPerMinute = tempo;
      else ignored.push({ line: lineNumber, text: line.trim(), reason: `tempo must be ${TEMPO_RANGE.join('–')} beats per minute` });
      return;
    }
    const tokens = line.match(TOKEN) ?? [];
    const readings = tokens.map((t) => readToken(t.normalize('NFD'), key));
    if (!isMostlyNotes(readings)) {
      ignored.push({ line: lineNumber, text: line.trim() });
      return;
    }
    readings.forEach((reading, k) => {
      if (reading === undefined) {
        ignored.push(ignoredToken(tokens[k], lineNumber));
        return;
      }
      for (const item of reading) {
        const last = onsets.at(-1);
        if (item === HOLD && !last) {
          ignored.push(ignoredToken(tokens[k], lineNumber)); // a hold with nothing to hold
        } else if (item === HOLD) {
          last!.onset.beats += 1;
          beat += 1;
        } else {
          onsets.push({ beat, onset: item });
          beat += item.beats;
        }
      }
    });
  });

  const notes = onsets.flatMap(({ beat, onset }) => onset.midis.map((midi) => ({ beat, beats: onset.beats, midi })));
  if (notes.length === 0) {
    const skipped = ignored.length > 0 ? ` (skipped ${ignored.length} part${ignored.length === 1 ? '' : 's'} it couldn't read)` : '';
    throw new SongTextError(`No notes found${skipped}. Paste kalimba numbers (1–7) or letters (C–B).`);
  }
  return { title, beatsPerMinute, notes, lengthBeats: beat, ignored };
}
