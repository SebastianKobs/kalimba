// ---------- clock/song-time: the song position, where the music is on the arrangement's timeline ----------

// a clock time to a time along a timeline, its holds taken out, and back: the grid's song time is one
export interface TimeMap {
  toTimeline(t: number): number;
  fromTimeline(along: number): number;
}
// a hold the music went through: from where it stood to when it went on
interface Hold {
  from: number;
  to: number;
}
// a locate: from a clock time on, song time is so much further (or less)
interface Jump {
  at: number;
  by: number;
}

// s: how far back the music's history is kept: the grid's holds, a timeline's events, an arrangement's view
export const HISTORY = 30 * 60;
const KEEP_HOLDS = HISTORY + 60; // s: the holds and locates kept for song time, the history and a minute more

// The song position: running with the clock's time while the music plays, standing while it's held, and set to a song time (located).
// A clock time before a locate keeps the song time it had, as what was recorded then stays where it was heard; so a song time can have been
// reached more than once, and timeOfSong() gives its latest clock time. Never located, it's the clock's time with its holds taken out.
export class SongTime {
  readonly #holds: Hold[] = []; // each hold it went through, from when to when, in time order
  readonly #jumps: Jump[] = []; // each locate, in time order
  #base = 0; // what the holds and locates let go with the history came to, so a recent time keeps its song time
  #stoodAt: number | null = null; // where the music stands while held: the time of the 16th it's held at

  // held: the music standing from a time on
  stand(at: number): void {
    this.#stoodAt = at;
  }
  // released at a time: the hold kept, those past the history and a minute let go
  goOn(t: number): void {
    const from = this.#stoodAt;
    if (from === null) {
      return;
    }
    this.#stoodAt = null;
    this.#holds.push({ from, to: Math.max(t, from) });
    this.#letGoBefore(t);
  }
  // the position set to a song time at a clock time: running, from then on; held, where it stands, from the time it stands from
  locate(song: number, t: number): void {
    const at = this.#stoodAt === null ? t : Math.max(t, this.#stoodAt);
    this.#jumps.push({ at, by: song - this.songTime(at) });
    this.#jumps.sort((one, other) => one.at - other.at); // stable: two at one time keep their order
    this.#letGoBefore(t);
  }
  // the holds forgotten, as the grid starts; a stand going on and the locates kept
  clear(): void {
    this.#holds.length = 0;
  }
  // a clock time's song time, the time the music played up to it: the holds it
  // went through taken out, a stop's, or live play's while the arrangement played back,
  // as the arrangement shows them, standing; within one, where it stood, at the 16th it
  // was held at, those handed out before it played on; held now, all from it at it;
  // the locates before it added: where it was set, going on from there
  songTime(t: number): number {
    if (t === Infinity) {
      return t; // never, held or not
    }
    return this.#withoutHolds(t) + this.#locatedBy(t);
  }
  // a clock time's time with the holds taken out and no locate: what song time is within one located line, the line's shift apart
  playedTime(t: number): number {
    return this.#withoutHolds(t);
  }
  // and back: the latest clock time a song time was played at, past the holds; one in the stretch a locate skipped, the time it was located
  // at; where it's held now, there's none, never
  timeOfSong(song: number): number {
    let end = Infinity; // where the located line being tried stops, the next locate's time
    for (let located = this.#jumps.length; located >= 0; located--) {
      const begins = located === 0 ? -Infinity : this.#jumps[located - 1]!.at;
      const t = this.#timeOfWithoutHolds(song - this.#base - this.#shiftBy(located));
      if (t >= begins) {
        return Math.min(t, end);
      }
      end = begins;
    }
    return end; // not reached: the first line has no beginning
  }
  // a time with the holds it went through taken out, the history let go counted
  #withoutHolds(t: number): number {
    let song = t + this.#base;
    for (const { from, to } of this.#holdsSoFar()) {
      if (t > from) {
        song -= Math.min(t, to) - from;
      }
    }
    return song;
  }
  // and back, past the holds
  #timeOfWithoutHolds(song: number): number {
    let t = song;
    for (const { from, to } of this.#holdsSoFar()) {
      if (t > from) {
        t += to - from;
      }
    }
    return t;
  }
  // the locates in force at a time, together
  #locatedBy(t: number): number {
    return this.#jumps.reduce((sum, { at, by }) => (t >= at ? sum + by : sum), 0);
  }
  // the first so many locates' together
  #shiftBy(located: number): number {
    return this.#jumps.slice(0, located).reduce((sum, { by }) => sum + by, 0);
  }
  // its holds, and one going on, held now, to never, each from where the music stood
  #holdsSoFar(): Hold[] {
    return this.#stoodAt === null ? this.#holds : [...this.#holds, { from: this.#stoodAt, to: Infinity }];
  }
  // what's past the history and a minute let go, its change to song time kept in the base
  #letGoBefore(t: number): void {
    const horizon = t - KEEP_HOLDS;
    while (this.#holds.length && this.#holds[0]!.to < horizon) {
      const { from, to } = this.#holds.shift()!;
      this.#base -= to - from;
    }
    while (this.#jumps.length && this.#jumps[0]!.at < horizon) {
      this.#base += this.#jumps.shift()!.by;
    }
  }
}
