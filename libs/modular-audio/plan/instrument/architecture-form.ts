// ---------- plan/instrument/architecture-form: what a voice card is, and its modules ----------
// A voice card's form, an architecture:
//   1. its sources, oscillators and noises, each into a stage or straight out;
//   2. its stages, in the order the sound goes through them, each into the next or out;
//   3. its one output, out of the card;
//   4. its modulators, LFOs, FM and envelopes, each into a param of any module.
// No loops; every way out ending in its output.
// A module's form by its job:
//   - a source: its sound out; a modulator: its signal out, into a param;
//   - a stage: a sound in and out; the output: a sound in, and out of the card.
// An instrument's form: its voices, each of a voice card's form, each into its one output.
import type { Form, FormWire } from '../planner/index.ts';
import { frozen } from '../../../base/util/index.ts';

// the roles a modulator can move a param of
const MOVED: readonly string[] = ['source', 'modulator', 'stage', 'out'];

export const SOURCE_FORM: Form = frozen<Form>({ name: 'source', inputs: [], outputs: ['out'] });
export const MODULATOR_FORM: Form = frozen<Form>({ name: 'modulator', inputs: [], outputs: ['out'] });
export const STAGE_FORM: Form = frozen<Form>({ name: 'stage', inputs: ['in'], outputs: ['out'] });
export const OUTPUT_FORM: Form = frozen<Form>({ name: 'output', inputs: ['in'], outputs: ['out'] });

export const ARCHITECTURE_FORM: Form = frozen<Form>({
  name: 'architecture',
  inputs: [],
  outputs: ['out'],
  roles: [
    { role: 'source', form: SOURCE_FORM.name, least: 1 },
    { role: 'modulator', form: MODULATOR_FORM.name },
    { role: 'stage', form: STAGE_FORM.name },
    { role: 'out', form: OUTPUT_FORM.name, least: 1, most: 1 },
  ],
  wires: [
    { from: { role: 'source', output: 'out' }, to: { role: 'stage' } },
    { from: { role: 'source', output: 'out' }, to: { role: 'out' } },
    { from: { role: 'stage', output: 'out' }, to: { role: 'stage' } },
    { from: { role: 'stage', output: 'out' }, to: { role: 'out' } },
    { from: { role: 'out', output: 'out' }, to: { parent: 'out' } },
    ...MOVED.map((role): FormWire => ({ from: { role: 'modulator', output: 'out' }, to: { role, param: true } })),
  ],
  rules: [{ rule: 'no loops' }, { rule: 'ends in', role: 'out' }],
});

export const INSTRUMENT_FORM: Form = frozen<Form>({
  name: 'instrument',
  inputs: [],
  outputs: ['out'],
  roles: [{ role: 'voice', form: ARCHITECTURE_FORM.name, least: 1 }],
  wires: [{ from: { role: 'voice', output: 'out' }, to: { parent: 'out' } }],
});

// the synth's forms: the instrument's, the architecture's, then its modules'
export const SYNTH_FORMS: readonly Form[] = frozen([
  INSTRUMENT_FORM,
  ARCHITECTURE_FORM,
  SOURCE_FORM,
  MODULATOR_FORM,
  STAGE_FORM,
  OUTPUT_FORM,
]);
