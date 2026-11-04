// ---------- midi-sequencer/stream: a play, live or not, as the sequencer hands it to whoever listens ----------
import type { Seconds } from '../../base/util/index.ts';
import type { Controller, NoteOff, PerNoteController, PerNoteValues } from '../../midi/protocol/index.ts';

// A play, as the stream carries it:
//   - whose it is (owner), its kind and role, whether it's played live, its
//     notes at clock times;
//   - the track it's on and until when, the clip it's of;
//   - the region it's of: a number its source hands it out, so the plays of
//     one region are told apart from another's of the same owner (a phrase's
//     own, a gesture's, a loop's launch's, a held part's key's);
//   - the ends and glides of notes sent before it, a held note's, by the
//     note's index, as MIDI pairs a note off with its note on: a play with no
//     notes of its own where nothing else came with them;
//   - the changes to their per-note controllers.
// A track's own controllers, its parameters as they move: a play of their own
// on the track, no owner's (owner null), its kind and number as its other
// plays carry them.
export interface Play {
  owner: unknown;
  kind: string;
  role?: string;
  live?: boolean;
  notes: PlayedNote[];
  track?: number | null;
  trackName?: string; // the track it was sent to, by name, as its sender named it
  until?: number;
  clip?: unknown;
  region?: number;
  ends?: NoteOff[];
  changes?: PerNoteController[];
  controls?: Controller[];
  playback?: boolean; // played back from the recording
  launched?: boolean; // a clip launched from the session view, played in full
  unrecorded?: boolean; // left out of the recording, as its sender says: a launched clip, what plays back, a hush
  [more: string]: unknown;
}
// A note as the stream carries it, as MIDI's messages sent it (notesIn()):
//   - when it sounds, a clock time, and how long, in seconds, where that came
//     with it;
//   - its pitch, a MIDI note number, a drum's its pad, and its velocity, 0 to 1;
//   - its per-note controllers as it starts, by MIDI's names: its bend, its
//     vibrato depth, how it's heard from its own place, its own values; its
//     glides sent with it, each [when, pitch];
//   - which part of its owner sounds it (part); its index, as its source handed
//     it out, which a later end or change names it by.
// A held note's end, the changes to its per-note controllers, its pitch among
// them, and a track's own controllers come as sent.
export interface PlayedNote {
  t: Seconds;
  duration?: Seconds | undefined;
  pitch?: number | undefined;
  velocity?: number | undefined;
  controllers?: PerNoteValues | undefined;
  glides?: [at: Seconds, pitch: number][] | undefined;
  part?: number | undefined;
  index?: number | undefined;
  [value: string]: unknown;
}
// a play's listener: a recorder, a session view
export type PlayListener = (play: Play) => void;
