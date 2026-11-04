import { buildingIn } from '../../libs/modular-audio/build/web-audio-engine/index.ts';
import { Buffers } from '../../libs/modular-audio/build/web-audio/index.ts';
import { EFFECT_TEMPLATES } from '../../libs/modular-audio/plan/effects/content.ts';
import { EFFECT_FORM } from '../../libs/modular-audio/plan/effects/index.ts';
import type { Plan } from '../../libs/modular-audio/plan/format/index.ts';
import { Planner } from '../../libs/modular-audio/plan/planner/index.ts';

/** The level the sound was tuned at by ear, into the limiter, which holds the loudest chords under full scale. */
export const MASTER_LEVEL = 0.5;

/**
 * The limiter as stim-garden's Limiter effect plans it, at its own ceiling (-0.3 dBFS): hard as Web Audio's compressor goes, its makeup gain
 * taken back. Web Audio's compressor alone adds that gain and let chords past full scale: they clipped, heard most on a phone.
 * Measured in Firefox: like any Web Audio compressor it softens a pluck's first milliseconds (about 10 dB, at any level), the ringing untouched;
 * the Anschlag was tuned by ear through that.
 */
export function limiterPlan(): Plan {
  return new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]).plan('Limiter', { name: 'limiter' });
}

/** The master on its way to the destination, the player's and an offline render's alike: its level into the limiter. Returns its input. */
export function masterInto(context: BaseAudioContext, destination: AudioNode): AudioNode {
  const level = context.createGain();
  level.gain.value = MASTER_LEVEL;
  const building = buildingIn({ context, into: destination, at: (t) => t, beat: () => 0.5, buffers: new Buffers(context, Math.random) });
  building.builder.build(limiterPlan(), { into: destination, from: { in: level } });
  return level;
}
