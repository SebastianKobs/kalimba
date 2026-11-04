import { MODULE_TEMPLATES } from '../../libs/modular-audio/plan/instrument/content.ts';
import { instrumentsOf, type Instruments } from '../../libs/modular-audio/plan/instrument/index.ts';
import kalimbaFile from './kalimba.yaml';

/** The kalimba's file of instruments: the tine's voice card and the patch that plays it. */
export const KALIMBA: Instruments = instrumentsOf(kalimbaFile, 'src/sound/kalimba.yaml', MODULE_TEMPLATES);
export const KALIMBA_PATCH = 'kalimba';
export const CLICK_PATCH = 'click';
export const TINE_CARD = 'Kalimba tine';

// a tine rings about 4.2 s to −60 dB at C4, longer the lower it is (√ of the frequency ratio), held in a range:
// as a Thomann Sun Kalimba's sound demo measures, 2.3 to 4.8 s from G5 down to B3
const RING_AT_C4 = 4.2;
const RING_RANGE = [1, 6] as const;
// the envelope's decay ends 80 dB down (libs/modular-audio/plan/blocks: DONE), the ring is measured to 60 dB
const SIXTY_TO_EIGHTY = Math.log(1e4) / Math.log(1e3);

/** The note's decay time for the voice card: how long its envelope takes to fall 80 dB, by its pitch. */
export function decayTimeFor(frequency: number): number {
  const ring = Math.min(RING_RANGE[1], Math.max(RING_RANGE[0], RING_AT_C4 * Math.sqrt(261.63 / frequency)));
  return ring * SIXTY_TO_EIGHTY;
}
