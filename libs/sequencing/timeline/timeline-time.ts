// ---------- timeline/timeline-time: a time along the timeline, its holds taken out, and where playback starts ----------
// Timeline time, as Web Animations names it: the time the timeline played, a stop's or a pause's holds taken out; a clock time to it
// (toTimeline()) and back (fromTimeline()), the clock's TimeMap. The clock's song time is one (libs/sequencing/clock/, grid.song)
import type { TimeMap } from '../clock/index.ts';
import type { Seconds } from '../../base/util/index.ts';

// where playback starts: the timeline's time it plays from (from), the clock time that's heard at (at), and the timeline's end as it
// started (end), past which it has ended
export interface PlayedFrom {
  from: Seconds;
  at: Seconds;
  end: Seconds;
}

// nothing held: timeline time the clock's
export const ALONG_THE_CLOCK: TimeMap = Object.freeze({
  toTimeline: (t: Seconds) => t,
  fromTimeline: (along: Seconds) => along,
});
