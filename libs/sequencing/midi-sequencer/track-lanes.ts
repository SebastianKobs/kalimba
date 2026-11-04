// ---------- midi-sequencer/track-lanes: a track's controllers as heard, kept as its lanes ----------
// And what moves as it's heard, as automation: a track's own controllers as its
// lanes, a lane a controller, by the track's kind and number as its regions have them,
// launched or not. Every change heard kept, in time order as Web Audio plays them, but
// a point that changes nothing, thinned once it's a second past, as nothing comes that
// late; a lane's points before the 30 minutes let go but its last, its value as they
// start.
import type { Timeline, TimedEvent } from '../timeline/index.ts';
import { entryOf } from '../../base/util/index.ts';
import { timedValue } from '../../base/automation/index.ts';
import type { LanePoint } from './lanes.ts';
import type { Play } from './stream.ts';

// what a track's lane is known by: the track's kind and number, as its regions have them, and the controller it's of; the track's
// name, as its play was sent to it
interface LaneOf {
  kind: string;
  track: number | null;
  trackName: string | undefined;
  controller: string;
}
// a track's lane: its kind, number and controller, and its points in time order
export type Lane = LaneOf & { points: readonly LanePoint[] };

export class TrackLanes {
  readonly #timeline: Pick<Timeline<TimedEvent, LanePoint>, 'hold' | 'held'>; // the recorder's: each point held there until the next of its lane
  readonly #lanes = new Map<string, Lane>(); // each track's, by its kind, number and controller, in the order they began

  constructor(timeline: Pick<Timeline<TimedEvent, LanePoint>, 'hold' | 'held'>) {
    this.#timeline = timeline;
  }
  // a track's controllers, as they come, each into its lane, a point holding until the next of its lane
  heard(play: Play): void {
    for (const { controller, value, t, glide } of play.controls ?? []) {
      const of: LaneOf = { kind: play.kind, track: play.track ?? null, trackName: play.trackName, controller };
      const key = JSON.stringify([of.kind, of.track, of.controller]);
      entryOf(this.#lanes, key, () => ({ ...of, points: [] }));
      this.#timeline.hold(key, timedValue(value, t, glide));
    }
  }
  // a lane as it was recorded, its points back on the timeline, holding until the next of their lane
  restore({ points, ...of }: Lane): void {
    const key = JSON.stringify([of.kind, of.track, of.controller]);
    this.#lanes.set(key, { ...of, points: [] });
    for (const point of points) {
      this.#timeline.hold(key, point);
    }
  }
  // every lane forgotten, the timeline's points emptied by its owner
  clear(): void {
    this.#lanes.clear();
  }
  // each track's lanes, in the order they began, their points as the timeline holds them now
  lanes(): Lane[] {
    for (const [key, lane] of this.#lanes) {
      lane.points = this.#timeline.held(key);
    }
    return [...this.#lanes.values()];
  }
}
