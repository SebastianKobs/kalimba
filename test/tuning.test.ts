import { KALIMBA_21, retune } from '../src/layout';
import { describeTuning, tongueNumber, tongueNumberParts } from '../src/tuning';

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
    expect(describeTuning(KALIMBA_21)).toBe('Tuning: Standard C');
  });

  it('names a retuned tongue by its number, and the change', () => {
    expect(describeTuning(tuned({ F5: 1 }))).toBe('Tuning: Standard C with 4′ raised from F to F#');
  });

  it('groups tongues retuned alike, low to high', () => {
    expect(describeTuning(tuned({ F3: 1, F4: 1, F5: 1 }))).toBe('Tuning: Standard C with 4̣, 4 and 4′ raised from F to F#');
  });

  it('lists different changes, lowest tongue first', () => {
    expect(describeTuning(tuned({ F4: 1, B3: -1, B4: -1 }))).toBe(
      'Tuning: Standard C with 7̣ and 7 lowered from B to Bb; 4 raised from F to F#',
    );
  });
});
