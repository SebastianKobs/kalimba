import { KALIMBA_21 } from '../../src/layout';
import type { ArrangedNote } from '../../src/music/arrange';
import { beatAt, placeOf, songClip, songPlacement } from '../../src/practice/song-clip';

const tongue = (note: string) => KALIMBA_21.find((t) => t.note === note)!;
const note = (name: string, beat: number, beats = 1): ArrangedNote => ({
  beat,
  beats,
  tongue: tongue(name),
  fit: 'exact',
  source: { start: 0, end: 1 },
});

describe('songClip', () => {
  it('is the song as a clip played once: each note at its beat in ticks, its tongue as its part, its pitch the tongue’s', () => {
    const clip = songClip([note('C4', 0), note('E4', 1.5, 0.5)], [4, 4]);
    expect(clip.events).toEqual([
      { start: 0, duration: 96, pitch: 60, part: tongue('C4').index },
      { start: 144, duration: 48, pitch: 64, part: tongue('E4').index },
    ]);
  });

  it('counts a beat as the meter’s unit: an eighth in 6/8', () => {
    const clip = songClip([note('C4', 3)], [6, 8]);
    expect(clip.events[0]).toMatchObject({ start: 3 * 48, duration: 48 });
  });

  it('gives every note some length, however short it was written', () => {
    expect(songClip([note('C4', 0, 0)], [4, 4]).events[0]!.duration).toBeGreaterThan(0);
  });
});

describe('songPlacement', () => {
  it('starts the song on the first beat at least the lead-in after now, and not before the 16ths already handed out', () => {
    // now at 16th 10.3 in 4/4: a bar's lead-in reaches 26.3, the next beat line is 28
    expect(songPlacement({ now: 10.3, handedOut: 12, leadInBeats: 4, stepsPerBeat: 4, firstBeat: 0 }).startStep).toBe(28);
    // the 16ths up to 30 already scheduled: the next beat line after them
    expect(songPlacement({ now: 10.3, handedOut: 30, leadInBeats: 4, stepsPerBeat: 4, firstBeat: 0 }).startStep).toBe(32);
  });

  it('maps the song’s beats onto the grid and back: its first note’s beat on its start, a beat a beat’s 16ths on', () => {
    const placement = songPlacement({ now: 0, handedOut: 0, leadInBeats: 4, stepsPerBeat: 4, firstBeat: 0 });
    expect(placeOf(placement, 0)).toBe(16);
    expect(placeOf(placement, 2.5)).toBe(26);
    expect(beatAt(placement, 26)).toBe(2.5);
    expect(beatAt(placement, 0)).toBe(-4); // a bar before: the lead-in
  });

  it('keeps a song that starts later in its bar where it was written: whole beats before its first note dropped as the clip drops them', () => {
    const placement = songPlacement({ now: 0, handedOut: 0, leadInBeats: 4, stepsPerBeat: 4, firstBeat: 4.5 });
    expect(placeOf(placement, 4.5)).toBe(18); // its start's beat line, and half a beat in
    expect(beatAt(placement, 16)).toBe(4);
  });
});
