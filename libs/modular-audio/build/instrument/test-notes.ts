// ---------- build/instrument/test-notes: a device view's test note ----------
// An input of its own on its role's instrument for each key, made at its first test note, played straight into it:
//   - not a track's: a sequencer hands out its own note numbers, which the test note's would
//     meet;
//   - not through a sequencer, so it isn't recorded.
// Each note a fresh index (MIDI 2.0's note rotation), phrased as its owner says, held at most
// its longest; let go as its button is.
// Pressed and let go as messages on a bus too,
// a key's note held until its key's is let go.
import { NoteRotation, type Message, type Receiver } from '../../../midi/protocol/index.ts';
import type { TestNote, TestNoteMessage } from '../../plan/instrument/index.ts';
import { entryOf } from '../../../base/util/index.ts';

// a test note as it sounds: let go as its button is
export interface HeldTestNote {
  release(at: number): void;
}
// a test note as it's phrased: its length, its longest, its button's let go lost
export interface PhrasedTestNote extends TestNote {
  readonly duration: number;
}

const LONGEST = 30; // s: a test note held at most this long

export class TestNotes<Key> {
  readonly #instrumentFor: (key: Key) => Receiver;
  readonly #phrase: (key: Key, note: PhrasedTestNote, index: number) => Message[];
  readonly #made = new Map<Key, Receiver>();
  readonly #rotation = new NoteRotation();
  readonly #held = new Map<Key, HeldTestNote>(); // pressed by a message, until its key's is let go

  // instrumentFor(): a key's instrument, made at its first test note;
  // phrase(): a note's messages as its owner plays one of that key's
  constructor({
    instrumentFor,
    phrase,
  }: {
    instrumentFor: (key: Key) => Receiver;
    phrase: (key: Key, note: PhrasedTestNote, index: number) => Message[];
  }) {
    this.#instrumentFor = instrumentFor;
    this.#phrase = phrase;
  }
  // A test note on a key's instrument, from its time until it's let go, at most its longest.
  play(key: Key, note: TestNote): HeldTestNote {
    const instrument = entryOf(this.#made, key, () => this.#instrumentFor(key));
    const index = this.#rotation.noteOn();
    instrument.receive(this.#phrase(key, { ...note, duration: LONGEST }, index));
    return {
      release: (at) => {
        instrument.receive([{ type: 'note off', index, t: at }]);
        this.#rotation.noteOff(index);
      },
    };
  }
  // A test note pressed or let go as the app asks it.
  hear(message: TestNoteMessage<Key>): void {
    if (message.type === 'test note') {
      this.#held.set(message.key, this.play(message.key, message.note));
      return;
    }
    this.#held.get(message.key)?.release(message.t);
    this.#held.delete(message.key);
  }
}
