// ---------- libs/sequencing/sequencer/track-pool: overlapping plays shared out over tracks ----------
// Pure. Times are the caller's. Works as a polysynth shares out its voices.
// A track holds one play at a time, until the play's tail has died away,
// so a play never cuts off another's tail.
// Where a play goes:
//   1. Joining: the track its owner still holds, if the caller asks to join.
//   2. The track its owner played on last, if that track is free.
//   3. The lowest free track.
//   4. A new track, when none is free.
// Tracks are never taken away: there are as many as ever played at once.
// A play held open (its end not known yet) holds its track until end() is called.
import { Holding } from './holding.ts';

// A track: the owner of its play, and when the play starts and dies away.
export interface PoolTrack {
  owner?: object;
  from?: number;
  until?: number;
}
export class TrackPool {
  readonly tracks: PoolTrack[] = [];
  // Each owner's last track; forgotten with the owner.
  readonly #last = new WeakMap<object, number>();
  readonly #holding: Holding[] = []; // how long each track is held, by track index

  // Puts a play on a track and returns the track's index.
  // join: the play may share the track its owner still holds,
  // e.g. a note from the same place.
  // A shared track is held until the later of the two ends.
  place(owner: object, from: number, until: number, { join = false }: { join?: boolean } = {}): number {
    const held = this.#heldBy(owner, from);
    if (join && held !== null) {
      this.#hold(held, until);
      return held;
    }
    let index = this.#last.get(owner);
    if (index == null || !this.#free(index, from)) {
      index = this.tracks.findIndex((_track, candidate) => this.#free(candidate, from));
    }
    if (index < 0) {
      index = this.tracks.push({}) - 1;
    }
    this.tracks[index] = { owner, from };
    this.#holding[index] = new Holding();
    this.#hold(index, until);
    this.#last.set(owner, index);
    return index;
  }
  // A play that was held open (until Infinity) now ends at until.
  // The track is free once every play on it has died away.
  end(index: number, until: number): void {
    const holding = this.#holding[index];
    if (!holding) {
      return;
    }
    holding.end(until);
    this.#setUntil(index);
  }
  // The owner's last track, if the owner still holds it and it is busy at that time.
  #heldBy(owner: object, at: number): number | null {
    const index = this.#last.get(owner);
    if (index == null || this.tracks[index]?.owner !== owner || this.#free(index, at)) {
      return null;
    }
    return index;
  }
  // A play added to a track's holding: held open, or ending at until.
  #hold(index: number, until: number): void {
    this.#holding[index]!.add(until); // set when the first play was placed
    this.#setUntil(index);
  }
  #setUntil(index: number): void {
    // The holding exists: set when the track's first play was placed.
    this.tracks[index]!.until = this.#holding[index]!.until;
  }
  #free(index: number, from: number): boolean {
    const until = this.tracks[index]?.until; // just added: no until yet, not free
    return until !== undefined && until <= from;
  }
}

// a pool of tracks for each key, as a polysynth's voices for each part
export function poolsFor<Key extends string>(keys: readonly Key[]): Record<Key, TrackPool> {
  return Object.fromEntries(keys.map((key) => [key, new TrackPool()])) as Record<Key, TrackPool>;
}
