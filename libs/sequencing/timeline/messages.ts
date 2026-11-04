// ---------- timeline/messages: what's asked of whatever plays a timeline back ----------
// As a transport's buttons ask it:
//   - play: from the playhead, or on from the present;
//   - stop: held where it is;
//   - cue: the playhead set back to a time on the timeline, or none, on the present.
import type { Seconds } from '../../base/util/index.ts';

export type PlaybackMessage =
  { readonly type: 'play' } | { readonly type: 'stop' } | { readonly type: 'cue'; readonly t: Seconds | null };
