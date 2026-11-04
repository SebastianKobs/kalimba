import { arrange, transposeOptions } from '../../src/music/arrange';
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

  it('keeps where each note was written', () => {
    const text = 'D4 F#4';
    const a = arrange(parseSong(text), KALIMBA_21);
    expect(a.notes.map((n) => text.slice(n.source.start, n.source.end))).toEqual(['D4', 'F#4']);
  });

  it('keeps timing, tempo and title', () => {
    const a = arrange(parseSong('title: T\ntempo: 60\nC4_ E4 -'), KALIMBA_21);
    expect(a.notes.map((n) => [n.beat, n.beats])).toEqual([[0, 0.5], [0.5, 2]]);
    expect([a.title, a.beatsPerMinute, a.lengthBeats]).toEqual(['T', 60, 2.5]);
  });

  it('moves a G major tab from a 17-tongue kalimba with raised F down a fifth onto the C 21', () => {
    // C4–E6 with F#: up a fourth would leave the range, down a fifth lands on F3–A5
    const a = arrange(parseSong('key: G\n1 4 1″ 3″'), KALIMBA_21);
    expect(a.transpose).toBe(-7);
    expect(played(a)).toEqual(['F3', 'B3', 'F5', 'A5']);
    expect(a.notes.every((n) => n.fit === 'exact')).toBe(true);
  });
});

describe('transposeOptions', () => {
  const summary = (text: string) =>
    transposeOptions(parseSong(text), KALIMBA_21).map((o) => [o.transpose, o.exact, o.folded, o.skipped]);

  it('offers both ways from G major to C, the best fit first', () => {
    // down a fifth fits; up a fourth sends E6 over the top tongue; up an octave and a fourth folds 2 of 9
    expect(summary('key: G\n1 2 3 4 5 6 7 1′ 3″')).toEqual([[-7, 9, 0, 0], [5, 8, 1, 0], [17, 7, 2, 0]]);
  });

  it('offers octaves of a song that already fits, leaving out those that fold too much', () => {
    expect(summary('C4 D4 E4 F4 G4 A4 B4 C5')).toEqual([[0, 8, 0, 0], [12, 8, 0, 0]]);
  });

  it('puts first what arrange picks by itself', () => {
    const song = parseSong('D4 E4 F#4 G4 A4 B4 C#5 D5');
    expect(transposeOptions(song, KALIMBA_21)[0].transpose).toBe(arrange(song, KALIMBA_21).transpose);
  });

  it('offers at most six', () => {
    expect(transposeOptions(parseSong('C4 E4'), KALIMBA_21).length).toBeLessThanOrEqual(6);
  });
});
