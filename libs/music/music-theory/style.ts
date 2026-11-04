// ---------- music-theory/style: a play style, its contours and its rhythms; the style as it plays ----------
// A style as a player has one (Coltrane's, Sanders'): the melodic contours a line walks, steps
// of the scale, and the rhythms it's played in.
// Generic over a rhythm's type: its owner's, a sequencer's pattern of notes, say.
import { frozen } from '../../base/util/index.ts';

// a play style: its contours, each a line's steps of the scale, and its rhythms
export interface PlayStyle<Rhythm> {
  contours: number[][];
  rhythms: Rhythm[];
}

// The style as it plays: the lists it's made with to begin with.
// Set a list at a time, each frozen as it's set, so it plays as it was handed in.
// Its lists handed out as copies.
export class PlayingStyle<Rhythm> {
  readonly #first: Readonly<PlayStyle<Rhythm>>;
  readonly #playing: PlayStyle<Rhythm>;

  // the lists it begins with, frozen where they're defined
  constructor(first: PlayStyle<Rhythm>) {
    this.#first = { ...first };
    this.#playing = { ...first };
  }
  current(): PlayStyle<Rhythm> {
    return {
      contours: [...this.#playing.contours],
      rhythms: [...this.#playing.rhythms],
    };
  }
  set(lists: Partial<PlayStyle<Rhythm>>): void {
    if (lists.contours) {
      this.#playing.contours = frozen(structuredClone(lists.contours));
    }
    if (lists.rhythms) {
      this.#playing.rhythms = frozen(structuredClone(lists.rhythms));
    }
  }
  reset(): void {
    Object.assign(this.#playing, this.#first); // the lists it began with
  }
}
