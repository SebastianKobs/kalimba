import { Clock, type ClockSettings } from '../../libs/sequencing/clock/index.ts';
import { KALIMBA_21, type Tongue } from '../../src/layout';
import type { ArrangedNote } from '../../src/music/arrange';
import { SongPlayer, type ScheduledSound } from '../../src/practice/song-player';

const tongue = (note: string) => KALIMBA_21.find((t) => t.note === note)!;
const note = (name: string, beat: number): ArrangedNote => ({ beat, beats: 1, tongue: tongue(name), fit: 'exact', source: { start: 0, end: 1 } });
const FOUR_FOUR = { beatsPerBar: 4, beatUnit: 4 };

// the clock in fake mode, time moving only as the test says; an audio context 100 s ahead of it, so its own time shows
function setup() {
  let clock!: Clock;
  const context = { get currentTime() { return clock.now() + 100; }, state: 'running' };
  const plucks: { note: string; t: number; velocity: number; asked: number }[] = [];
  const clicks: { accent: boolean; t: number }[] = [];
  const sound: ScheduledSound = {
    context: () => context,
    pluckAt: (t: Tongue, at: number, velocity: number) => plucks.push({ note: t.note, t: at, velocity, asked: context.currentTime }),
    clickAt: (accent: boolean, at: number) => clicks.push({ accent, t: at }),
  };
  const player = new SongPlayer(sound, (settings: ClockSettings) => {
    clock = new Clock({ settings });
    clock.useFake(0);
    return clock;
  });
  return { player, plucks, clicks, context, advance: (s: number) => clock.advance(s) };
}

describe('SongPlayer', () => {
  it('plays each note at its time on the audio clock, a bar’s lead-in from the start, scheduled ahead of it', () => {
    const { player, plucks, context, advance } = setup();
    const startedAt = context.currentTime;
    player.play({ notes: [note('C4', 0), note('E4', 1), note('G4', 2)], bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: false });
    advance(4);
    expect(plucks.map((p) => p.note)).toEqual(['C4', 'E4', 'G4']);
    expect(plucks[0]!.t - startedAt).toBeGreaterThanOrEqual(2); // a bar at 120 BPM
    expect(plucks[0]!.t - startedAt).toBeLessThan(2.6);
    expect(plucks[1]!.t - plucks[0]!.t).toBeCloseTo(0.5, 6);
    expect(plucks[2]!.t - plucks[1]!.t).toBeCloseTo(0.5, 6);
    plucks.forEach((p) => expect(p.t).toBeGreaterThan(p.asked)); // sent before its time: its voice ready as it starts
  });

  it('plucks each note never quite as hard as the last: velocity between 0.85 and 1', () => {
    const { player, plucks, advance } = setup();
    player.play({ notes: [0, 1, 2, 3, 4, 5].map((b) => note('C4', b)), bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: false });
    advance(6);
    plucks.forEach((p) => {
      expect(p.velocity).toBeGreaterThanOrEqual(0.85);
      expect(p.velocity).toBeLessThanOrEqual(1);
    });
  });

  it('tells where the song is, in its beats: none before it plays, the lead-in below 0, two beats a second at 120 BPM', () => {
    const { player, advance } = setup();
    expect(player.beat()).toBeUndefined();
    player.play({ notes: [note('C4', 0)], bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: false });
    const first = player.beat()!;
    expect(first).toBeLessThanOrEqual(-4);
    expect(first).toBeGreaterThan(-5.5);
    advance(1);
    expect(player.beat()! - first).toBeCloseTo(2, 6);
  });

  it('clicks every beat of the song where asked, its bars’ first beats accented, from the lead-in on', () => {
    const { player, plucks, clicks, advance } = setup();
    player.play({ notes: [note('C4', 0), note('E4', 1)], bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: true });
    advance(3);
    const onFirstNote = clicks.findIndex((c) => Math.abs(c.t - plucks[0]!.t) < 1e-9);
    expect(onFirstNote).toBeGreaterThanOrEqual(0);
    expect(clicks[onFirstNote]!.accent).toBe(true);
    expect(clicks[onFirstNote + 1]!.accent).toBe(false);
    expect(clicks[onFirstNote + 1]!.t - clicks[onFirstNote]!.t).toBeCloseTo(0.5, 6);
    expect(clicks[onFirstNote - 4]?.accent).toBe(true); // the lead-in's bar
  });

  it('stops: no more notes, no more clicks, and no place in a song', () => {
    const { player, plucks, clicks, advance } = setup();
    player.play({ notes: [0, 1, 2, 3, 4, 5, 6, 7].map((b) => note('C4', b)), bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: true });
    advance(2.6);
    player.stop();
    const [notesSoFar, clicksSoFar] = [plucks.length, clicks.length];
    advance(4);
    expect(plucks.length).toBe(notesSoFar);
    expect(clicks.length).toBe(clicksSoFar);
    expect(player.beat()).toBeUndefined();
  });

  it('follows the tempo as it changes mid-song, and the click as it’s switched off', () => {
    const { player, plucks, clicks, advance } = setup();
    player.play({ notes: [0, 1, 2, 3, 4, 5, 6, 7].map((b) => note('C4', b)), bpm: 120, meter: FOUR_FOUR, leadInBeats: 4, click: true });
    advance(2.8);
    player.setTempo(60);
    player.setClick(false);
    const clicksThen = clicks.length;
    advance(6);
    const gaps = plucks.slice(1).map((p, i) => p.t - plucks[i]!.t);
    expect(gaps.at(-1)).toBeCloseTo(1, 6); // a beat a second now
    expect(clicks.length).toBeLessThanOrEqual(clicksThen + 1); // one already handed out may still sound
  });
});
