// ---------- libs/midi/protocol/rotation: a source's notes, each a fresh index, as MIDI 2.0's note rotation hands them out ----------
// M2-104-UM, 4.2.14: a note's number is an index, not its pitch, never reused while its note is on, so two notes of one pitch sound at
// once, each with its own per-note controllers. Handed out in turn round the 128 note numbers, so one just let go comes back last, its
// release long rung out
const NOTE_NUMBERS = 128;

export class NoteRotation {
  readonly #on = new Set<number>();
  #next = 0;

  // a note that starts: the next index in turn that isn't on
  noteOn(): number {
    const index = this.#nextOff();
    this.#on.add(index);
    this.#next = (index + 1) % NOTE_NUMBERS;
    return index;
  }
  noteOff(index: number): void {
    this.#on.delete(index);
  }
  // the next index in turn that isn't on; with all on, the next in turn, its note taken over
  #nextOff(): number {
    for (let ahead = 0; ahead < NOTE_NUMBERS; ahead++) {
      const index = (this.#next + ahead) % NOTE_NUMBERS;
      if (!this.#on.has(index)) {
        return index;
      }
    }
    return this.#next;
  }
}
