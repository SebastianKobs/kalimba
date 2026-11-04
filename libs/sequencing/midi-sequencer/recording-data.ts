// ---------- midi-sequencer/recording-data: the recording as plain data, its regions and lanes, to save and to load back ----------
// What the recorder keeps, JSON-safe: each region with its notes (their own lanes, glides and a held one's open end included) and each
// track's lane with its points, times as recorded, with where the recording begins and ends so a loader can shift them onto its clock.
// A region's owner is the sender's own object, so it's written as an id, one per element: regions of one element stay together, and
// one is told apart from another as the recorder tells them. Its clip is written by the name its asker gives it, an id where none does.
// A version from 1, so a later change is told apart.
import type { Seconds } from '../../base/util/index.ts';
import type { Region } from './recorder.ts';
import type { RecordedNote } from './note-lanes.ts';
import type { Lane } from './track-lanes.ts';

// a region as data: its first play's, its notes; its span left out, as the notes give it
export interface RegionData {
  owner: string;
  clip: string;
  number?: number;
  kind: string;
  role?: string;
  live: boolean;
  track: number | null;
  trackName?: string;
  until?: number | 'never';
  notes: RecordedNote[];
}
// a recording as data: from where it begins to where it ends, as the recorder was asked, its regions in the order they began
export interface RecordingData {
  version: 1;
  begins: Seconds;
  ends: Seconds;
  regions: RegionData[];
  lanes: Lane[];
}

// a region's number among its element's: the recorder keeps it beside the region, not in it
interface NumberedRegion {
  region: Region;
  number: number | undefined;
}

export const RECORDING_VERSION = 1;

// the recording as data at now: ids for the owners, the clips named as asked, each region, note and lane a copy of its own, nothing undefined, an open end 'never'
export function recordingData(
  numbered: readonly NumberedRegion[],
  lanes: readonly Lane[],
  now: Seconds,
  nameOfClip?: (region: Region) => string,
): RecordingData {
  const ids = new Map<unknown, string>();
  const idOf = (element: unknown): string => {
    if (!ids.has(element)) {
      ids.set(element, `element-${ids.size}`);
    }
    return ids.get(element)!; // set just above
  };
  const regions = numbered.map(({ region, number }) => regionData(region, number, { idOf, nameOfClip }));
  return plain({
    version: RECORDING_VERSION,
    begins: earliest(numbered, lanes, now),
    ends: now,
    regions,
    lanes: [...lanes],
  });
}
// where the recording begins: its first region's start or lane point, now if it holds none; a loop, as a long session's points are more
// than a call takes as its arguments
function earliest(numbered: readonly NumberedRegion[], lanes: readonly Lane[], now: Seconds): Seconds {
  let begins = now;
  for (const { region } of numbered) {
    begins = Math.min(begins, region.from);
  }
  for (const lane of lanes) {
    for (const point of lane.points) {
      begins = Math.min(begins, point.t);
    }
  }
  return begins;
}

// a region as data, with an id for its element and a name or an id for its clip
function regionData(
  region: Region,
  number: number | undefined,
  { idOf, nameOfClip }: { idOf: (element: unknown) => string; nameOfClip: ((region: Region) => string) | undefined },
): RegionData {
  const { owner, clip, kind, role, live, track, trackName, until, notes } = region;
  return {
    owner: idOf(owner),
    clip: nameOfClip ? nameOfClip(region) : idOf(clip),
    ...(number === undefined ? {} : { number }),
    kind,
    ...(role === undefined ? {} : { role }),
    live,
    track,
    ...(trackName === undefined ? {} : { trackName }),
    ...(until === undefined ? {} : { until: until === Infinity ? 'never' : until }),
    notes,
  };
}
// a recording's data moved by an offset, a copy: every time later by it, earlier if it's less than none, so a recording made on one clock
// lies on another's; a length, a glide's time constant and an open end stay as they are
export function shiftedRecording(data: RecordingData, offset: Seconds): RecordingData {
  const later = <Point extends { t: Seconds }>(point: Point): Point => ({ ...point, t: point.t + offset });
  const note = (recorded: RecordedNote): RecordedNote => {
    const { lanes, glides, ...rest } = recorded;
    return {
      ...rest,
      t: recorded.t + offset,
      ...(glides ? { glides: glides.map(([at, pitch]): [number, number] => [at + offset, pitch]) } : {}),
      ...(lanes ?
        { lanes: Object.fromEntries(Object.entries(lanes).map(([name, points]) => [name, points.map(later)])) }
      : {}),
    };
  };
  return plain({
    ...data,
    begins: data.begins + offset,
    ends: data.ends + offset,
    regions: data.regions.map((kept) => ({
      ...kept,
      ...(typeof kept.until === 'number' ? { until: kept.until + offset } : {}),
      notes: kept.notes.map(note),
    })),
    lanes: data.lanes.map((lane) => ({ ...lane, points: lane.points.map(later) })),
  });
}
// data as its own copy: undefined left out, as JSON leaves it, so what's loaded is what's saved
export function plain<Data>(data: Data): Data {
  return JSON.parse(JSON.stringify(data)) as Data;
}
