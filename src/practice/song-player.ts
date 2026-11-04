import { ClipPlayer } from '../../libs/sequencing/clip-player/index.ts';
import { Clock, type AudioContextLike, type ClockSettings } from '../../libs/sequencing/clock/index.ts';
import type { Input } from '../../libs/sequencing/midi-sequencer/index.ts';
import type { Message } from '../../libs/midi/protocol/index.ts';
import type { Tongue } from '../layout';
import type { ArrangedNote } from '../music/arrange';
import type { Meter } from '../music/notation';
import { beatAt, songClip, songPlacement, type SongPlacement } from './song-clip';

/** What the song player plays on: the audio context its clock follows, a pluck and a click at a time on that context's clock. */
export interface ScheduledSound {
  context(): AudioContextLike;
  pluckAt(tongue: Tongue, t: number, velocity: number): void;
  clickAt(accent: boolean, t: number): void;
}

export interface SongStart {
  /** the notes the kalimba plays; none while the player plays along, the clock and the click still running */
  readonly notes: readonly ArrangedNote[];
  readonly bpm: number;
  readonly meter: Meter;
  readonly leadInBeats: number;
  readonly click: boolean;
}

// a pluck is never quite as hard as the last: velocity drawn in this range
const VELOCITY = [0.85, 1] as const;
const SONG = 'song';

/**
 * Edge: a song played on the clock, as stim-garden's clip player plays a clip: each 16th handed out a little ahead (the clock's
 * lookahead), the song's notes due in it plucked at their times on the audio's own clock, so each voice is built before it sounds.
 * The click on the song's beats, its bars' first beats accented. Where the song is, in its beats, read from the same clock.
 */
export class SongPlayer {
  readonly #sound: ScheduledSound;
  readonly #settings: ClockSettings = { bpm: 100, swing: 0, swingOn: '16ths', quantize: '1/16', meter: [4, 4] };
  readonly #clock: Clock;
  readonly #clips: ClipPlayer<typeof SONG, typeof SONG>;
  #tongues = new Map<number, Tongue>(); // the song's tongues by place: a note's part
  #placement: SongPlacement | undefined;
  #beatsPerBar = 4;
  #click = false;
  #listening = false;

  // clockFor: the clock on these settings, read live; a fake one in tests
  constructor(sound: ScheduledSound, clockFor: (settings: ClockSettings) => Clock = (settings) => new Clock({ settings })) {
    this.#sound = sound;
    this.#clock = clockFor(this.#settings);
    this.#clips = new ClipPlayer({ input: this.#input(), grid: this.#clock.grid });
  }

  /** The song from a bar ahead, on a beat; what played before let go. */
  play({ notes, bpm, meter, leadInBeats, click }: SongStart): void {
    this.#settings.bpm = bpm;
    this.#settings.meter = [meter.beatsPerBar, meter.beatUnit];
    this.#beatsPerBar = meter.beatsPerBar;
    this.#click = click;
    this.#running();
    const grid = this.#clock.grid;
    this.#placement = songPlacement({
      now: grid.straightAt(this.#clock.now()),
      handedOut: grid.nextStepNumber,
      leadInBeats,
      stepsPerBeat: grid.stepsPerBeat(),
      firstBeat: notes.length > 0 ? Math.min(...notes.map((n) => n.beat)) : 0,
    });
    this.#tongues = new Map(notes.map((n) => [n.tongue.index, n.tongue]));
    this.#clips.put(SONG, {
      to: { track: SONG },
      pattern: songClip(notes, this.#settings.meter),
      once: true,
      straight: true,
      velocity: () => VELOCITY[0] + (VELOCITY[1] - VELOCITY[0]) * Math.random(),
    });
    this.#clips.launch(SONG, this.#placement.startStep);
  }

  stop(): void {
    this.#clips.stop(SONG);
    this.#placement = undefined;
  }

  /** Where the song is now, in its beats: negative in the lead-in; none when no song plays. */
  beat(): number | undefined {
    if (!this.#placement) return undefined;
    return beatAt(this.#placement, this.#clock.grid.straightAt(this.#clock.now()));
  }

  setTempo(bpm: number): void {
    this.#settings.bpm = bpm;
  }

  setClick(on: boolean): void {
    this.#click = on;
  }

  // the clock on the audio's time once a song is asked for: the audio runs by then, started by the press that asked
  #running(): void {
    if (this.#listening) return;
    this.#listening = true;
    this.#clock.useAudio(this.#sound.context());
    this.#clock.onStep((i, t) => this.#step(i, t));
    this.#clock.start();
  }

  #step(i: number, t: number): void {
    this.#clips.step(i, t);
    if (this.#click && this.#placement) this.#clickOn(this.#placement, i, t);
  }

  // a click on each of the song's beats, its bars' first accented, the lead-in's too
  #clickOn(placement: SongPlacement, i: number, t: number): void {
    const beat = beatAt(placement, i);
    if (!Number.isInteger(beat)) return;
    const inBar = ((beat % this.#beatsPerBar) + this.#beatsPerBar) % this.#beatsPerBar;
    this.#sound.clickAt(inBar === 0, this.#clock.audio.toContext(t));
  }

  // where the clip player sends the song: each note on plucks its tongue at its time on the audio's clock; the tine rings as it will,
  // so the note offs are the kalimba's own
  #input(): Input<typeof SONG> {
    return {
      send: (_to, messages: readonly Message[]) => {
        for (const message of messages) {
          if (message.type !== 'note on') continue;
          const tongue = this.#tongues.get(message.part ?? -1);
          if (tongue) this.#sound.pluckAt(tongue, this.#clock.audio.toContext(message.t), message.velocity);
        }
      },
      onNote: () => () => {},
      onNoteOff: () => () => {},
    };
  }
}
