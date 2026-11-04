// ---------- plan/instrument/note: a note's sources into a voice, as a voice card's CV ----------
// As a MIDI-to-CV module hands a voice card its note:
//   - its frequency, its pitch in Hz; its gate, open while the note is held; its velocity;
//   - its volume, MIDI 2.0's per-note #7, at the voice card's output: a held note hushed;
//   - its bend, in semitones, where it slides in from;
//   - its per-note controllers, by MIDI's names where it has them: its vibrato's depth and
//     rate, its breath, its decay time; its rise, how long a held note swells.
// Each set on a voice by the macro of its name, as the note starts.
// One a note sends none of: at its default, moving nothing.
// The note's settings: how fast its pitch glides to a later pitch, its shortest, its longest.
import { SWITCH, type ParamSpec, type ParamSpecs } from '../../../base/params/index.ts';

// a note's source, by its name
export type NoteSource = keyof typeof NOTE_SOURCES;

// the note's sources, by their names
export const NOTE_SOURCES = {
  frequency: { name: 'frequency', unit: 'Hz', range: [20, 20000, 0.01], default: 440, taper: 'octaves' },
  gate: { ...SWITCH, name: 'gate', default: 0 },
  velocity: { name: 'velocity', range: [0, 1, 0.01], default: 1 },
  volume: { name: 'volume', range: [0, 1, 0.001], default: 1 },
  bend: { name: 'bend', unit: 'semitones', range: [-24, 24, 0.01], default: 0 },
  'vibrato depth': { name: 'vibrato depth', unit: 'cents', range: [0, 100, 0.1], default: 0 },
  'vibrato rate': { name: 'vibrato rate', unit: 'Hz', range: [0.1, 20, 0.01], default: 5 },
  breath: { name: 'breath', range: [0, 1, 0.01], default: 0 },
  'decay time': { name: 'decay time', unit: 's', range: [0, 10, 0.001], default: 0.1 },
  rise: { name: 'rise', unit: 's', range: [0, 30, 0.01], default: 1 },
} as const satisfies ParamSpecs;
// The note's own values, a keyboard's per-note controllers, as a test note sets them: its
// sources beside its pitch, its gate, its velocity and its volume, which every note has.
export const OWN_NOTE_VALUES: readonly ParamSpec[] = Object.values(NOTE_SOURCES).filter(
  ({ name }) => !['frequency', 'gate', 'velocity', 'volume'].includes(name),
);
// the note's settings:
//   glide: the time constant a later pitch is glided to by, 0 at once;
//   shortest: a release before it waits for it;
//   longest: a note let go then at the latest; 0 none, a held note sounding until its note off.
export const NOTE_SETTINGS = {
  glide: { name: 'glide', unit: 's', range: [0, 1, 0.001], default: 0 },
  shortest: { name: 'shortest', unit: 's', range: [0, 1, 0.01], default: 0 },
  longest: { name: 'longest', unit: 's', range: [0, 10, 0.01], default: 0 },
} as const satisfies ParamSpecs;
