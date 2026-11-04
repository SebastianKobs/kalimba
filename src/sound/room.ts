import { EFFECT_TEMPLATES } from '../../libs/modular-audio/plan/effects/content.ts';
import { EFFECT_FORM } from '../../libs/modular-audio/plan/effects/index.ts';
import type { Plan } from '../../libs/modular-audio/plan/format/index.ts';
import { Planner } from '../../libs/modular-audio/plan/planner/index.ts';

/** A small room around the kalimba: a bit of reverb, not a hall. */
export const ROOM_SECONDS = 1.5;

/** The room as stim-garden's Reverb effect plans it. */
export function roomPlan(): Plan {
  return new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]).plan('Reverb', { name: 'room', settings: { length: ROOM_SECONDS } });
}
