// ---------- midi-sequencer/input: where a control surface plays into the sequencer, which alone plays the synths ----------
// As a track's monitoring passes a controller on, a track's messages go to its
// instrument at once, a function call, no latency added; and into its stream as the play they make (onPlay(), its own),
// so what's heard is what's recorded. The way back, as Ableton lights a controller's pads: each note passed
// on handed to whoever listens (onNote()), the surface lighting it
import {
  NoteRotation,
  notesIn,
  type Controller,
  type Message,
  type NoteOff,
  type PerNoteController,
  type Receiver,
  type SentNote,
} from '../../midi/protocol/index.ts';
import type { Play, PlayedNote, PlayListener } from './stream.ts';
import { entryOf, Events, type Seconds } from '../../base/util/index.ts';
import { Monitoring } from './monitoring.ts';

// Where messages go:
//   - the track they play on;
//   - the clip they're of (its owner, by its kind), as notes are;
//   - whether they're played live;
//   - what the stream carries of a play beside its notes (play: its track's
//     number, until when), and of a track's own controllers, its kind and
//     number as its other plays carry them;
//   - who sends, kept apart on a track from another sender, so two senders'
//     notes of one index don't meet at its instrument.
export interface SentTo<Name extends string> {
  track: Name;
  clip?: { kind: string } | undefined;
  live?: boolean | undefined;
  play?: Partial<Play> | undefined;
  source?: string | undefined;
}
// a track, as the sequencer plays it: the messages handed it, at once (Receiver, libs/midi/protocol/), its notes to its instrument, its controllers
// to its strip, its user's; and its role, the stream's label for what it plays
export interface Track extends Receiver {
  readonly role: string;
}
// a note passed on, handed back where it went: its track, any of the
// sequencer's, its clip, whether it's played live
export type NoteListener = (to: SentTo<string>, note: SentNote) => void;
// a note off sent after its note, a held note's, handed back where it went
export type NoteOffListener = (to: SentTo<string>, end: NoteOff) => void;
// what's sent after its note, a held note's: its note off, its glides, its other per-note controllers' changes
interface AfterTheirNotes {
  ends: NoteOff[];
  changes: PerNoteController[];
}
// what a control surface plays into: its tracks' messages, each at its clock time; and the way back, each note as it's passed on, until
// stopped (onNote() returns how): every surface's, on every track, as one sequencer has them all, a surface lighting its own
export interface Input<Name extends string> {
  send(to: SentTo<Name>, messages: readonly Message[]): void;
  onNote(listener: NoteListener): () => void;
  onNoteOff(listener: NoteOffListener): () => void;
}

// what the sequencer hands whoever listens: every play it passes on, its stream; the way back, each note and each note off
// sent after its note
type SequencerEvents = {
  play: [play: Play];
  note: [to: SentTo<string>, note: SentNote];
  'note off': [to: SentTo<string>, end: NoteOff];
};

// each track, looked up by its name, as a pool's track is made the first
// time it's played on
export class Sequencer<Name extends string> implements Input<Name> {
  readonly #tracks: (track: Name) => Track;
  readonly #events = new Events<SequencerEvents>(); // its own, so two sequencers are heard apart
  readonly #apart = new Map<string, { rotation: NoteRotation; indices: Map<string, number> }>(); // each track's indices, by sender
  readonly #monitoring = new Monitoring<Name>(); // which senders are heard

  constructor({ tracks }: { tracks: (track: Name) => Track }) {
    this.#tracks = tracks;
  }
  // a sender's monitoring switched off from t, or on again, as a DAW's input monitoring: its held notes hushed to
  // 0, or brought back to their last volume, each gliding by fade, sent to the tracks, not into the stream, so
  // not recorded; while off, its new notes and controllers from t are dropped, an earlier note's end passed
  monitor(source: string | undefined, on: boolean, t: Seconds, fade: Seconds): void {
    if (on) {
      this.#monitoring.switchOn(source);
    } else {
      this.#monitoring.switchOff(source, t);
    }
    for (const { track, index, volume } of this.#monitoring.heldBy(source)) {
      const value = on ? volume : 0;
      this.#tracks(track).receive([
        { type: 'per-note controller', index, controller: 'volume', value, t, glide: fade },
      ]);
    }
  }
  send(to: SentTo<Name>, sent: readonly Message[]): void {
    const messages = this.#monitoring.passed(to.track, to.source, sent);
    const track = this.#tracks(to.track);
    const apart = this.#keptApart(to, messages);
    this.#monitoring.keep(to.track, to.source, apart);
    track.receive(apart);
    const notes = notesIn(messages);
    const after = afterTheirNotes(messages);
    const controls = controlsIn(messages);
    if (notes.length || heardAfter(after) || controls.length) {
      this.#events.emit('play', playOf(to, track.role, notes, after, controls)); // a note's per-note management alone is its bookkeeping
    }
    for (const note of notes) {
      this.#events.emit('note', to, note); // once its instrument and the stream have it
    }
    for (const end of after.ends) {
      this.#events.emit('note off', to, end);
    }
  }
  // every play it passes on, as it's heard, to a listener, until stopped: a recorder, a session view
  onPlay(listener: PlayListener): () => void {
    return this.#events.on('play', listener);
  }
  onNote(listener: NoteListener): () => void {
    return this.#events.on('note', listener);
  }
  // each note off sent after its note, a held note's, to whoever listens, once its instrument and the stream have it: the way back of a
  // key let go, as a controller's pad goes dark
  onNoteOff(listener: NoteOffListener): () => void {
    return this.#events.on('note off', listener);
  }
  // the messages as the track's instrument hears them: each note an index of the track's own, by its sender, so two senders' notes of one
  // index don't meet there; the stream and the way back keep each sender's own. A note off frees the track's
  // index for a new note, last in turn; what the sender sends for its note after, as it rings out, still goes to it, until the sender
  // detaches it or starts another note on its index
  #keptApart(to: SentTo<Name>, messages: readonly Message[]): Message[] {
    const { rotation, indices } = entryOf(this.#apart, to.track, () => ({
      rotation: new NoteRotation(),
      indices: new Map<string, number>(),
    }));
    return messages.map((message) => {
      if (!('index' in message)) {
        return message;
      }
      const sent = `${to.source ?? ''}\n${message.index}`; // the sender's index
      if (message.type === 'note on') {
        indices.set(sent, rotation.noteOn());
      }
      const index = indices.get(sent) ?? message.index;
      if (message.type === 'note off') {
        rotation.noteOff(index);
      } else if (message.type === 'per-note management') {
        rotation.noteOff(index);
        indices.delete(sent);
      }
      return { ...message, index };
    });
  }
}

// the play messages make: of their clip, its element, by its kind; a track's own controllers of none, named by the track unless what's
// carried names their kind; its notes, what's sent after them, and the track's controls, each where there are any
function playOf(
  to: SentTo<string>,
  role: string,
  notes: readonly SentNote[],
  { ends, changes }: AfterTheirNotes,
  controls: Controller[],
): Play {
  return {
    owner: to.clip ?? null,
    kind: to.clip?.kind ?? to.track,
    role,
    live: to.live ?? false,
    notes: notes.map((note) => playedNote(note)),
    ...(ends.length ? { ends } : {}),
    ...(changes.length ? { changes } : {}),
    ...(controls.length ? { controls } : {}),
    ...to.play,
    trackName: to.track, // as sent, whatever its play carries
  };
}
// a note as the stream carries it: when, its pitch and velocity, its length if it has one, its bend, vibrato and glides where it was sent
// with them, its other per-note controllers as it starts, its part, and its index, which a later end, glide or change names it by
function playedNote({ noteOn, duration, controllers, glides }: SentNote): PlayedNote {
  const note: PlayedNote = { t: noteOn.t, pitch: noteOn.pitch, velocity: noteOn.velocity };
  if (duration !== undefined) {
    note.duration = duration;
  }
  if (Object.keys(controllers).length) {
    note.controllers = controllers;
  }
  if (glides.length) {
    note.glides = glides;
  }
  if (noteOn.part !== undefined) {
    note.part = noteOn.part;
  }
  note.index = noteOn.index;
  return note;
}
// what's sent after its note, a held note's, whose note on isn't among the messages: each note off, and each per-note controller, a
// change, #3 Pitch 7.25 a glide among them
function afterTheirNotes(messages: readonly Message[]): AfterTheirNotes {
  const started = new Set(messages.filter((message) => message.type === 'note on').map((noteOn) => noteOn.index));
  const after: AfterTheirNotes = { ends: [], changes: [] };
  for (const message of messages.filter((later) => !('index' in later) || !started.has(later.index))) {
    if (message.type === 'note off') {
      after.ends.push(message);
    } else if (message.type === 'per-note controller') {
      after.changes.push(message); // its pitch among them, #3 Pitch 7.25, as a lane like the others
    }
  }
  return after;
}
// whether anything heard was sent after its note
function heardAfter({ ends, changes }: AfterTheirNotes): boolean {
  return ends.length > 0 || changes.length > 0;
}
// a track's controllers among the messages, its parameters by name, each a value at a time, gliding where it came with a time constant
function controlsIn(messages: readonly Message[]): Controller[] {
  return messages.filter((message) => message.type === 'controller');
}
