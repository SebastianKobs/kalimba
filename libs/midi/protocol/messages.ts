// ---------- libs/midi/protocol/messages: what a control surface plays, MIDI 2.0's channel voice messages as values ----------
// MIDI 2.0's model and names, not its packets (M2-104-UM):
//   - values in plain units: a velocity 0 to 1, a pitch a MIDI note number,
//     each at a clock time;
//   - a note's index its note number as its source hands it out (rotation.ts),
//     so two notes of one pitch keep apart;
//   - its kinds: note on and note off; per-note controllers and per-note
//     management, how a note is heard; a track's controllers.
// A controller's change, a per-note one's too, carries how it moves there,
// as an automation point's curve: jumping at its time, or gliding from it by
// a time constant (glide), so what's recorded plays back as it was heard
import type { Seconds } from '../../base/util/index.ts';
import type { TimedValue } from '../../base/automation/index.ts';

// a note that starts: its index, pitch and velocity; which part of its clip's owner sounds it, by its number
export interface NoteOn {
  type: 'note on';
  index: number;
  pitch: number;
  velocity: number;
  t: Seconds;
  part?: number | undefined;
}
// a note let go: its index, sent with its note on where its length is known as it starts
export interface NoteOff {
  type: 'note off';
  index: number;
  t: Seconds;
}
// A note's per-note controllers, each in its own units, not MIDI's numbers.
// MIDI 2.0's registered ones (M2-104-UM, Appendix A, Table 11):
//   - those a note is heard by: #7 Volume a gain, #10 Pan from -1 to 1,
//     #74 Brightness a lowpass's cutoff in Hz, #91 Effects 1 Depth its reverb
//     send's gain;
//   - how it's played: #77 Vibrato Depth in cents, #76 Vibrato Rate in Hz,
//     #2 Breath from 0 to 1, #75 Decay Time in seconds;
//   - #3 Pitch 7.25, a MIDI note number, which the spec gives a sender that
//     controls a note's pitch all its life, its glides too (4.2.14).
// Assignable ones, by name, a note's own values: its rise, in seconds, how
// long a held note swells; its bend, in semitones, where it slides in from.
export type PerNoteControllerName =
  | 'volume'
  | 'pan'
  | 'brightness'
  | 'effects 1 depth'
  | 'vibrato depth'
  | 'vibrato rate'
  | 'breath'
  | 'decay time'
  | 'pitch'
  | 'rise'
  | 'bend';
// a note's per-note controllers' values, by name
export type PerNoteValues = Partial<Record<PerNoteControllerName, number>>;
// one of a note's per-note controllers: sent with its note on, its value as it starts; sent later, a change
export interface PerNoteController extends TimedValue {
  type: 'per-note controller';
  index: number;
  controller: PerNoteControllerName;
}
// one of a track's controllers: a parameter of the track's by its name, as a controller's knob is mapped to one in Ableton, in its units
//, as the track's instrument maps it
export interface Controller extends TimedValue {
  type: 'controller';
  controller: string;
}
// per-note management, its detach flag set: the note's per-note controllers detached from it, sent once it has rung out, so its index
// can be handed out again (MIDI 2.0's reset flag comes when a step needs it)
export interface PerNoteManagement {
  type: 'per-note management';
  index: number;
  detach: true;
  t: Seconds;
}
export type Message = NoteOn | NoteOff | PerNoteController | Controller | PerNoteManagement;
// a note as its messages give it: its note on, its length where its note off came with it, its per-note controllers sent with it, its
// values as it starts, and its #3 Pitch changes sent with it, its glides, each [when, pitch]
export interface SentNote {
  noteOn: NoteOn;
  duration: Seconds | undefined;
  controllers: PerNoteValues;
  glides: [at: Seconds, pitch: number][];
}

// a note to send: its pitch, velocity and time, the part of its clip's element that sounds it; its length, where it's known as it
// starts; its per-note controllers' values as it starts, one with none left out; its glides, each [when, pitch]
export interface NoteToSend {
  pitch: number;
  velocity: number;
  t: Seconds;
  part?: number | undefined;
  duration?: Seconds | undefined;
  controllers?: Partial<Record<PerNoteControllerName, number | undefined>> | undefined;
  glides?: readonly (readonly [at: Seconds, pitch: number])[] | undefined;
}

// A note's messages, as notesIn() reads them back:
//   1. its note on;
//   2. its values as it starts, each a per-note controller, sent at valuesAt (its time, unless asked);
//   3. its glides, each #3 Pitch 7.25 at its time;
//   4. its note off, where its length is known.
export function noteMessages(
  { pitch, velocity, t, part, duration, controllers = {}, glides = [] }: NoteToSend,
  index: number,
  valuesAt = t,
): Message[] {
  const noteOn: NoteOn = { type: 'note on', index, pitch, velocity, t, ...(part === undefined ? {} : { part }) };
  const values = (Object.entries(controllers) as [PerNoteControllerName, number | undefined][]).flatMap(
    ([controller, value]): PerNoteController[] =>
      value === undefined ? [] : [{ type: 'per-note controller', index, controller, value, t: valuesAt }],
  );
  const glided = glides.map(([at, to]): PerNoteController => ({
    type: 'per-note controller',
    index,
    controller: 'pitch',
    value: to,
    t: at,
  }));
  const noteOff: NoteOff[] = duration === undefined ? [] : [{ type: 'note off', index, t: t + duration }];
  return [noteOn, ...values, ...glided, ...noteOff];
}
// the notes among the messages, each with its length where its note off is among them too, and its per-note controllers among them
export function notesIn(messages: readonly Message[]): SentNote[] {
  const noteOffs = messages.filter((message) => message.type === 'note off');
  const controllers = messages.filter((message) => message.type === 'per-note controller');
  return messages
    .filter((message) => message.type === 'note on')
    .map((noteOn) => ({
      noteOn,
      duration: durationOf(noteOn, noteOffs),
      controllers: controllersOf(noteOn, controllers),
      glides: glidesOf(noteOn, controllers),
    }));
}
function durationOf(noteOn: NoteOn, noteOffs: readonly NoteOff[]): Seconds | undefined {
  const noteOff = noteOffs.find((off) => off.index === noteOn.index);
  if (!noteOff) {
    return undefined;
  }
  return noteOff.t - noteOn.t;
}
function controllersOf(noteOn: NoteOn, controllers: readonly PerNoteController[]): PerNoteValues {
  const its = controllers.filter((sent) => sent.index === noteOn.index && sent.controller !== 'pitch');
  return Object.fromEntries(its.map((sent) => [sent.controller, sent.value]));
}
function glidesOf(noteOn: NoteOn, controllers: readonly PerNoteController[]): [Seconds, number][] {
  const its = controllers.filter((sent) => sent.index === noteOn.index && sent.controller === 'pitch');
  return its.map((sent): [Seconds, number] => [sent.t, sent.value]);
}
// Messages on another clock: each one's time moved by the clock's own (at), the rest as it was.
export function retimed(messages: readonly Message[], at: (t: Seconds) => Seconds): Message[] {
  return messages.map((message) => ({ ...message, t: at(message.t) }));
}
