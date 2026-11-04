import type { Tongue } from '../layout';
import { decayTimeFor } from './kalimba-card';

/** A tongue as the resonance bank hears it: a narrow bandpass at its pitch. */
export interface Resonator {
  readonly frequency: number;
  readonly q: number;
}

// decayTimeFor is the time to fall 80 dB, a tine's ring is counted to 60 dB
const SIXTY_OF_EIGHTY = Math.log(1e3) / Math.log(1e4);
const LN_1000 = Math.log(1000);

/**
 * Every tongue as a resonator, as it's tuned now: excited through the bridge when another is plucked, it rings as
 * long as the tongue itself would. A two-pole resonator falls 60 dB in Q · ln 1000 / (π f), so Q = π f T60 / ln 1000.
 */
// pitchOffset: Stimmung, in semitones; the tines sound moved by it, so their resonators are too
export function resonatorsFor(tongues: readonly Tongue[], ringFactor: number, pitchOffset = 0): Resonator[] {
  return tongues.map(({ frequency: tuned }) => {
    const frequency = tuned * 2 ** (pitchOffset / 12);
    const ring = decayTimeFor(tuned) * SIXTY_OF_EIGHTY * ringFactor; // as long as the pluck rings (Plucks)
    return { frequency, q: (Math.PI * frequency * ring) / LN_1000 };
  });
}

// how fast the coupling through the bridge falls with every tongue between: neighbours 1, then ×0.51, ×0.26, …
const NEIGHBOUR_FALLOFF = 1.5;
// a tongue whose pitch is one of the plucked note's partials is driven by it, wherever it sits: the octave (2nd
// partial) most, the fifth above it (3rd) less; a few Cent off, a little less
const COINCIDENCES = [
  { ratio: 2, weight: 0.5 },
  { ratio: 3, weight: 0.3 },
] as const;
const COINCIDENCE_CENTS = 10;

/**
 * How hard a pluck knocks each tongue's resonator, 0 to 1: its neighbours on the bridge most, farther ones less,
 * and tongues at the note's octave or the fifth above it, wherever they are. The plucked tongue itself not at all:
 * it rings anyway. So every tongue's halo is its own.
 */
export function excitationFor(played: Tongue, tongues: readonly Tongue[]): number[] {
  return tongues.map((tongue) => {
    if (tongue.index === played.index) return 0;
    const near = Math.exp(-(Math.abs(tongue.index - played.index) - 1) / NEIGHBOUR_FALLOFF);
    const coincident = COINCIDENCES.reduce((sum, { ratio, weight }) => {
      const cents = 1200 * Math.log2(tongue.frequency / (ratio * played.frequency));
      return sum + weight * Math.exp(-((cents / COINCIDENCE_CENTS) ** 2));
    }, 0);
    return Math.min(1, near + coincident);
  });
}
