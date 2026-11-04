import { midiToFrequency, parseNote } from '../src/pitch';

describe('parseNote', () => {
  it('maps scientific pitch names to MIDI numbers', () => {
    expect(parseNote('C4')).toBe(60);
    expect(parseNote('A4')).toBe(69);
    expect(parseNote('F3')).toBe(53);
    expect(parseNote('E6')).toBe(88);
  });

  it('rejects names that are not a natural note with an octave', () => {
    expect(() => parseNote('H4')).toThrow(/H4/);
    expect(() => parseNote('C')).toThrow();
  });
});

describe('midiToFrequency', () => {
  it('uses 12-tone equal temperament at A4 = 440 Hz', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBe(880);
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 3);
  });
});
