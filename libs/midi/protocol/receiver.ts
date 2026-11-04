// ---------- libs/midi/protocol/receiver: what messages are played into, an instrument or a track ----------
// Java Sound's name for it: whatever takes a source's messages, as a synth's MIDI in takes a keyboard's or a sequencer's, the source
// not its concern
import type { Message } from './messages.ts';

// the messages handed it, at once, each at its own clock time
export interface Receiver {
  receive(messages: readonly Message[]): void;
}
