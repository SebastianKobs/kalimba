import { macroIn, paramAt, settingAt, type Composite } from '../../libs/modular-audio/plan/format/index.ts';
import { cardPlanner, patchPlan } from '../../libs/modular-audio/plan/instrument/index.ts';
import { CLICK_PATCH, decayTimeFor, KALIMBA, KALIMBA_PATCH, TINE_CARD } from '../../src/sound/kalimba-card';

const card = () => cardPlanner(KALIMBA).plan(TINE_CARD);
// each mode's frequency: the note's times its factor, detuned by its tune in semitones
const ratio = (source: string) =>
  macroIn(card().node, ['frequency'])!.maps.find((m) => m.to[0] === source)!.factor *
  2 ** ((paramAt(card(), [source, 'tune'])?.value as number) / 12);

describe('the kalimba voice card', () => {
  it('plans as an instrument of tine voices, the architecture form satisfied', () => {
    expect(() => patchPlan(KALIMBA_PATCH, KALIMBA)).not.toThrow();
  });

  it('rings at a tine’s modes: the note, a twin a hair above, weak harmonics, the beam’s bending modes', () => {
    const ratios = ['tine', 'twin', '2nd', '3rd', 'ping', 'ting'].map(ratio);
    // the bending modes as a Thomann Sun Kalimba's demo has them (6.5×, 17.3×)
    const expected = [1, 1.0017, 2, 3, 6.5, 17.3];
    ratios.forEach((r, i) => expect(r).toBeCloseTo(expected[i]!, 4));
  });

  it('sends the thumb’s click beside the lowpass, so Helligkeit darkens the tine and not the click', () => {
    const wires = (card().node as Composite).wires;
    const into = (node: string) => wires.filter((w) => 'node' in w.from && w.from.node === node).map((w) => ('node' in w.to ? w.to.node : 'out'));
    expect(into('click vca')).toEqual(['out']);
    expect(into('ring vca')).toEqual(['tone']);
  });

  it('passes the tine through a lowpass before its output, at 3500 Hz as written', () => {
    expect(settingAt(card(), ['tone', 'filter', 'type'])?.value).toBe('lowpass');
    expect(paramAt(card(), ['tone', 'cutoff'])?.value).toBe(3500);
  });

  it('damps every partial quickly at the note’s end, as a finger on a tine does', () => {
    const envelopes = ['ring env', 'harmonics env', 'ping env', 'click env', 'knock env'];
    expect(envelopes.map((e) => settingAt(card(), [e, 'envelope', 'mode'])?.value)).toEqual(envelopes.map(() => 'gate'));
    expect(envelopes.map((e) => paramAt(card(), [e, 'release'])?.value)).toEqual(envelopes.map(() => 0.03));
  });

  it('rings as long as the note’s decay time says, its harmonics a little shorter', () => {
    const decay = macroIn(card().node, ['decay time']);
    const factors = Object.fromEntries((decay?.maps ?? []).map((m) => [m.to.join('/'), m.factor]));
    expect(factors).toEqual({ 'ring env/decay': 1, 'harmonics env/decay': 0.7 });
  });
});

describe('the metronome click', () => {
  it('plans as an instrument of its own', () => {
    expect(() => patchPlan(CLICK_PATCH, KALIMBA)).not.toThrow();
  });
});

describe('decayTimeFor', () => {
  // the envelope's decay ends 80 dB down; a tine's ring is measured to 60 dB
  const toEighty = Math.log(1e4) / Math.log(1e3);

  // as a Thomann Sun Kalimba's demo rings: 2.3 to 4.8 s from G5 down to B3
  it('rings 4.2 s to −60 dB at C4, longer below, shorter above', () => {
    expect(decayTimeFor(261.63)).toBeCloseTo(4.2 * toEighty, 2);
    expect(decayTimeFor(174.61)).toBeGreaterThan(decayTimeFor(261.63));
    expect(decayTimeFor(1318.51)).toBeLessThan(decayTimeFor(261.63));
  });

  it('stays between 1 s and 6 s to −60 dB at the extremes', () => {
    expect(decayTimeFor(20)).toBeCloseTo(6 * toEighty, 2);
    expect(decayTimeFor(10000)).toBeCloseTo(1 * toEighty, 2);
  });
});
