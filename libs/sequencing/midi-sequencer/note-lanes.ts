// ---------- midi-sequencer/note-lanes: a note as recorded, its changes after it its own lanes ----------
// A note's changes after it, on the note, its own lanes, as a DAW keeps poly aftertouch
// with its note.
import type { PerNoteController, PerNoteControllerName, PerNoteValues } from '../../midi/protocol/index.ts';
import { placeInOrder, type Seconds } from '../../base/util/index.ts';
import { timedValue } from '../../base/automation/index.ts';
import { thinned } from '../timeline/index.ts';
import { lastValueAt, samePoint, type LanePoint } from './lanes.ts';
import type { PlayedNote } from './stream.ts';

// a note as recorded: as the stream carried it, and its changes after it, its own lanes, a per-note controller's points each;
// held where it came with no length, its end told after it, at a time, as one sent with its length sounds that long whatever holds come
export interface RecordedNote extends PlayedNote {
  lanes?: Partial<Record<PerNoteControllerName, LanePoint[]>>;
  held?: true;
}

// a note's change after it, placed in its own lane in time order
export function changedOn(note: RecordedNote, { controller, value, t, glide }: PerNoteController): void {
  const lanes = (note.lanes ??= {});
  placeInOrder((lanes[controller] ??= []), timedValue(value, t, glide), (point) => point.t);
}
// a note's per-note controllers' values at a time: as it starts, each moved by its latest change by then
export function valuesAt(note: RecordedNote, t: Seconds): PerNoteValues {
  const values: PerNoteValues = { ...note.controllers };
  for (const [controller, points] of Object.entries(note.lanes ?? {}) as [PerNoteControllerName, LanePoint[]][]) {
    const latest = lastValueAt(points, t);
    if (latest !== undefined) {
      values[controller] = latest;
    }
  }
  return values;
}
// a note's lanes thinned, each one's first against its value as it starts, a jump
export function thinNote(note: RecordedNote, settled: Seconds): void {
  const { lanes } = note;
  if (!lanes) {
    return;
  }
  for (const [controller, points] of Object.entries(lanes) as [PerNoteControllerName, LanePoint[]][]) {
    const start = note.controllers?.[controller];
    lanes[controller] = thinned(
      points,
      settled,
      samePoint,
      start === undefined ? undefined : { t: note.t, value: start },
    );
  }
}
