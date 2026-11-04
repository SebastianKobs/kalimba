// ---------- timeline/timeline: events in time, each with its extent, kept for a window ----------
// Events of any kind, knowing nothing of what they are but when and how long: one with its own length; one open until its end is told
// (endAt()); one that holds until the next of its key, as a value set holds until the next is (hold()). Kept for a window, the last 30
// minutes unless told: an event that ended before it let go, one still in effect kept, of each key's the one in effect where the window
// starts, those who went told (onLetGo); an event that holds what the one before it of its key held, by the caller's equality, thinned
// once it's settled. What's in effect at a time, and what starts in a range. The sequencer's recorder keeps what's heard on it, its
// regions and lanes its own views of it (libs/sequencing/midi-sequencer/recorder.ts)
import { HISTORY } from '../clock/index.ts';
import { entryOf, lastAtOrBefore, placeInOrder, type Seconds } from '../../base/util/index.ts';

// an event on the timeline: when, and how long, none while it's open or while it holds until the next of its key
export interface TimedEvent {
  t: Seconds;
  duration?: Seconds | undefined;
}
// what the timeline is told: its window; when an event that holds holds what the one before it held; who's told what was let go
export interface TimelineOptions<Held> {
  keep?: Seconds | undefined;
  same?: ((before: Held, after: Held) => boolean) | undefined;
  onLetGo?: ((events: readonly TimedEvent[]) => void) | undefined;
}

const LET_GO_EVERY: Seconds = 1; // as events are added, what's past let go at most once a second of their time, not on every event
// s: the latest an event comes after its time; one a second past that holds what's held already is thinned
export const LATEST: Seconds = 1;

// events with their own length or open (add()), and events that hold until the next of their key (hold()), kept for a window
export class Timeline<Event extends TimedEvent, Held extends TimedEvent = Event> {
  readonly #keep: Seconds;
  readonly #same: (before: Held, after: Held) => boolean;
  readonly #onLetGo: (events: readonly TimedEvent[]) => void;
  #events: Event[] = []; // in the order they came
  readonly #held = new Map<string, Held[]>(); // each key's, in time order, the keys in the order they began
  #letGoBefore = -Infinity; // the last time what's past was let go as events came

  constructor({ keep = HISTORY, same = () => false, onLetGo = () => {} }: TimelineOptions<Held> = {}) {
    this.#keep = keep;
    this.#same = same;
    this.#onLetGo = onLetGo;
  }
  // events with their own length, or open until their end is told; what's past the window let go as they come, at most once a second
  add(events: readonly Event[]): void {
    if (!events.length) {
      return;
    }
    this.#events.push(...events);
    const before = Math.min(...events.map((event) => event.t)) - this.#keep;
    if (before >= this.#letGoBefore + LET_GO_EVERY) {
      this.#letGo(before);
    }
  }
  // an open event's end told, at a time: its length from where it starts, never less than none
  endAt(event: Event, t: Seconds): void {
    event.duration = Math.max(0, t - event.t);
  }
  // an event that holds until the next of its key, among its key's in time order, after those at its time
  hold(key: string, event: Held): void {
    placeInOrder(
      entryOf(this.#held, key, () => []),
      event,
      timeOf,
    );
  }
  // the timeline as of a time: what ended before its window let go, and an event that holds what's held already thinned once settled
  settle(now: Seconds): void {
    this.#letGo(now - this.#keep);
    for (const [key, held] of this.#held) {
      this.#held.set(key, thinned(held, now - LATEST, this.#same));
    }
  }
  // every event gone, the window as at the start; nobody told, as the owner emptied it
  clear(): void {
    this.#events = [];
    this.#held.clear();
    this.#letGoBefore = -Infinity;
  }
  // the events with their own length or open, in the order they came
  events(): readonly Event[] {
    return this.#events;
  }
  // the keys of the events that hold, in the order they began
  keys(): string[] {
    return [...this.#held.keys()];
  }
  // a key's events, in time order
  held(key: string): readonly Held[] {
    return this.#held.get(key) ?? [];
  }
  // what's in effect at a time: an event from its start until its end, an open one on; of each key's the latest by then
  inEffectAt(t: Seconds): (Event | Held)[] {
    const underWay = this.#events.filter((event) => event.t <= t && t < endOf(event));
    const holding = [...this.#held.values()].flatMap((held) => {
      const latest = lastAtOrBefore(held, t, timeOf);
      return latest ? [latest] : [];
    });
    return [...underWay, ...holding];
  }
  // what starts in a range, from its start, before its end
  startingIn(from: Seconds, to: Seconds): (Event | Held)[] {
    const starts = (event: TimedEvent): boolean => event.t >= from && event.t < to;
    return [...this.#events.filter(starts), ...[...this.#held.values()].flatMap((held) => held.filter(starts))];
  }
  // what ended before a time let go, an event that holds ending where the next of its key starts, the last never; who went told
  #letGo(before: Seconds): void {
    this.#letGoBefore = before;
    const gone: TimedEvent[] = this.#events.filter((event) => endOf(event) < before);
    this.#events = this.#events.filter((event) => endOf(event) >= before);
    for (const [key, held] of this.#held) {
      const inEffect = inEffectFrom(held, before);
      gone.push(...held.slice(0, inEffect));
      this.#held.set(key, held.slice(inEffect));
    }
    if (gone.length) {
      this.#onLetGo(gone);
    }
  }
}

// an event's time, what the timeline keeps its events in order by
export function timeOf(event: TimedEvent): Seconds {
  return event.t;
}
// events that change nothing left out, once settled: each holding what the one before it held, by the caller's equality; the first
// against where it starts from, if it's given
export function thinned<Event extends TimedEvent>(
  events: readonly Event[],
  settled: Seconds,
  same: (before: Event, after: Event) => boolean,
  from?: Event,
): Event[] {
  const kept: Event[] = [];
  let before = from;
  for (const event of events) {
    if (event.t < settled && before && same(before, event)) {
      continue;
    }
    kept.push(event);
    before = event;
  }
  return kept;
}
// where the events of a key still in effect at a time begin: the one in effect then, the last of those before it, and all after
function inEffectFrom(held: readonly TimedEvent[], before: Seconds): number {
  const first = held.findIndex((event) => event.t >= before);
  if (first < 0) {
    return Math.max(0, held.length - 1);
  }
  return Math.max(0, first - 1);
}
// where an event ends: at its length, or, open, never yet
export function endOf(event: TimedEvent): Seconds {
  return event.duration === undefined ? Infinity : event.t + event.duration;
}
