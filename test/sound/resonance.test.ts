import { KALIMBA_21, retune } from '../../src/layout';
import { decayTimeFor } from '../../src/sound/kalimba-card';
import { excitationFor, resonatorsFor } from '../../src/sound/resonance';

const LN_1000 = Math.log(1000);
// the envelope's decay ends 80 dB down; a resonator's ring is meant to 60 dB, as a tine's
const ringOf = (frequency: number, factor = 1) => (decayTimeFor(frequency) * factor * LN_1000) / Math.log(1e4);

describe('resonatorsFor', () => {
  it('gives every tongue a resonator at its pitch, ringing as long as the tongue would', () => {
    const resonators = resonatorsFor(KALIMBA_21, 1);
    expect(resonators).toHaveLength(21);
    const c4 = resonators[KALIMBA_21.findIndex((t) => t.note === 'C4')]!;
    expect(c4.frequency).toBeCloseTo(261.63, 2);
    // a resonator rings to −60 dB in T60 = Q · ln 1000 / (π f): its Q from the tongue's ring
    expect(c4.q).toBeCloseTo((Math.PI * c4.frequency * ringOf(c4.frequency)) / LN_1000, 3);
  });

  it('follows a retuned tongue', () => {
    const raised = retune(KALIMBA_21, KALIMBA_21.map((t) => (t.note === 'F4' ? 1 : 0)));
    const f4place = KALIMBA_21.findIndex((t) => t.note === 'F4');
    expect(resonatorsFor(raised, 1)[f4place]!.frequency).toBeCloseTo(369.99, 2);
  });

  it('moves with Stimmung, as the tines it rings along with', () => {
    const c4place = KALIMBA_21.findIndex((t) => t.note === 'C4');
    expect(resonatorsFor(KALIMBA_21, 1, 0.2)[c4place]!.frequency).toBeCloseTo(KALIMBA_21[c4place]!.frequency * 2 ** (0.2 / 12), 6);
  });

  it('rings shorter with a shorter Nachklang', () => {
    const [full, half] = [resonatorsFor(KALIMBA_21, 1)[0]!, resonatorsFor(KALIMBA_21, 0.5)[0]!];
    expect(half.q / full.q).toBeCloseTo(0.5, 6);
  });
});

describe('excitationFor', () => {
  const at = (note: string) => KALIMBA_21.findIndex((t) => t.note === note);
  const excite = (note: string) => excitationFor(KALIMBA_21[at(note)]!, KALIMBA_21);

  it('leaves the plucked tongue alone: it rings anyway', () => {
    expect(excite('C4')[at('C4')]).toBe(0);
  });

  it('knocks its neighbours on the bridge most, less with every tongue between', () => {
    const weights = excite('C4');
    expect(weights[at('A3')]).toBe(1);
    expect(weights[at('E4')]).toBe(1);
    expect(weights[at('G4')]!).toBeLessThan(1);
    expect(weights[at('B4')]!).toBeLessThan(weights[at('G4')]!);
  });

  it('rings the tongue an octave up along, though it’s far: the note’s 2nd partial is its pitch', () => {
    const weights = excite('C4');
    expect(weights[at('C5')]!).toBeGreaterThan(0.4);
    expect(weights[at('C5')]!).toBeGreaterThan(weights[at('D5')]!);
  });

  it('rings the fifth above the octave along too, a little less', () => {
    const weights = excite('C4');
    expect(weights[at('G5')]!).toBeGreaterThan(0.2);
    expect(weights[at('G5')]!).toBeLessThan(weights[at('C5')]!);
  });

  it('sounds different for every tongue: an edge tongue knocks its own neighbours', () => {
    const weights = excite('E6');
    expect(weights[at('C6')]).toBe(1);
    expect(weights[at('A3')]!).toBeLessThan(0.01);
  });

  it('weighs coincidences as the tongues are tuned: an octave retuned away rings along less', () => {
    const raised = retune(KALIMBA_21, KALIMBA_21.map((t) => (t.note === 'C5' ? 1 : 0)));
    const weights = excitationFor(raised[at('C4')]!, raised);
    expect(weights[at('C5')]!).toBeLessThan(excite('C4')[at('C5')]! / 2);
  });
});

