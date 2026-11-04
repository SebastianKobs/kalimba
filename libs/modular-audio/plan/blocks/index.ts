// ---------- plan/blocks: the building blocks, declared ----------
// Nodes with no inside: the contract every builder meets, each one built or a placeholder
// put in. Kept small and fixed.
// Its parts:
//   - block.ts: a block, its inputs and outputs, its params' and settings' specs;
//   - blocks.ts: every block by its kind;
//   - one file each: oscillator, gain, filter, pan, delay, reverb, noise, limiter, envelope,
//     select, with the specs other code shares (a delay's time, a limiter's, an envelope's, a
//     source's stop);
//   - envelope-curve.ts: how an envelope moves, stage by stage from its gate, as automation, as
//     an ARP's.
export { STOP, type Block, type Jack } from './block.ts';
export { BLOCKS, type BlockKind } from './blocks.ts';
export { DELAY_TIME } from './delay.ts';
export { ENVELOPE_SPECS } from './envelope.ts';
export { CHARGED, DONE, envelopeCurve, envelopeRelease, envelopeStages, type EnvelopeTimes } from './envelope-curve.ts';
export { biquadQs, FILTER_SLOPE, RESONANCE, type FilterStages } from './filter.ts';
export { LIMITER_SPECS } from './limiter.ts';
export { NOISE_SECONDS } from './noise.ts';
export { DETUNE, WAVE } from './oscillator.ts';
export { REVERB_LENGTH } from './reverb.ts';
