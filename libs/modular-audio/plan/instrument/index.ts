// ---------- libs/modular-audio/plan/instrument: the synth's templates and forms ----------
// A voice card, an architecture: its modules, a YAML template each, wired by its form; the note's
// sources its macros, set as each note starts.
// Its parts:
//   - note.ts: a note's sources into a voice, as a voice card's CV, and the note's settings;
//   - architecture-form.ts: what a voice card is, its modules' forms by their jobs, an
//     instrument's;
//   - instrument.ts: an instrument, a pool of voices, or a drum rack, a pool for each pad;
//   - preset.ts: a preset changed, each value and setting that differs, by its address; edited as
//     messages on a bus ask (PresetMessage);
//   - live-bank.ts: a bank's patches as they play, edited or reset
//     as messages on a bus ask;
//   - instruments-file.ts: a file of instruments, patches and racks, as a person writes it, read;
//   - patch-plans.ts: a patch's instrument planned from a file of instruments, by its name, and
//     the planner of its voice cards;
//   - test-note.ts: a device view's test note, and its message, pressed and let go;
//   - content.ts, modules/: the modules, VCO, Noise source, LFO, FM, Envelope generator,
//     VCA, VCF, Tremolo, Ring, Out; none named as a block is; imported apart.
// Its content read as it loads, its shape checked, every failure said, naming its file.
// Handed to the planner, with the forms.
export { NOTE_SETTINGS, NOTE_SOURCES, OWN_NOTE_VALUES, type NoteSource } from './note.ts';
export { LiveBank } from './live-bank.ts';
export { instrumentOf, type Chain } from './instrument.ts';
export { instrumentsOf, type Instruments, type RackPad } from './instruments-file.ts';
export { changesFrom, edited, type Changes, type PresetMessage } from './preset.ts';
export {
  ARCHITECTURE_FORM,
  INSTRUMENT_FORM,
  MODULATOR_FORM,
  OUTPUT_FORM,
  SOURCE_FORM,
  STAGE_FORM,
  SYNTH_FORMS,
} from './architecture-form.ts';
export { cardPlanner, chainsOf, patchPlan } from './patch-plans.ts';
export type { TestNote, TestNoteMessage } from './test-note.ts';
