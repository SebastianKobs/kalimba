import { KALIMBA_21, retune } from '../../src/layout';
import { parseSong } from '../../src/music/notation';
import { homeNoteOf, tuningFor } from '../../src/music/retune-for';

const song = (text: string) => parseSong(text, { tongues: KALIMBA_21 });
// which letters it retunes, and which way: every tongue of a letter alike
const changedLetters = (halfSteps: readonly number[]) =>
  [...new Set(KALIMBA_21.flatMap((t, i) => (halfSteps[i] ? [`${t.letter}${halfSteps[i]! > 0 ? '#' : 'b'}`] : [])))].sort();

describe('tuningFor', () => {
  it('plays a D major tune as written by raising every F and C tongue, every note on a tongue', () => {
    const found = tuningFor(song('D4 E4 F#4 G4 A4 B4 C#5 D5'), KALIMBA_21)!;
    expect(changedLetters(found.halfSteps)).toEqual(['C#', 'F#']);
    expect(found.transpose % 12).toBe(0); // its own key: moved by octaves at most
    expect(found.exact).toBe(8);
    expect(found.changes).toEqual([{ letter: 'C', to: 'C#' }, { letter: 'F', to: 'F#' }]);
  });

  it('lowers B for an F major tune with its Bb', () => {
    const found = tuningFor(song('F4 G4 A4 Bb4 C5'), KALIMBA_21)!;
    expect(changedLetters(found.halfSteps)).toEqual(['Bb']);
    expect(found.exact).toBe(5);
  });

  it('offers nothing for a tune the tongues already play in its key', () => {
    expect(tuningFor(song('C4 E4 G4 A4'), KALIMBA_21)).toBeUndefined();
  });

  it('offers nothing when the kalimba is already tuned so', () => {
    const fSharp = retune(KALIMBA_21, KALIMBA_21.map((t) => (t.letter === 'F' ? 1 : 0)));
    expect(tuningFor(song('G4 A4 B4 F#4 G4'), fSharp)).toBeUndefined();
  });

  it('goes with what the tune plays most where it needs both a letter and its sharp', () => {
    const found = tuningFor(song('F#4 G4 F#4 E4 F#4 F4 G4'), KALIMBA_21)!;
    expect(changedLetters(found.halfSteps)).toEqual(['F#']);
    expect(found.exact).toBe(6); // the one F has no tongue left: one letter, one tuning
  });

  it('changes no more letters than the tune needs', () => {
    const found = tuningFor(song('A4 B4 C#5 D5 E5'), KALIMBA_21)!; // A major's start: only its C# is missing
    expect(changedLetters(found.halfSteps)).toEqual(['C#']);
  });
});

describe('homeNoteOf', () => {
  it('is the root of the song’s key line, as a pitch class', () => {
    expect(homeNoteOf(song('C4 E4'), 'Em')).toBe(4);
    expect(homeNoteOf(song('C4 E4'), 'Bb')).toBe(10);
    expect(homeNoteOf(song('C4 E4'), 'F#m')).toBe(6);
  });

  it('is otherwise the lowest note sounding last: where a song comes home', () => {
    expect(homeNoteOf(song('C4 E4 [A3 E4]'))).toBe(9);
  });

  it('is none for a key line it can’t read and no notes', () => {
    expect(homeNoteOf({ ...song('C4'), notes: [] }, 'xyz')).toBeUndefined();
  });
});
