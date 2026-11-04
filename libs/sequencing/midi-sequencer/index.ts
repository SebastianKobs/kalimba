// ---------- libs/sequencing/midi-sequencer: the MIDI sequencer, on the generic sequencer and the timeline ----------
// A control surface plays into it (input.ts): a track's messages, MIDI 2.0's channel voice messages as values, each note a fresh index
// (libs/midi/protocol/, its own), passed on to its instrument at once, which it alone plays, and into its stream, every play to whoever
// listens (stream.ts); and back, each note to the surface that lights it. A pattern's notes (pattern-note.ts); the clips played into it,
// the clip player's (libs/sequencing/clip-player/). What's heard recorded on the timeline, as regions and lanes, its own views of
// the timeline's events (recorder.ts; recording-data.ts, as plain data to save and load back; track-lanes.ts, note-lanes.ts, a track's lanes and a note's own; lanes.ts, a lane's value by Web Audio's
// curve), and played back from a time (recording-player.ts)
export type { NotePattern, PatternNote } from './pattern-note.ts';
export { phrases } from './pattern-note.ts';
export type { Play, PlayedNote, PlayListener } from './stream.ts';
export { Sequencer } from './input.ts';
export { Recorder } from './recorder.ts';
export type { Region } from './recorder.ts';
export type { Lane } from './track-lanes.ts';
export { shiftedRecording } from './recording-data.ts';
export type { RecordingData, RegionData } from './recording-data.ts';
export { laneValueAt, lastValueAt } from './lanes.ts';
export { RecordingPlayer } from './recording-player.ts';
export type { SentTo, Input, NoteListener, NoteOffListener, Track } from './input.ts';
