// ---------- midi-sequencer/monitoring: which senders the sequencer listens to, as a DAW's input monitoring ----------
// A sender switched off from a time:
//   - its new notes from then are dropped, and what follows a dropped note;
//   - its controllers and per-note controllers from then are dropped;
//   - an earlier note's end is passed, so no voice is left held.
// Its held notes are kept by track and by the track's own index, each with its last volume,
// so switching it on brings each back to the volume it had.
import type { Message, NoteOff, PerNoteController, PerNoteManagement } from '../../midi/protocol/index.ts';
import { entryOf, type Seconds } from '../../base/util/index.ts';

// a held note, as the track's instrument knows it
interface HeldNote<Name extends string> {
  track: Name;
  index: number;
  volume: number;
}

const FULL_VOLUME = 1; // a note's volume until one is sent

export class Monitoring<Name extends string> {
  readonly #off = new Map<string, Seconds>(); // each sender switched off, from when
  readonly #held = new Map<string, Map<string, Map<number, number>>>(); // by sender, by track: index, last volume
  readonly #dropped = new Map<Name, Set<string>>(); // by track: each sender's index whose note on was dropped

  switchOn(source: string | undefined): void {
    this.#off.delete(source ?? '');
  }
  switchOff(source: string | undefined, t: Seconds): void {
    this.#off.set(source ?? '', t);
  }
  // what the sender's monitoring passes of its messages, as the sender numbers its notes
  passed(track: Name, source: string | undefined, messages: readonly Message[]): Message[] {
    const sender = source ?? '';
    const from = this.#off.get(sender);
    const dropped = entryOf(this.#dropped, track, () => new Set<string>());
    return messages.filter((message) => {
      const key = `${sender}\n${'index' in message ? message.index : ''}`;
      if ('index' in message && dropped.has(key)) {
        if (endsNote(message)) {
          dropped.delete(key);
        }
        return false;
      }
      if (from === undefined || message.t < from) {
        return true;
      }
      if (message.type === 'note on') {
        dropped.add(key);
        return false;
      }
      return endsNote(message);
    });
  }
  // keeps the sender's held notes on the track, from the messages as the track's instrument gets them
  keep(track: Name, source: string | undefined, messages: readonly Message[]): void {
    const held = entryOf(
      entryOf(this.#held, source ?? '', () => new Map<Name, Map<number, number>>()),
      track,
      () => new Map<number, number>(),
    );
    for (const message of messages) {
      if (message.type === 'note on') {
        held.set(message.index, FULL_VOLUME);
      } else if (endsNote(message)) {
        held.delete(message.index);
      } else if (isVolume(message) && held.has(message.index)) {
        held.set(message.index, message.value);
      }
    }
  }
  heldBy(source: string | undefined): HeldNote<Name>[] {
    const byTrack = this.#held.get(source ?? '') ?? new Map<string, Map<number, number>>();
    return [...byTrack].flatMap(([track, notes]) =>
      [...notes].map(([index, volume]) => ({ track: track as Name, index, volume })),
    );
  }
}

// whether a message ends its note: its note off, or its per-note management
function endsNote(message: Message): message is NoteOff | PerNoteManagement {
  return message.type === 'note off' || message.type === 'per-note management';
}
function isVolume(message: Message): message is PerNoteController {
  return message.type === 'per-note controller' && message.controller === 'volume';
}
