import { KALIMBA_21, retune } from '../../src/layout';
import { decayTimeFor } from '../../src/sound/kalimba-card';
import { clickMessages, Plucks } from '../../src/sound/plucks';

const tongue = (note: string) => KALIMBA_21.find((t) => t.note === note)!;
// a note's index: every message here is a note's
const indexOf = (message: unknown) => (message as { index: number }).index;

describe('Plucks', () => {
  it('turns a pluck into a note on at the tongue’s pitch, its decay time, and its note off once it has rung', () => {
    const c4 = tongue('C4');
    const [on, decay, off] = new Plucks().pluck(c4, 1, 0.9);
    expect(on).toMatchObject({ type: 'note on', pitch: 60, velocity: 0.9, t: 1 });
    expect(decay).toMatchObject({ type: 'per-note controller', index: indexOf(on), controller: 'decay time', t: 1 });
    expect((decay as { value: number }).value).toBeCloseTo(decayTimeFor(c4.frequency), 6);
    expect(off).toMatchObject({ type: 'note off', index: indexOf(on) });
    expect((off as { t: number }).t).toBeCloseTo(1 + decayTimeFor(c4.frequency), 6);
  });

  it('damps a tongue plucked again while it rings: its earlier note let go at once', () => {
    const plucks = new Plucks();
    const [first] = plucks.pluck(tongue('C4'), 1, 1);
    const again = plucks.pluck(tongue('C4'), 1.5, 1);
    expect(again[0]).toEqual({ type: 'note off', index: indexOf(first), t: 1.5 });
    expect(again[1]).toMatchObject({ type: 'note on', t: 1.5 });
    expect(indexOf(again[1])).not.toBe(indexOf(first));
  });

  it('leaves other tongues ringing, and a tongue that has rung out alone', () => {
    const plucks = new Plucks();
    plucks.pluck(tongue('C4'), 0, 1);
    expect(plucks.pluck(tongue('E4'), 0.5, 1)[0]).toMatchObject({ type: 'note on' });
    expect(plucks.pluck(tongue('C4'), 20, 1)[0]).toMatchObject({ type: 'note on' });
  });

  it('plays a retuned tongue at its new pitch', () => {
    const raised = retune(KALIMBA_21, KALIMBA_21.map((t) => (t.note === 'F4' ? 1 : 0)));
    const [on] = new Plucks().pluck(raised.find((t) => t.note === 'F#4')!, 0, 1);
    expect(on).toMatchObject({ pitch: 66 });
  });
});

describe('Plucks with the Klang panel’s Stimmung and Nachklang', () => {
  it('moves every pluck’s pitch and scales how long it rings', () => {
    const c4 = tongue('C4');
    const [on, decay, off] = new Plucks(() => ({ pitchOffset: 0.25, ringFactor: 0.5 })).pluck(c4, 0, 1);
    expect(on).toMatchObject({ pitch: 60.25 });
    expect((decay as { value: number }).value).toBeCloseTo(decayTimeFor(c4.frequency) * 0.5, 6);
    expect((off as { t: number }).t).toBeCloseTo(decayTimeFor(c4.frequency) * 0.5, 6);
  });
});

describe('clickMessages', () => {
  it('is a short high note, the first beat of a bar higher and louder', () => {
    const [accentOn, accentOff] = clickMessages(true, 2, 7);
    const [plainOn] = clickMessages(false, 3, 8);
    expect(accentOn).toMatchObject({ type: 'note on', index: 7, t: 2 });
    expect(accentOff).toMatchObject({ type: 'note off', index: 7 });
    expect((accentOn as { pitch: number }).pitch).toBeGreaterThan((plainOn as { pitch: number }).pitch);
    expect((accentOn as { velocity: number }).velocity).toBeGreaterThan((plainOn as { velocity: number }).velocity);
  });
});
