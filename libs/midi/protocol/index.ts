// ---------- libs/midi/protocol: MIDI 2.0's channel voice messages as values, its entry ----------
// The protocol alone, as a synth and a sequencer share it and nothing else: the messages and the notes among them (messages.ts), each
// note a fresh index (rotation.ts), and what they're played into (receiver.ts). Apart from the MIDI sequencer, so an instrument speaks
// MIDI without a sequencer
export { noteMessages, notesIn, retimed } from './messages.ts';
export type {
  Controller,
  Message,
  NoteOn,
  NoteOff,
  NoteToSend,
  PerNoteController,
  PerNoteControllerName,
  PerNoteManagement,
  PerNoteValues,
  SentNote,
} from './messages.ts';
export { NoteRotation } from './rotation.ts';
export type { Receiver } from './receiver.ts';
