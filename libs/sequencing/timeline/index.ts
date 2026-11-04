// ---------- libs/sequencing/timeline: what happened, laid out in time, events of any kind, a package of its own ----------
// Events, each with its extent, its own length, open until it's ended, or until the next of its key, kept for a window of time, what's in
// effect kept; and played back from a time in timeline time, its holds taken out (timeline/README.md). Nothing of what they are: the
// MIDI sequencer's regions, lanes and their playback are its own views of them (libs/sequencing/midi-sequencer/). What's asked of whatever plays
// it back, play, stop and cue, as messages (messages.ts)
export { endOf, LATEST, Timeline, thinned, type TimedEvent, type TimelineOptions } from './timeline.ts';
export { ALONG_THE_CLOCK, type PlayedFrom } from './timeline-time.ts';
export type { PlaybackMessage } from './messages.ts';
export { Player, type EndOf, type Performer, type Played, type PlayerOptions } from './player.ts';
