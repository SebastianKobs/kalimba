// ---------- libs/base/params: a param as a plugin describes its own, and where its value lies on a control ----------
// Its parts:
//   - a param's name, unit, range, choices, default, whether a gain in dB, and its taper; a choice
//     by its index, as a controller carries it, and whether it's set at its time, not glided (spec.ts);
//   - a position on a knob, a lane or a CC turned into its value and back, the fader law among the tapers (taper.ts);
//   - a gain in dB and back, the floor of silence (decibels.ts);
//   - the specs modules share: a fader's gain, a pan, a switch (standard-specs.ts);
//   - a channel strip's own: its volume, pan, mute and solo, a send's amount (strip.ts);
//   - a time with a sync switch, its three params, found among a part's keys, and the note values it
//     steps through (time.ts);
//   - a note value in beats, a time with a sync switch in seconds by a beat's length
//     (note-values.ts).
// The synth's blocks, the FX modules and a desk's strips declare theirs on it.
export {
  atItsTime,
  choiceAt,
  choiceIndex,
  isParamSpec,
  specAt,
  type ParamSpec,
  type ParamSpecs,
  type RangedSpec,
  type Taper,
} from './spec.ts';
export { faderGain, faderPosition, positionOf, valueAt } from './taper.ts';
export { dBOf, gainOf, SILENCE } from './decibels.ts';
export { FADER_GAIN, isSwitch, PAN, SWITCH } from './standard-specs.ts';
export { SEND_PARAM, STRIP_PARAMS } from './strip.ts';
export {
  NOTE_VALUES,
  timeParamsIn,
  timeSpecs,
  type FreeUnit,
  type Time,
  type TimeParams,
  type TimeSpecs,
} from './time.ts';
export { freeAt, noteValueBeats, timeSeconds } from './note-values.ts';
