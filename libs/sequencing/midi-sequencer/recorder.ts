// ---------- midi-sequencer/recorder: what was heard, kept as regions, the last 30 minutes of song time, for an arrangement to show ----------
// As Ableton records the session into its arrangement (mockup/architecture/views.md): every play the stream carries, live or not,
// into the region it's of (play.region), told apart by its element and its number, a region's number its
// source's; a play with none, a region of its own; a launched clip's plays left out, as nothing a user launches is recorded. A region
// runs from its first note to the end of its last; a held note open until its note off comes, a play of its own by the note's index, its
// glides added to it; one still held as its element's next region begins, a held part's as its key changes, ends there and starts
// again in the new region, as it sounds on. Kept for the last 30 minutes, in memory: a note ended before then let go, and a region with none.
// In song time: the plays carry clock times, as they're scheduled, and each is turned into song time as it's heard, through the TimeMap it's
// handed (libs/sequencing/clock/); so a hold, a stop's, leaves no gap, and everything it hands out or is asked, its regions, lanes, data and
// the now it lets go by, is song time. The 30 minutes are 30 minutes of the music, not of the clock: a long stop doesn't spend them.
// What moves as it's heard: a track's lanes (track-lanes.ts), a note's own (note-lanes.ts).
// On the timeline (libs/sequencing/timeline/): each note an event with its own length or open until its note off, each lane's point one that
// holds until the next of its lane, kept for the 30 minutes, what's in effect kept; the regions and lanes the music's own views of them
import { ALONG_THE_CLOCK, endOf, LATEST, Timeline, type TimedEvent } from '../timeline/index.ts';
import type { TimeMap } from '../clock/index.ts';
import { samePoint, type LanePoint } from './lanes.ts';
import type { Controller, NoteOff, PerNoteController } from '../../midi/protocol/index.ts';
import type { Play, PlayedNote } from './stream.ts';
import { entryOf, type Seconds } from '../../base/util/index.ts';
import { changedOn, thinNote, valuesAt, type RecordedNote } from './note-lanes.ts';
import { TrackLanes, type Lane } from './track-lanes.ts';
import { plain, RECORDING_VERSION, recordingData, type RecordingData, type RegionData } from './recording-data.ts';

// A region as recorded, as its first play had them: the element it's of and
// its clip, its kind and role, whether it was played live, its track and until
// when it holds it; its notes, and from when to when, an open one's end never.
export interface Region {
  owner: unknown;
  clip: unknown;
  kind: string;
  role: string | undefined;
  live: boolean;
  track: number | null;
  trackName: string | undefined;
  until: Seconds | undefined;
  notes: RecordedNote[];
  from: Seconds;
  to: Seconds;
}
// a region as it's kept: its first play, and its notes as they come, the recorder's own copies, the timeline's events, which a held
// note's end and glides change
interface Kept {
  first: Play;
  notes: RecordedNote[];
}

export class Recorder {
  readonly #timeline: Timeline<RecordedNote, LanePoint>; // each note, and each lane's points, the events that hold until the next
  #kept: Kept[] = []; // in the order they began
  readonly #numbered = new Map<unknown, Map<number, Kept>>(); // each element's regions, by their number
  readonly #trackLanes: TrackLanes; // each track's lanes, as heard
  #leftOut: (play: Play) => boolean = () => false; // what its owner says to leave out
  readonly #song: TimeMap; // a clock time to song time, as a play is heard

  // song: the clock's song time, to turn the plays' clock times into; none, the clock's time is song time
  constructor({ song = ALONG_THE_CLOCK }: { song?: TimeMap } = {}) {
    this.#song = song;
    this.#timeline = new Timeline<RecordedNote, LanePoint>({
      same: (before, after) => samePoint(before, after),
      onLetGo: (gone) => this.#forget(gone),
    });
    this.#trackLanes = new TrackLanes(this.#timeline);
  }
  // a play the stream carries, at its clock times, into the region it's of, at song time; one its sender or its owner leaves out
  // of the recording, left out
  heard(clockPlay: Play): void {
    if (clockPlay.unrecorded || this.#leftOut(clockPlay)) {
      return;
    }
    const play = inSongTime(clockPlay, this.#song);
    this.#told(play.owner, play.ends ?? []);
    this.#changed(play.owner, play.changes ?? []);
    this.#trackLanes.heard(play);
    if (!play.notes.length) {
      return; // only a held note's end, glides or changes, or a track's controllers, told above
    }
    const { kept, carried } = this.#regionOf(play);
    const notes = [...play.notes.map((note) => recorded(note)), ...carried];
    kept.notes.push(...notes);
    this.#timeline.add(notes); // what's past the 30 minutes let go as they come
  }
  // What its owner leaves out, as the transport says: a surface's notes while the
  // arrangement plays back.
  leaveOut(leftOut: (play: Play) => boolean): void {
    this.#leftOut = leftOut;
  }
  // the regions kept at a song time now, in the order they began, those wholly before the last 30 minutes of song time let go
  regions(now: Seconds): Region[] {
    this.#settle(now);
    return this.#kept.map((kept) => regionOf(kept));
  }
  // each track's lanes at a song time now, in the order they began, their points before the last 30 minutes let go but each one's last
  lanes(now: Seconds): Lane[] {
    this.#settle(now);
    return this.#trackLanes.lanes();
  }
  // the recording at a song time now as plain data, to save: the regions and lanes as `regions()` and `lanes()` hand them out, owners as ids, clips
  // by the name nameOfClip gives each region's, ids where it's not handed
  toData(now: Seconds, nameOfClip?: (region: Region) => string): RecordingData {
    const regions = this.regions(now);
    const numbered = regions.map((region, at) => ({ region, number: this.#kept[at]!.first.region })); // regions() keeps their order
    return recordingData(numbered, this.lanes(now), now, nameOfClip);
  }
  // everything forgotten, regions, lanes and region numbers: as new, ready to hear or load
  empty(): void {
    this.#timeline.clear();
    this.#trackLanes.clear();
    this.#kept = [];
    this.#numbered.clear();
  }
  // a recording's data loaded into this recorder, a copy of it, as if it had heard it; only into an empty one (empty()), as owners' ids are its own
  load(data: RecordingData): void {
    if (data.version !== RECORDING_VERSION) {
      throw new Error(
        `a recording in version ${String(data.version)} can't be loaded, only version ${String(RECORDING_VERSION)}`,
      );
    }
    if (this.#kept.length || this.#trackLanes.lanes().length) {
      throw new Error('a recording can only be loaded into an empty recorder');
    }
    for (const region of plain(data.regions)) {
      this.#restore(region);
    }
    for (const lane of plain(data.lanes)) {
      this.#trackLanes.restore(lane);
    }
  }
  // the timeline as of now, the notes let go and their regions with them; the points that change nothing, once they're settled, left
  // out of every lane, a track's and a note's
  #settle(now: Seconds): void {
    this.#timeline.settle(now);
    for (const note of this.#kept.flatMap((kept) => kept.notes)) {
      thinNote(note, now - LATEST); // a note's change that changes nothing, thinned once nothing comes that late
    }
  }
  // A held note's end, as it comes, on its element's note of that index still held.
  // One let go before it sounded, its note off for a time before its note on's
  // (a gesture ending a phrase's note still to come), no length,
  // never less.
  #told(owner: unknown, ends: readonly NoteOff[]): void {
    for (const end of ends) {
      const note = this.#noteOf(owner, end.index, { held: true });
      if (note) {
        this.#timeline.endAt(note, end.t);
      }
    }
  }
  // a note's changes after it, as they come, on its element's latest note of that index, its own lanes
  #changed(owner: unknown, changes: readonly PerNoteController[]): void {
    for (const change of changes) {
      const note = this.#noteOf(owner, change.index);
      if (!note) {
        continue;
      }
      changedOn(note, change);
    }
  }
  // An element's latest note of an index, from the latest region back:
  //   - held or not, as a change comes for a note still sounding;
  //   - held only (held), as its end or a glide comes.
  #noteOf(owner: unknown, index: number, { held = false }: { held?: boolean } = {}): RecordedNote | undefined {
    for (let at = this.#kept.length - 1; at >= 0; at--) {
      const kept = this.#kept[at]!; // within the list
      if (kept.first.owner !== owner) {
        continue;
      }
      const note = kept.notes.findLast((latest) => latest.index === index && (!held || latest.duration === undefined));
      if (note) {
        return note;
      }
    }
    return undefined;
  }
  // the region a play is of: its element's by its number, or a new one, the notes still held in its element's others ending where it
  // begins and carried into it; with no number, a region of its own
  #regionOf(play: Play): { kept: Kept; carried: RecordedNote[] } {
    if (play.region === undefined) {
      return { kept: this.#begin(play), carried: [] };
    }
    const numbered = entryOf(this.#numbered, play.owner, () => new Map<number, Kept>());
    const known = numbered.get(play.region);
    if (known) {
      return { kept: known, carried: [] };
    }
    const begins = Math.min(...play.notes.map((note) => note.t));
    const carried = [...numbered.values()].flatMap((before) => heldThrough(before, begins));
    const kept = this.#begin(play);
    numbered.set(play.region, kept);
    return { kept, carried };
  }
  // a region from data: its first play as its owner's, its notes its own, on the timeline, its number its element's again
  #restore({ notes, number, owner, clip, until, ...rest }: RegionData): void {
    const first: Play = { ...rest, owner, clip, notes: [] };
    if (number !== undefined) {
      first.region = number;
    }
    if (until !== undefined) {
      first.until = until === 'never' ? Infinity : until;
    }
    const kept: Kept = { first, notes };
    this.#kept.push(kept);
    if (number !== undefined) {
      entryOf(this.#numbered, owner, () => new Map<number, Kept>()).set(number, kept);
    }
    this.#timeline.add(notes);
  }
  #begin(play: Play): Kept {
    const kept: Kept = { first: play, notes: [] };
    this.#kept.push(kept);
    return kept;
  }
  // the notes the timeline let go out of their regions, and each region with none left, from its element's too
  #forget(gone: readonly TimedEvent[]): void {
    const goneNotes = new Set<TimedEvent>(gone);
    for (const kept of this.#kept) {
      kept.notes = kept.notes.filter((note) => !goneNotes.has(note));
    }
    for (const empty of this.#kept.filter((kept) => !kept.notes.length)) {
      const numbered = this.#numbered.get(empty.first.owner);
      numbered?.delete(empty.first.region!); // a region its element numbers has its number
      if (numbered?.size === 0) {
        this.#numbered.delete(empty.first.owner);
      }
    }
    this.#kept = this.#kept.filter((kept) => kept.notes.length);
  }
}

// a play with its clock times turned into song time: its notes and their glides, a held note's end, the changes and a track's controllers;
// a note's length, a glide's time constant and an open end stay as they are
function inSongTime(play: Play, song: TimeMap): Play {
  if (song === ALONG_THE_CLOCK) {
    return play;
  }
  const at = (t: Seconds): Seconds => song.toTimeline(t);
  const timed = <Timed extends { t: Seconds }>(point: Timed): Timed => ({ ...point, t: at(point.t) });
  const converted: Play = { ...play, notes: play.notes.map((note) => noteInSongTime(note, at)) };
  if (play.until !== undefined) {
    converted.until = at(play.until);
  }
  if (play.ends) {
    converted.ends = play.ends.map((end): NoteOff => timed(end));
  }
  if (play.changes) {
    converted.changes = play.changes.map((change): PerNoteController => timed(change));
  }
  if (play.controls) {
    converted.controls = play.controls.map((control): Controller => timed(control));
  }
  return converted;
}
// a note with its start and its glides' times in song time
function noteInSongTime(note: PlayedNote, at: (t: Seconds) => Seconds): PlayedNote {
  const { glides } = note;
  return {
    ...note,
    t: at(note.t),
    ...(glides ? { glides: glides.map(([when, pitch]): [number, number] => [at(when), pitch]) } : {}),
  };
}
// a note as the recorder keeps it, its own copy: held where it came with no length
// a note as it's kept: the glides sent with it its pitch's lane, as those sent after it are
function recorded({ glides, ...note }: PlayedNote): RecordedNote {
  const kept: RecordedNote =
    glides?.length ? { ...note, lanes: { pitch: glides.map(([t, value]) => ({ value, t })) } } : { ...note };
  if (note.duration === undefined) {
    kept.held = true;
  }
  return kept;
}
// a kept region as it's handed out: its first play's, its notes, from its first to the end of its last
function regionOf(kept: Kept): Region {
  const { owner, clip, kind, role, live, track, trackName, until } = kept.first;
  return {
    owner,
    clip: clip ?? owner,
    kind,
    role,
    live: live ?? false,
    track: track ?? null,
    trackName,
    until,
    notes: kept.notes,
    from: Math.min(...kept.notes.map((note) => note.t)),
    to: Math.max(...kept.notes.map((note) => endOf(note))),
  };
}
// a region's notes still held as its element's next region begins: each ended there, and a copy of it from there, held on
function heldThrough(before: Kept, begins: Seconds): RecordedNote[] {
  const held = before.notes.filter((note) => note.duration === undefined);
  for (const note of held) {
    note.duration = begins - note.t;
  }
  return held.map((note) => carried(note, begins));
}
// a held note carried into its element's next region: from there, its values as they are then, its glides and changes before staying with
// the old
function carried(note: RecordedNote, begins: Seconds): RecordedNote {
  const { duration: _ended, lanes: _changed, ...held } = note;
  const copy: RecordedNote = { ...held, t: begins };
  if (Object.keys(note.lanes ?? {}).some((controller) => controller !== 'pitch')) {
    const { pitch: _glided, ...values } = valuesAt(note, begins); // its pitch its own, as it began
    copy.controllers = values;
  }
  return copy;
}
