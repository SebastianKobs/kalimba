// ---------- libs/sequencing/sequencer/holding: how long the plays on one track hold it ----------
// Pure. Times are the caller's.
// A track is held for good while any play on it is held open (its end not known yet).
// Otherwise it is held until the latest end of the plays on it.
// Several notes from one place share a track this way (see track-pool.ts).
export class Holding {
  #open = 0;
  #latest = -Infinity;

  // A play added: held open when until is Infinity, else ending at until.
  add(until: number): void {
    if (until === Infinity) {
      this.#open += 1;
      return;
    }
    this.#latest = Math.max(this.#latest, until);
  }
  // A play that was held open has ended.
  end(until: number): void {
    this.#open = Math.max(0, this.#open - 1);
    this.#latest = Math.max(this.#latest, until);
  }
  get until(): number {
    if (this.#open) {
      return Infinity;
    }
    return this.#latest;
  }
}
