import { Instrument } from '../../libs/modular-audio/build/instrument/index.ts';
import { Buffers } from '../../libs/modular-audio/build/web-audio/index.ts';
import { buildingIn } from '../../libs/modular-audio/build/web-audio-engine/index.ts';
import type { Instruments } from '../../libs/modular-audio/plan/instrument/index.ts';
import { CLICK_PATCH, KALIMBA, KALIMBA_PATCH } from './kalimba-card';

// tines ring up to ~4.6 s: a fast run needs more voices than a synth's 16
const POLYPHONY = 24;

export interface KalimbaInstruments {
  readonly kalimba: Instrument<AudioNode>;
  readonly click: Instrument<AudioNode>;
}

/**
 * Edge: the kalimba's and the click's instruments, built from their voice cards in a context, into a node.
 * One way for the live player and an offline render alike, so a render hears what's played.
 */
// instruments: the file, its patches as they play now (the Klang panel's edits), or as it began
export function kalimbaInstruments(
  context: BaseAudioContext,
  into: AudioNode,
  random: () => number = Math.random,
  instruments: Instruments = KALIMBA,
): KalimbaInstruments {
  const building = buildingIn({ context, into, at: (t) => t, beat: () => 0.5, buffers: new Buffers(context, random) });
  const instrument = (patch: string) => new Instrument({ instruments, patch, ...building, polyphony: () => POLYPHONY });
  return { kalimba: instrument(KALIMBA_PATCH), click: instrument(CLICK_PATCH) };
}
