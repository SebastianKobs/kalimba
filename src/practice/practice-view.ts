import { mountKalimba, type KalimbaHandle, type Plucker } from '../kalimba-view';
import type { Tongue } from '../layout';
import { arrange, type Arrangement } from '../music/arrange';
import { parseSong, SongTextError } from '../music/notation';
import { PracticeSession, type PracticeMode } from './session';

export interface PracticeSong {
  readonly title: string;
  readonly text: string;
}

/** Draws what's coming; called every tick, with no session when stopped. */
export interface Highway {
  draw(session: PracticeSession | undefined): void;
}
export type HighwayFactory = (canvas: HTMLCanvasElement, kalimba: KalimbaHandle) => Highway;

export interface PracticeConfig {
  readonly tongues: readonly Tongue[];
  /** makes the sound; the practice view adds scoring on top */
  readonly sound: Plucker;
  readonly songs: readonly PracticeSong[];
  readonly highway: HighwayFactory;
}

export interface PracticeView {
  /** advance by wall-clock seconds; the caller drives it, e.g. from requestAnimationFrame */
  tick(seconds: number): void;
  unmount(): void;
}

const MODES: readonly [PracticeMode, string][] = [
  ['wait', 'Wait for me: step by step'],
  ['play-along', 'Play along: keeps time'],
  ['listen', 'Listen: the kalimba plays it'],
];

const FORMAT_HELP =
  "Note names (C4, F#4, Bb3) or kalimba numbers like on the tongues (1 = C4 … 7 = B4, ' an octave up, , an octave down). " +
  'One beat each: _ halves, . adds half, - holds a beat longer, 0 rests, [1 3 5] is a chord. ' +
  'Headers: "title: …" and "tempo: 90". | and // comments are ignored.';

function controlsMarkup(songs: readonly PracticeSong[]): string {
  const songOptions = songs.map((s, i) => `<option value="${i}">${escapeHtml(s.title)}</option>`).join('');
  const modeOptions = MODES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  return `
    <div class="controls">
      <label>Song <select name="song">${songOptions}</select></label>
      <label>Mode <select name="mode">${modeOptions}</select></label>
      <label>Speed <input type="range" name="speed" min="25" max="150" step="5" value="100" />
        <output name="speed-value">100%</output></label>
      <button type="button" name="start">Start</button>
      <button type="button" name="stop">Stop</button>
    </div>
    <details class="song-text">
      <summary>Song text: edit it or paste your own</summary>
      <textarea name="text" rows="8" spellcheck="false"></textarea>
      <p class="help">${FORMAT_HELP}</p>
    </details>
    <p class="status" role="status"></p>
    <p class="error" role="alert"></p>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeFit(a: Arrangement): string {
  const shift = a.transpose === 0 ? 'as written' : `moved ${a.transpose < 0 ? 'down' : 'up'} ${plural(Math.abs(a.transpose), 'semitone')}`;
  const folded = a.notes.filter((n) => n.fit === 'octave').length;
  const parts = [a.title, shift];
  if (folded > 0) parts.push(`${plural(folded, 'note')} moved by an octave to fit`);
  if (a.skipped.length > 0) parts.push(`${plural(a.skipped.length, 'note')} left out: no tongue has them`);
  return parts.join(' · ');
}

function describeScore(session: PracticeSession): string {
  if (session.mode === 'listen') return session.finished ? 'Done.' : '';
  const { hits, misses, total } = session.score;
  const prefix = session.finished ? 'Done: ' : '';
  return `${prefix}${hits} of ${total} played · ${plural(misses, 'miss').replace('misss', 'misses')}`;
}

/** The play-along view: song controls, a highway of falling notes over the kalimba, and the kalimba. */
export function mountPractice(root: HTMLElement, config: PracticeConfig): PracticeView {
  const doc = root.ownerDocument;
  const panel = doc.createElement('section');
  panel.className = 'practice';
  panel.innerHTML = controlsMarkup(config.songs);
  const stage = doc.createElement('div');
  stage.className = 'stage';
  const canvas = doc.createElement('canvas');
  canvas.className = 'highway';
  stage.append(canvas);
  root.append(panel, stage);

  const field = <T extends Element>(name: string) => panel.querySelector<T>(`[name="${name}"]`)!;
  const songSelect = field<HTMLSelectElement>('song');
  const modeSelect = field<HTMLSelectElement>('mode');
  const speedInput = field<HTMLInputElement>('speed');
  const speedValue = field<HTMLOutputElement>('speed-value');
  const textArea = field<HTMLTextAreaElement>('text');
  const status = panel.querySelector<HTMLElement>('.status')!;
  const error = panel.querySelector<HTMLElement>('.error')!;

  let session: PracticeSession | undefined;
  let fit = '';

  const kalimba = mountKalimba(stage, config.tongues, {
    pluck(tongue) {
      config.sound.pluck(tongue);
      if (!session || session.finished) return;
      if (session.pluck(tongue) === 'miss') kalimba.markMiss(tongue);
      refresh();
    },
  });
  const highway = config.highway(canvas, kalimba);

  const refresh = () => {
    kalimba.setTargets(session && !session.finished ? session.targets() : []);
    if (session) status.textContent = [fit, describeScore(session)].filter(Boolean).join(' — ');
  };

  const showSong = () => {
    textArea.value = config.songs[Number(songSelect.value)]?.text ?? '';
  };

  const start = () => {
    error.textContent = '';
    try {
      const arrangement = arrange(parseSong(textArea.value), config.tongues);
      session = new PracticeSession(arrangement, modeSelect.value as PracticeMode);
      fit = describeFit(arrangement);
      refresh();
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
      stop();
      error.textContent = e.message;
    }
  };

  const stop = () => {
    session = undefined;
    kalimba.setTargets([]);
  };

  const speed = () => Number(speedInput.value) / 100;

  songSelect.addEventListener('change', showSong);
  speedInput.addEventListener('input', () => (speedValue.textContent = `${speedInput.value}%`));
  field<HTMLButtonElement>('start').addEventListener('click', start);
  field<HTMLButtonElement>('stop').addEventListener('click', stop);
  showSong();

  return {
    tick(seconds) {
      if (session && !session.finished) {
        const beats = (seconds * session.arrangement.beatsPerMinute * speed()) / 60;
        session.advance(beats).forEach((note) => kalimba.pluck(note.tongue));
        refresh();
      }
      highway.draw(session);
    },
    unmount() {
      kalimba.unmount();
      panel.remove();
      stage.remove();
    },
  };
}
