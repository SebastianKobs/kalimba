// ---------- timeline/player: the timeline played back from a time, in timeline time, each moment as it comes due ----------
// As a DAW plays its arrangement, knowing nothing of what its events are: an event with its own extent, its start, its points and its end
// told to a performer as they come due on a tick, heard as far after where playback starts as they lie along the timeline, its holds taken
// out, so a hold is played past at once; one under way where it starts chased, started at once from there, its points before passed over;
// stopped, what's under way ended then; played to the end, what's under way ringing out as it lies along the timeline. An event that holds
// until the next of its own told as it comes due, the one in effect where playback starts picked up from there, never ended. The
// sequencer's recording player maps it onto notes and a track's controllers (libs/sequencing/midi-sequencer/recording-player.ts)
import type { TimeMap } from '../clock/index.ts';
import { timeOf, type TimedEvent } from './timeline.ts';
import { ALONG_THE_CLOCK, type PlayedFrom } from './timeline-time.ts';
import { lastAtOrBefore, type Seconds } from '../../base/util/index.ts';

// what playback tells as each moment comes due: an event's start, at the clock time it's heard, from its own time it starts at, later
// than its start where it's chased; a point of its own; its end; an event that holds, as it comes due, or picked up where playback
// starts, from there
export interface Performer<Event, Held, Point> {
  start(event: Event, t: Seconds, at: Seconds): void;
  point(event: Event, point: Point, t: Seconds): void;
  end(event: Event, t: Seconds): void;
  hold(event: Held, t: Seconds, from?: Seconds): void;
}
// an event's end along the timeline, none for one still open
export type EndOf<Event> = (event: Event, toTimeline: (t: Seconds) => Seconds) => Seconds | undefined;
// what the player is told: whom it tells, an event's points, its timeline time, where an event ends along it
export interface PlayerOptions<Event, Held, Point> {
  performer: Performer<Event, Held, Point>;
  pointsOf?: ((event: Event) => readonly Point[]) | undefined;
  timeline?: TimeMap | undefined;
  endOf?: EndOf<Event> | undefined;
}
// what's played: events with their own extent, and events that hold, each key's in time order
export interface Played<Event, Held> {
  events: readonly Event[];
  held?: readonly (readonly Held[])[] | undefined;
}
// a moment, at its time along the timeline: an event that holds, picked up from where playback starts or not; an event's start, from its
// own time it starts at; a point of its; its end
type Moment<Event, Held, Point> =
  | { what: 'hold'; along: Seconds; held: Held; from: Seconds | undefined }
  | { what: 'start'; along: Seconds; event: Event; at: Seconds }
  | { what: 'point'; along: Seconds; event: Event; point: Point }
  | { what: 'end'; along: Seconds; event: Event };
// an event under way, until it's ended: the clock time it was heard from, and its time along the timeline then
interface UnderWay {
  heard: Seconds;
  along: Seconds;
}

const ORDER = { hold: 0, start: 1, point: 2, end: 3 }; // at one time: what holds set first, then an event's start, its points, its end

// the timeline played back from a time (play()), what's due told each tick (due()), stopped (stop()) or played to the end (finish());
// where it plays (position()), when it plays to the end (endsAt()), and whether it has (ended())
export class Player<
  Event extends TimedEvent,
  Held extends TimedEvent = Event,
  Point extends { t: Seconds } = { t: Seconds },
> {
  readonly #performer: Performer<Event, Held, Point>;
  readonly #pointsOf: (event: Event) => readonly Point[];
  readonly #timeline: TimeMap;
  readonly #endOf: EndOf<Event>;
  #moments: Moment<Event, Held, Point>[] = [];
  #next = 0; // the next moment to tell
  #from: PlayedFrom | null = null;
  #alongFrom: Seconds = 0; // the timeline's time it started from
  #alongEnd: Seconds = 0; // and its end's
  readonly #underWay = new Map<Event, UnderWay>(); // each event started, until its end is told

  constructor({
    performer,
    pointsOf = () => [],
    timeline = ALONG_THE_CLOCK,
    endOf = endedAt,
  }: PlayerOptions<Event, Held, Point>) {
    this.#performer = performer;
    this.#pointsOf = pointsOf;
    this.#timeline = timeline;
    this.#endOf = endOf;
  }
  // played from a time of the timeline's, heard at a clock time: each event under way from then until the end, one already under way
  // chased, started at once for what's left of it; of each key's events that hold, the one in effect then picked up, each after it
  play({ events, held = [] }: Played<Event, Held>, from: PlayedFrom): void {
    this.#from = from;
    this.#alongFrom = this.#timeline.toTimeline(from.from);
    this.#alongEnd = this.#timeline.toTimeline(from.end);
    this.#next = 0;
    this.#moments = [
      ...events.flatMap((event) => this.#momentsOf(event, from)),
      ...held.flatMap((key) => this.#holdsOf(key, from)),
    ].sort((first, second) => first.along - second.along || ORDER[first.what] - ORDER[second.what]);
  }
  // each tick: every moment due before a clock time, told in order, each heard as far after it started as it lies along the timeline
  due(until: Seconds): void {
    if (!this.#from) {
      return;
    }
    while (this.#next < this.#moments.length && this.#heardAt(this.#moments[this.#next]!.along) < until) {
      this.#tell(this.#moments[this.#next]!);
      this.#next++;
    }
  }
  // stopped at a clock time: what's under way ended then, what holds left as it is, nothing more told
  stop(t: Seconds): void {
    this.#endUnderWay(() => t);
  }
  // played to the end at a clock time, where it catches up with the timeline's end as it started: what's under way rings out to its end,
  // as far after it was heard from as it lies along the timeline, not cut there; one still open ended then; nothing more told
  finish(t: Seconds): void {
    this.#endUnderWay((event, { heard, along }) => {
      const end = this.#endOf(event, (at) => this.#timeline.toTimeline(at));
      return end === undefined ? t : Math.max(t, heard + end - along);
    });
  }
  // the timeline's time it plays at a clock time, past a hold at once, never past its end; none when it doesn't play
  position(now: Seconds): Seconds | null {
    const from = this.#from;
    if (!from) {
      return null;
    }
    return this.#timeline.fromTimeline(Math.min(this.#alongEnd, this.#alongFrom + (now - from.at)));
  }
  // the clock time it plays to the timeline's end as it started; none when it doesn't play
  endsAt(): Seconds | null {
    const from = this.#from;
    if (!from) {
      return null;
    }
    return from.at + this.#alongEnd - this.#alongFrom;
  }
  // whether it has played to the end
  ended(now: Seconds): boolean {
    const end = this.endsAt();
    return end !== null && now >= end;
  }
  // the clock time a time along the timeline is heard at
  #heardAt(along: Seconds): Seconds {
    return this.#from!.at + along - this.#alongFrom; // playing, as its caller found
  }
  #tell(moment: Moment<Event, Held, Point>): void {
    const t = this.#heardAt(moment.along);
    if (moment.what === 'hold') {
      this.#performer.hold(moment.held, t, moment.from);
      return;
    }
    if (moment.what === 'start') {
      this.#underWay.set(moment.event, { heard: t, along: moment.along });
      this.#performer.start(moment.event, t, moment.at);
      return;
    }
    if (!this.#underWay.has(moment.event)) {
      return;
    }
    if (moment.what === 'end') {
      this.#underWay.delete(moment.event);
      this.#performer.end(moment.event, t);
      return;
    }
    this.#performer.point(moment.event, moment.point, t);
  }
  // what's under way ended, each at its time, and nothing more told
  #endUnderWay(timeOf: (event: Event, underWay: UnderWay) => Seconds): void {
    for (const [event, underWay] of this.#underWay) {
      this.#performer.end(event, timeOf(event, underWay));
    }
    this.#underWay.clear();
    this.#moments = [];
    this.#from = null;
  }
  // an event's moments from a time until the end, each at its time along the timeline: its start, chased to the time where it's under way
  // already; its points after its start; its end, where it has one before the end. None for one over by the time, or starting past the end
  #momentsOf(event: Event, { from, end }: PlayedFrom): Moment<Event, Held, Point>[] {
    const toTimeline = (t: Seconds): Seconds => this.#timeline.toTimeline(t);
    const ends = this.#endOf(event, toTimeline);
    const over = ends !== undefined && ends <= toTimeline(from);
    if (over || event.t >= end) {
      return [];
    }
    const start = Math.max(event.t, from);
    const points = this.#pointsOf(event)
      .filter((point) => point.t > start && point.t < end)
      .map((point): Moment<Event, Held, Point> => ({ what: 'point', along: toTimeline(point.t), event, point }));
    const endings: Moment<Event, Held, Point>[] =
      ends !== undefined && ends < toTimeline(end) ? [{ what: 'end', along: ends, event }] : [];
    return [{ what: 'start', along: toTimeline(start), event, at: start }, ...points, ...endings];
  }
  // a key's events that hold, from a time until the end: the one in effect then, picked up from there, and each after it
  #holdsOf(key: readonly Held[], { from, end }: PlayedFrom): Moment<Event, Held, Point>[] {
    const toTimeline = (t: Seconds): Seconds => this.#timeline.toTimeline(t);
    const inEffect = lastAtOrBefore(key, from, timeOf);
    const pickedUp: Moment<Event, Held, Point>[] =
      inEffect ? [{ what: 'hold', along: toTimeline(from), held: inEffect, from }] : [];
    const after = key
      .filter((held) => held.t > from && held.t < end)
      .map((held): Moment<Event, Held, Point> => ({ what: 'hold', along: toTimeline(held.t), held, from: undefined }));
    return [...pickedUp, ...after];
  }
}

// where an event ended, along the timeline, never before it starts; none while it's open
function endedAt(event: TimedEvent, toTimeline: (t: Seconds) => Seconds): Seconds | undefined {
  if (event.duration === undefined) {
    return undefined;
  }
  return Math.max(toTimeline(event.t), toTimeline(event.t + event.duration));
}
