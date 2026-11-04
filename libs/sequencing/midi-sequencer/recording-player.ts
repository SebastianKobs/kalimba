// ---------- midi-sequencer/recording-player: the recording played back from a time, its regions' notes as heard, its lanes with them ----------
// As Ableton plays its arrangement: each region's notes sent into the input as they come due, offset
// from the recording's time to now, to the track it was recorded on, by name, with its clip, live or not, marked played back
// and left out of the recording, its sender its own, so its notes don't meet another sender's on a track. A note's start, its glides, its
// changes and its end each sent once it comes due, not all at once, so a stop can still let go what sounds; played to the end, what sounds
// there rings out as it was recorded. And each lane's points, a controller on the lane's track, picked up where it starts at its value
// then, as a sounding note is chased, a glide where it had got to; a lane moved by hand while it plays back passed over, the move
// overriding it until playback ends, as Ableton's override; and the strips back as they were when it started, but one moved by hand, once
// it ends. On the timeline's player (libs/sequencing/timeline/), one for both: here only the music's mapping onto it, a note's start a note
// on with its values then, its glides and changes per-note controllers, its end a note off, each note a fresh index, a region's address; a
// lane's point a controller, its value where it's picked up by Web Audio's curve; the strips put back; the recording in song time, the
// timeline time of music (recorder.ts), so a hold is already out of it
import type { Seconds } from '../../base/util/index.ts';
import { Player, type PlayedFrom } from '../timeline/index.ts';
import type { SentTo, Input } from './input.ts';
import { lastValueAt, laneValueAt, type LanePoint } from './lanes.ts';
import { NoteRotation, noteMessages, type Message, type PerNoteControllerName } from '../../midi/protocol/index.ts';
import type { Region } from './recorder.ts';
import type { Lane } from './track-lanes.ts';
import { valuesAt, type RecordedNote } from './note-lanes.ts';
import { timedValue, type TimedValue } from '../../base/automation/index.ts';

// a note's point after its start: a change to one of its per-note controllers, its pitch's a glide, gliding there where it came with a
// time constant
type NotePoint = { controller: PerNoteControllerName } & TimedValue;
// a lane as it plays: the lane, and the track it's on
interface PlayedLane<Track extends string> {
  lane: Lane;
  track: Track;
}
// a lane put back once playback ends: its track, and its value at the end of what was recorded before playback started
interface PutBack<Track extends string> extends PlayedLane<Track> {
  value: number;
}

const SENDER = 'playback'; // its sender at the input, kept apart from live play's

// the recording played back from a time (play()), what's due sent each tick (due()); stopped or jumping (stop()), left for live play
// (leave()) or played to the end (finish()); where it plays (position()), when it plays to the end (endsAt()), and whether it has (ended())
export class RecordingPlayer<Track extends string> {
  readonly #input: Pick<Input<Track>, 'send'>;
  readonly #skip: (track: Track, controller: string) => boolean;
  readonly #rotation = new NoteRotation();
  readonly #player: Player<RecordedNote, LanePoint, NotePoint>;
  readonly #regions = new Map<RecordedNote, Region>(); // each note played, its region, its address's
  readonly #indices = new Map<RecordedNote, number>(); // each note started, its index, until its note off is sent
  #lanes = new Map<LanePoint, PlayedLane<Track>>(); // each lane's point played, its lane and track
  #putBack: PutBack<Track>[] = [];

  constructor({
    input,
    skip = () => false,
  }: {
    input: Pick<Input<Track>, 'send'>;
    skip?: (track: Track, controller: string) => boolean;
  }) {
    this.#input = input;
    this.#skip = skip;
    this.#player = new Player<RecordedNote, LanePoint, NotePoint>({
      performer: {
        start: (note, t, at) => this.#started(note, t, at),
        point: (note, point, t) => this.#moved(note, point, t),
        end: (note, t) => this.#ended(note, t),
        hold: (point, t, from) => this.#set(point, t, from),
      },
      pointsOf: (note) => pointsOf(note),
    });
  }
  // the regions and lanes played from a song time, heard at a clock time: each note that sounds from then until the end, one already
  // sounding chased, started at once for what's left of it; each lane picked up there at its value then, each point after it until the
  // end at its time; a region or a lane on no track left out. What each lane is put back to once playback ends: its value at the end
  play(regions: readonly Region[], lanes: readonly Lane[], from: PlayedFrom): void {
    this.#forgetPlayed();
    const notes = regions
      .filter((region) => region.trackName !== undefined)
      .flatMap((region) =>
        region.notes.filter((note) => note.pitch !== undefined).map((note) => this.#played(note, region)),
      );
    const played = lanes.flatMap((lane): PlayedLane<Track>[] => {
      const track = lane.trackName as Track | undefined; // the input's tracks, as it was sent to one
      return track === undefined ? [] : [{ lane, track }];
    });
    this.#lanes = new Map(played.flatMap((one) => one.lane.points.map((point) => [point, one] as const)));
    this.#putBack = played.flatMap((one) => {
      const value = laneValueAt(one.lane.points, from.end);
      return value === undefined ? [] : [{ ...one, value }];
    });
    this.#player.play({ events: notes, held: played.map(({ lane }) => lane.points) }, from);
  }
  // each tick: every moment due before a clock time, sent in order, each heard as far after it started as it was played, in song time
  due(until: Seconds): void {
    this.#player.due(until);
  }
  // stopped or jumping at a clock time: what sounds let go then, nothing more sent; what its lanes set left as it is, put back once
  // playback ends
  stop(t: Seconds): void {
    this.#player.stop(t);
  }
  // left for live play at a clock time, before the end: the strips back as they were when it started, but one moved by hand; what
  // sounds let go then
  leave(t: Seconds): void {
    this.#putLanesBack(t);
    this.#player.stop(t);
  }
  // played to the end at a clock time, where it catches up with what was recorded before it started: the strips back as they were; what
  // sounds rings out to its recorded end, as far after it was heard from as it was recorded to sound, not cut there; a note held open in
  // the recording let go then; nothing more sent
  finish(t: Seconds): void {
    this.#putLanesBack(t);
    this.#player.finish(t);
  }
  // the song time it plays at a clock time; none when it doesn't play
  position(now: Seconds): Seconds | null {
    return this.#player.position(now);
  }
  // the clock time it plays to the end of what was recorded before it started; none when it doesn't play
  endsAt(): Seconds | null {
    return this.#player.endsAt();
  }
  // whether it has played to the end
  ended(now: Seconds): boolean {
    return this.#player.ended(now);
  }
  // the regions of the notes played before let go, but those still sounding, as a new play() doesn't let them go
  #forgetPlayed(): void {
    for (const note of [...this.#regions.keys()].filter((played) => !this.#indices.has(played))) {
      this.#regions.delete(note);
    }
  }
  #played(note: RecordedNote, region: Region): RecordedNote {
    this.#regions.set(note, region);
    return note;
  }
  // a note started at a clock time, the recording's time it starts at `at`: its note on, its velocity, its per-note controllers as it
  // started, its bend; chased, as it was by then, its pitch glided to, its controllers changed, past its slide in
  #started(note: RecordedNote, t: Seconds, at: Seconds): void {
    const index = this.#rotation.noteOn();
    const chased = at > note.t;
    this.#indices.set(note, index);
    const { pitch: _glided, ...controllers } = valuesAt(note, at); // as it was by then, its pitch its note on's
    if (chased) {
      delete controllers.bend; // past its slide in
    }
    const played = { pitch: pitchAt(note, at), velocity: note.velocity ?? 1, t, part: note.part, controllers };
    this.#sendNote(note, noteMessages(played, index));
  }
  // a change after a note's start, a per-note controller by its index, a glide its pitch's
  #moved(note: RecordedNote, { controller, value, glide }: NotePoint, t: Seconds): void {
    const index = this.#indices.get(note)!; // a note's points come while it sounds
    this.#sendNote(note, [{ type: 'per-note controller', index, controller, ...timedValue(value, t, glide) }]);
  }
  // a note's end, or what sounds let go as playback stops or ends: its note off, its index free again
  #ended(note: RecordedNote, t: Seconds): void {
    const index = this.#indices.get(note)!; // a note ends after it started
    this.#indices.delete(note);
    this.#rotation.noteOff(index);
    this.#sendNote(note, [{ type: 'note off', index, t }]);
  }
  #sendNote(note: RecordedNote, messages: Message[]): void {
    const region = this.#regions.get(note)!; // a note played has its region
    const to: SentTo<Track> = {
      track: region.trackName as Track, // on a track, as filtered: the input's
      clip: region.clip as { kind: string },
      live: region.live,
      source: SENDER,
      play: { playback: true, unrecorded: true, kind: region.kind, track: region.track },
    };
    this.#input.send(to, messages);
  }
  // a lane's point as it comes due, its value gliding there where it glides; or the one in effect where playback starts, picked up there
  // at the lane's value then, a glide where it had got to
  #set(point: LanePoint, t: Seconds, from: Seconds | undefined): void {
    const played = this.#lanes.get(point)!; // a point played has its lane
    if (from === undefined) {
      this.#sendLane(played, point.value, t, point.glide);
      return;
    }
    this.#sendLane(played, laneValueAt(played.lane.points, from)!, t); // in effect there: a value then
  }
  // playback ended at a clock time: each lane it played back as it was when it started, but one moved by hand, its move standing; once
  #putLanesBack(t: Seconds): void {
    for (const { value, ...played } of this.#putBack) {
      this.#sendLane(played, value, t);
    }
    this.#putBack = [];
  }
  // a lane's controller sent to its track at a time, gliding there where it has a time constant; none for one moved by hand
  #sendLane({ lane, track }: PlayedLane<Track>, value: number, t: Seconds, glide?: Seconds): void {
    if (this.#skip(track, lane.controller)) {
      return;
    }
    const to: SentTo<Track> = {
      track,
      source: SENDER,
      play: { playback: true, unrecorded: true, kind: lane.kind, track: lane.track },
    };
    this.#input.send(to, [{ type: 'controller', controller: lane.controller, ...timedValue(value, t, glide) }]);
  }
}

// a note's points after its start, in its own time: its per-note controllers' changes, its pitch's glides among them, a lane at a time
function pointsOf(note: RecordedNote): NotePoint[] {
  return (Object.entries(note.lanes ?? {}) as [PerNoteControllerName, LanePoint[]][]).flatMap(([controller, points]) =>
    points.map((point): NotePoint => ({ controller, ...point })),
  );
}
// a note's pitch at a time of the recording's: the last it had glided to by then, or its own
function pitchAt(note: RecordedNote, t: Seconds): number {
  return lastValueAt(note.lanes?.pitch ?? [], t) ?? note.pitch!; // a note with a pitch, as play() keeps
}
