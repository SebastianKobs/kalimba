// ---------- midi-sequencer/lanes: a lane's points, as automation is, and its value at a time as Web Audio plays it ----------
// A point a value at a time, jumping there, or gliding there by a time constant, as Web Audio's setTargetAtTime goes: the music's, on the
// timeline as an event that holds until the next of its lane (libs/sequencing/timeline/)
import { automationOf, levelAt, type TimedValue } from '../../base/automation/index.ts';
import { lastAtOrBefore, type Seconds } from '../../base/util/index.ts';

// a lane's point: a value at a time, jumping there, or gliding there by a time constant (glide), as an automation point's curve
export type LanePoint = TimedValue;

// whether a point sets its lane to what the one before it set, the same way: a jump to the same value after a jump, a glide to the same
// value by the same time constant after a glide; one that does changes nothing
export function samePoint(before: LanePoint, after: LanePoint): boolean {
  return after.value === before.value && after.glide === before.glide;
}
// a lane's value at a time, as its points play as automation: a jump's its value, a glide's where
// it had got to from where the lane was; none before its first point
export function laneValueAt(points: readonly LanePoint[], t: Seconds): number | undefined {
  const first = points[0];
  if (!first || first.t > t) {
    return undefined;
  }
  return levelAt(automationOf(points), t);
}
// a lane's last point's value by a time, what it was set to, a glide's curve not followed; none before its first point
export function lastValueAt(points: readonly LanePoint[], t: Seconds): number | undefined {
  return lastAtOrBefore(points, t, (point) => point.t)?.value;
}
