import type { Tongue } from '../layout';
import { keySignature, NO_KEY_SIGNATURE, type KeySignature } from './key';

/** Where a note was written: character offsets into the song text, end exclusive. */
export interface SourceRange {
  readonly start: number;
  readonly end: number;
}

export interface SongNote {
  /** onset, in beats from the start */
  readonly beat: number;
  readonly beats: number;
  readonly midi: number;
  readonly source: SourceRange;
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
  source?: SourceRange;
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

/** What decides an unmarked note's accidental: the song's key line, or else the tongue a number names. */
interface PitchContext {
  readonly key: KeySignature;
  /** base pitch → half steps that tongue is retuned by; only when the song has no key line */
  readonly tongueTuning: ReadonlyMap<number, number>;
}

/** MIDI from the groups of PITCH: letter, accidental, octave, marks | accidental, digit, marks. */
function pitchFrom(groups: (string | undefined)[], context: PitchContext): number {
  const [letter, letterAccidental, octave, letterMarks, digitAccidental, digit, digitMarks] = groups;
  const name = letter ?? CIPHER_TO_LETTER[Number(digit) - 1];
  const accidental = (letter ? letterAccidental : digitAccidental) ?? '';
  const baseOctave = octave === undefined ? 4 : Number(octave);
  const shift = octaveShift((letter ? letterMarks : digitMarks) ?? '');
  const natural = 12 * (baseOctave + shift + 1) + SEMITONES_FROM_C[CIPHER_TO_LETTER.indexOf(name)];
  // a number names a tongue: it sounds as that tongue is tuned; a letter names a pitch
  const unmarked = context.key.get(name) ?? (letter ? 0 : (context.tongueTuning.get(natural) ?? 0));
  const alteration = accidental === '#' ? 1 : accidental === 'b' ? -1 : unmarked;
  return natural + alteration;
}

/** Chord content, joined by - or spaces, with ( ) or [ ] groups, or run together: "1-(5-7)", "1 3 5", "135". */
function chordPitches(content: string, context: PitchContext): number[] | undefined {
  const compact = content.replace(CHORD_JOINERS, '');
  const pitch = new RegExp(PITCH, 'y');
  const midis: number[] = [];
  while (pitch.lastIndex < compact.length) {
    const match = pitch.exec(compact);
    if (!match) return undefined;
    midis.push(pitchFrom(match.slice(1), context));
  }
  return midis.length > 0 ? midis : undefined;
}

/** Splits "1-(5-7)" at the - outside groups: "1" at 0, "(5-7)" at 2; each - between parts is a hold. */
function splitAtHolds(content: string): { text: string; start: number }[] {
  const parts = [{ text: '', start: 0 }];
  let depth = 0;
  [...content].forEach((char, i) => {
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (char === '-' && depth === 0) parts.push({ text: '', start: i + 1 });
    else parts[parts.length - 1].text += char;
  });
  return parts;
}

/** A rest, a note, or a group ( ) or [ ] sounding together, each with its duration suffix. */
function readOnset(part: string, context: PitchContext): Onset | undefined {
  const rest = REST.exec(part);
  if (rest) return { midis: [], beats: durationOf(rest[1]) };
  const single = SINGLE.exec(part);
  if (single) return { midis: [pitchFrom(single.slice(1, 8), context)], beats: durationOf(single[8]) };
  const [, group, duration] = /^(.*?)([_.]*)$/.exec(part)!;
  if (!GROUP.test(group)) return undefined;
  const midis = chordPitches(group, context);
  return midis && { midis, beats: durationOf(duration) };
}

/**
 * What one token says, in order: onsets and holds. A - after a note holds it a beat longer,
 * whether it stands alone ("2 -") or the next note follows without a space ("2-4").
 */
function readToken(token: string, tokenStart: number, context: PitchContext): (Onset | typeof HOLD)[] | undefined {
  const items: (Onset | typeof HOLD)[] = [];
  for (const [i, part] of splitAtHolds(token).entries()) {
    if (i > 0) items.push(HOLD);
    if (part.text === '') continue;
    const onset = readOnset(part.text.normalize('NFD'), context);
    if (!onset) return undefined;
    const start = tokenStart + part.start;
    items.push({ ...onset, source: { start, end: start + part.text.length } });
  }
  return items;
}

const AMBIGUOUS_DOT_REASON = "ein • sagt nicht, ob der Punkt über der Note (Oktave höher) oder darunter (Oktave tiefer) stand: ' oder * für darüber, , für darunter";

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

export interface Meter {
  readonly beatsPerBar: number;
  /** the note value of one beat: 4 for quarters, 8 for eighths */
  readonly beatUnit: number;
}

const METER_HEADER = /^[ \t]*meter[ \t]*:[ \t]*(.*?)[ \t]*$/im;
const BEAT_UNITS = [2, 4, 8, 16];

function readMeter(value: string): Meter | undefined {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(value);
  if (!match) return undefined;
  const [beatsPerBar, beatUnit] = [Number(match[1]), Number(match[2])];
  return beatsPerBar >= 1 && beatsPerBar <= 16 && BEAT_UNITS.includes(beatUnit) ? { beatsPerBar, beatUnit } : undefined;
}

/** The meter a song text names in a valid "meter:" header, if any: "meter: 3/4". */
export function meterOf(text: string): Meter | undefined {
  const header = METER_HEADER.exec(text);
  return header ? readMeter(header[1]) : undefined;
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
export interface ParseOptions {
  /** the kalimba as tuned now: a number in the song plays its tongue's pitch */
  readonly tongues?: readonly Tongue[];
}

function tuningByBasePitch(tongues: readonly Tongue[]): Map<number, number> {
  return new Map(tongues.filter((t) => t.tuning !== 0).map((t) => [t.midi - t.tuning, t.tuning]));
}

export function parseSong(text: string, options: ParseOptions = {}): Song {
  // a key signature holds for the whole song, wherever its line is, and then decides over the tongues
  const keyName = keyOf(text);
  const signature = keyName ? keySignature(keyName) : undefined;
  const context: PitchContext = {
    key: signature ?? NO_KEY_SIGNATURE,
    tongueTuning: signature ? new Map() : tuningByBasePitch(options.tongues ?? []),
  };
  let title = 'Ohne Titel';
  let beatsPerMinute = DEFAULT_TEMPO;
  const onsets: { beat: number; onset: Onset }[] = [];
  const ignored: IgnoredText[] = [];
  let beat = 0;

  let lineStart = 0;
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const lineNumber = i + 1;
    const offset = lineStart;
    lineStart += rawLine.length + (text[lineStart + rawLine.length] === '\r' ? 2 : 1);
    const line = rawLine.replace(/(^|\s)\/\/.*$/, ''); // not the // inside a URL
    const header = /^\s*(title|tempo|key|meter)\s*:\s*(.*?)\s*$/i.exec(line);
    if (header && header[1].toLowerCase() === 'meter') {
      if (!readMeter(header[2])) ignored.push({ line: lineNumber, text: line.trim(), reason: 'Taktart wie 3/4 oder 6/8 schreiben' });
      return;
    }
    if (header && header[1].toLowerCase() === 'key') {
      if (!keySignature(header[2])) ignored.push({ line: lineNumber, text: line.trim(), reason: 'unbekannte Tonart: z. B. G, F, Bb, Em' });
      return;
    }
    if (header) {
      const isTitle = header[1].toLowerCase() === 'title';
      const tempo = isTitle ? undefined : readTempo(header[2]);
      if (isTitle) title = header[2];
      else if (tempo !== undefined) beatsPerMinute = tempo;
      else ignored.push({ line: lineNumber, text: line.trim(), reason: `Tempo muss zwischen ${TEMPO_RANGE[0]} und ${TEMPO_RANGE[1]} Schlägen pro Minute liegen` });
      return;
    }
    const matches = [...line.matchAll(TOKEN)];
    const tokens = matches.map((m) => m[0]);
    const readings = matches.map((m) => readToken(m[0], offset + m.index, context));
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

  const notes = onsets.flatMap(({ beat, onset }) =>
    onset.midis.map((midi) => ({ beat, beats: onset.beats, midi, source: onset.source! })),
  );
  if (notes.length === 0) {
    const unreadable = ignored.length === 1 ? '1 nicht lesbaren Teil' : `${ignored.length} nicht lesbare Teile`;
    const skipped = ignored.length > 0 ? ` (${unreadable} übersprungen)` : '';
    throw new SongTextError(`Keine Noten gefunden${skipped}. Kalimba-Zahlen (1–7) oder Buchstaben (C–B) einfügen.`);
  }
  return { title, beatsPerMinute, notes, lengthBeats: beat, ignored };
}
