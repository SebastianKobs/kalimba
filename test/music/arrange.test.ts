import { arrange } from '../../src/music/arrange';
import { parseSong } from '../../src/music/notation';
import { KALIMBA_17, KALIMBA_21 } from '../../src/layout';

const played = (a: ReturnType<typeof arrange>) => a.notes.map((n) => n.tongue.note);

describe('arrange', () => {
  it('keeps a song that already fits, untransposed', () => {
    const a = arrange(parseSong('C4 E4 G4 C5'), KALIMBA_21);
    expect(a.transpose).toBe(0);
    expect(played(a)).toEqual(['C4', 'E4', 'G4', 'C5']);
    expect(a.skipped).toEqual([]);
  });

  it('transposes a song in another key onto the kalimba\'s scale, by the smallest shift', () => {
    // D major: F# and C# are not on a C kalimba; down a whole tone they are
    const a = arrange(parseSong('D4 E4 F#4 G4 A4 B4 C#5 D5'), KALIMBA_21);
    expect(a.transpose).toBe(-2);
    expect(played(a)).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
  });

  it('moves a song into range by octaves', () => {
    const a = arrange(parseSong('C2 G2 C3'), KALIMBA_21);
    expect(a.transpose % 12).toBe(0);
    expect(a.notes.every((n) => n.fit === 'exact')).toBe(true);
  });

  it('folds notes outside the range into another octave, and skips notes the scale lacks', () => {
    // the 17-tongue kalimba starts at C4: F3 and B3 fold up, C#4 has no tongue
    const a = arrange(parseSong('C4 F3 C#4 E6 B3'), KALIMBA_17, { transpose: 0 });
    expect(played(a)).toEqual(['C4', 'F4', 'E6', 'B4']);
    expect(a.notes.map((n) => n.fit)).toEqual(['exact', 'octave', 'exact', 'octave']);
    expect(a.skipped).toEqual([{ beat: 2, midi: 61 }]);
  });

  it('prefers an octave shift over a key change when both play every note exactly', () => {
    // on the 17-tongue (C4–E6), +7 and +12 both fit; +12 keeps the song's pitches, so it still matches a recording
    const song = parseSong('F3 A3 C4 F4');
    expect(arrange(song, KALIMBA_21).transpose).toBe(0);
    const on17 = arrange(song, KALIMBA_17);
    expect(on17.notes.every((n) => n.fit === 'exact')).toBe(true);
    expect(played(on17)).toEqual(['F4', 'A4', 'C5', 'F5']);
  });

  it('plays a doubled note in a chord once', () => {
    // B3 is below the 17-tongue's range and folds onto B4, already in the chord
    const a = arrange(parseSong('[B3 B4]'), KALIMBA_17, { transpose: 0 });
    expect(played(a)).toEqual(['B4']);
  });

  it('keeps timing, tempo and title', () => {
    const a = arrange(parseSong('title: T\ntempo: 60\nC4_ E4 -'), KALIMBA_21);
    expect(a.notes.map((n) => [n.beat, n.beats])).toEqual([[0, 0.5], [0.5, 2]]);
    expect([a.title, a.beatsPerMinute, a.lengthBeats]).toEqual(['T', 60, 2.5]);
  });
});
