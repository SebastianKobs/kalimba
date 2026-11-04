// ---------- plan/blocks/oscillator: a tone, or a slow wave ----------
// A source, or a modulator as an LFO: no input, its wave out.
// Its rate a time with a sync switch, as the delay's: synced, a note value at the tempo, one
// turn each; free, its frequency in Hz, down to an LFO's. Each builder turns a synced note into
// a rate by the tempo.
// Its detune wide enough for a voice card's tune, four octaves either way: a ratio to the note
// is a tune in semitones, as pitch adds where ratios multiply.
// Its stop, where it has one.
// Its wave a setting; its phase a setting, as an analog's: reset with each note, or running free.
import { timeSpecs } from '../../../base/params/index.ts';
import { STOP, type Block } from './block.ts';

// its wave, chosen as it's built
export const WAVE = { name: 'wave', choices: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' } as const;
// its detune, in cents: what a vibrato or FM moves
export const DETUNE = { name: 'detune', unit: 'cents', range: [-100, 100, 1] } as const;
// a block's detune wide enough for a voice card's tune, four octaves either way: an
// oscillator's, a filter's
export const TUNE_DETUNE = { ...DETUNE, range: [-4800, 4800, 1], default: 0 } as const;
// its rate's three params: free to start, at an A, as an oscillator or an LFO starts;
// its free one its frequency
const RATE = timeSpecs({ unit: 'Hz', range: [0.01, 20000, 0.01], start: { sync: false, note: '1/4', free: 440 } });

export default {
  kind: 'oscillator',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [RATE.sync, RATE.note, { ...RATE.hz, name: 'frequency' }, TUNE_DETUNE, STOP],
  settings: [WAVE, { name: 'phase', choices: ['reset', 'free'], default: 'reset' }],
} as const satisfies Block;
