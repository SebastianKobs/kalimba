import { KALIMBA_21, retune } from '../src/layout';
import { describeTuning, engravedTuning, scaleOf, tongueNumber, tongueNumberParts } from '../src/tuning';

const tuned = (changes: Record<string, number>) => retune(KALIMBA_21, KALIMBA_21.map((t) => changes[t.note] ?? 0));
const byNote = (note: string) => KALIMBA_21.find((t) => t.note === note)!;

describe('tongueNumber', () => {
  it('writes the tongue as tabs do: cipher digit, primes above octave 4, a dot below under it', () => {
    expect(['C4', 'C5', 'D6', 'F3', 'B3'].map((n) => tongueNumber(byNote(n)))).toEqual(['1', '1′', '2″', '4̣', '7̣']);
  });
});

describe('tongueNumberParts', () => {
  it('splits the number for styling: accidental, digit, octave marks above or below', () => {
    const f = tuned({ F5: 1, F3: 1 });
    expect(tongueNumberParts(f.find((t) => t.note === 'F#5')!)).toEqual({ accidental: '#', digit: '4', above: '′', below: 0 });
    expect(tongueNumberParts(f.find((t) => t.note === 'F#3')!)).toEqual({ accidental: '#', digit: '4', above: '', below: 1 });
    expect(tongueNumberParts(byNote('D6'))).toEqual({ accidental: '', digit: '2', above: '″', below: 0 });
  });
});

describe('describeTuning', () => {
  it('names the standard tuning', () => {
    expect(describeTuning(KALIMBA_21)).toBe('Stimmung: Standard-C');
  });

  it('names a retuned tongue by its number, and the change', () => {
    expect(describeTuning(tuned({ F5: 1 }))).toBe('Stimmung: Standard-C mit 4′ erhöht von F auf F#');
  });

  it('groups tongues retuned alike, low to high, and names the scale they make', () => {
    expect(describeTuning(tuned({ F3: 1, F4: 1, F5: 1 }))).toBe('Stimmung: G-Dur (Standard-C mit 4̣, 4 und 4′ erhöht von F auf F#)');
  });

  it('lists different changes, lowest tongue first', () => {
    expect(describeTuning(tuned({ F4: 1, B3: -1, B4: -1 }))).toBe(
      'Stimmung: Standard-C mit 7̣ und 7 erniedrigt von B auf Bb; 4 erhöht von F auf F#',
    );
  });
});

describe('engravedTuning', () => {
  it('is short enough to burn into the wood: the tuning, then a line per change, its tongues and the step', () => {
    expect(engravedTuning(KALIMBA_21)).toEqual(['Standard-C']);
    expect(engravedTuning(tuned({ F3: 1, F4: 1, F5: 1 }))).toEqual(['G-Dur', '4̣ 4 4′  F → F#']);
    expect(engravedTuning(tuned({ F3: 1, F4: 1, F5: 1 }), 4)).toEqual(['E-Moll', '4̣ 4 4′  F → F#']); // from the song's home note
    expect(engravedTuning(tuned({ F4: 1, B3: -1, B4: -1 }))).toEqual(['Standard-C', '7̣ 7  B → Bb', '4  F → F#']);
  });

  it('stays within a few lines however many tongues are retuned: past three changes, two and how many more', () => {
    const all = retune(KALIMBA_21, KALIMBA_21.map((_, i) => (i % 2 === 0 ? 1 : -1)));
    const lines = engravedTuning(all);
    expect(lines).toHaveLength(4);
    expect(lines[3]).toMatch(/^\+ \d+ weitere$/);
    expect(engravedTuning(tuned({ F4: 1, B3: -1, C4: 1 }))).toHaveLength(4); // three changes still fit whole
  });
});

describe('scaleOf', () => {
  const allF = { F3: 1, F4: 1, F5: 1 };
  const minorOnC = { E4: -1, E5: -1, E6: -1, A3: -1, A4: -1, A5: -1, B3: -1, B4: -1, B5: -1 };

  it('names the scale the tongues make, as a major key when no home note is given', () => {
    expect(scaleOf(tuned(allF))).toBe('G-Dur');
    expect(scaleOf(tuned({ B3: -1, B4: -1, B5: -1 }))).toBe('F-Dur');
    expect(scaleOf(tuned(minorOnC))).toBe('Eb-Dur');
  });

  it('names its mode from the song’s home note: minor, Lydian, Dorian and the rest', () => {
    expect(scaleOf(tuned(allF), 4)).toBe('E-Moll');
    expect(scaleOf(tuned(allF), 0)).toBe('C-Lydisch');
    expect(scaleOf(tuned(allF), 9)).toBe('A-Dorisch');
    expect(scaleOf(tuned(minorOnC), 0)).toBe('C-Moll');
    expect(scaleOf(tuned({ B3: -1, B4: -1, B5: -1 }), 0)).toBe('C-Mixolydisch');
  });

  it('names its root as the tongues spell it', () => {
    const dMajor = tuned({ F3: 1, F4: 1, F5: 1, C4: 1, C5: 1, C6: 1 });
    expect(scaleOf(dMajor)).toBe('D-Dur');
    expect(scaleOf(dMajor, 11)).toBe('B-Moll');
    expect(scaleOf(dMajor, 6)).toBe('F#-Phrygisch');
  });

  it('names none where the tongues make no scale: a letter only partly retuned', () => {
    expect(scaleOf(tuned({ F5: 1 }))).toBeUndefined();
  });

  it('takes a home note outside the scale as none given', () => {
    expect(scaleOf(tuned(allF), 5)).toBe('G-Dur'); // F: not among the tongues any more
  });
});
