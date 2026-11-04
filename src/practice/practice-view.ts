import { mountKalimba, type KalimbaHandle, type Plucker } from '../kalimba-view';
import { retune, type Tongue } from '../layout';
import { describeTuning } from '../tuning';
import { arrange, transposeOptions, type Arrangement, type TransposeOption } from '../music/arrange';
import { describeShift } from '../music/interval';
import { DEFAULT_TEMPO, keyOf, parseSong, SongTextError, tempoOf, titleOf, type IgnoredText } from '../music/notation';
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
  /** half steps per tongue, -1, 0 or 1; validated by the caller */
  readonly tuning?: readonly number[];
  onTuningChange?(halfSteps: readonly number[]): void;
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
  'Paste a kalimba tab or write your own. Notes: kalimba numbers like on the tongues (1 = C4 … 7 = B4) or letters (C, F#, Bb, or C5 with an octave). ' +
  "Octave up: ' ′ * ° or a dot above, doubled (or ″ \") for two; octave down: , or a dot below. " +
  'Played together: ( ) or [ ], e.g. (1 3 5), (135), (5-7), [C E G]. A - after a note holds it a beat longer: 2-4 is 2 for two beats, then 4. ' +
  'Rhythm: one beat per note at the tempo slider; _ halves, . adds half, 0 rests. ' +
  'Headers: "title: …", "tempo: 90" (sets the slider) and "key: G" (every F becomes F#, like a kalimba with its F tongue raised; also D, F, Bb, Em …). Anything else, such as lyrics, links or headings, is skipped and listed.';

const MAX_NAME_LENGTH = 80;

// retuned kalimbas tabs are often written for; any other key can be typed as a "key:" line
const TAB_TUNINGS: readonly [string, string][] = [
  ['', 'as written (C)'],
  ['G', 'F raised to F# (G major)'],
  ['D', 'F and C raised (D major)'],
  ['F', 'B lowered to Bb (F major)'],
];

function songOption(song: PracticeSong, index: number): string {
  return `<option value="${index}">${escapeHtml(song.title)}</option>`;
}

function controlsMarkup(songs: readonly PracticeSong[]): string {
  const songOptions = songs.map(songOption).join('');
  const modeOptions = MODES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  return `
    <div class="controls">
      <label>Song <select name="song">${songOptions}</select></label>
      <label>Mode <select name="mode">${modeOptions}</select></label>
      <label>Tempo <input type="range" name="tempo" min="20" max="240" step="1" value="${DEFAULT_TEMPO}" />
        <output name="tempo-value">${DEFAULT_TEMPO} BPM</output></label>
      <label>Transpose <select name="transpose"></select></label>
      <button type="button" name="start">Start</button>
      <button type="button" name="stop">Stop</button>
    </div>
    <div class="song-text">
      <textarea name="text" rows="4" spellcheck="false" aria-label="Song text"
        placeholder="Paste a kalimba tab here, name it and press Import"></textarea>
      <div class="import-row">
        <label>Name <input type="text" name="import-name" maxlength="${MAX_NAME_LENGTH}" placeholder="e.g. Sweden" /></label>
        <label>Tab tuning <select name="import-key">${TAB_TUNINGS.map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
        <button type="button" name="import">Import</button>
        <details class="help"><summary>Tab format</summary><p>${FORMAT_HELP}</p></details>
      </div>
    </div>
    <div class="tuning-row">
      <button type="button" name="retune" aria-pressed="false">Retune</button>
      <button type="button" name="retune-reset">Reset tuning</button>
      <span class="tuning"></span>
    </div>
    <p class="status" role="status"></p>
    <p class="skipped"></p>
    <p class="error" role="alert"></p>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeFit(name: string, a: Arrangement): string {
  const shift = a.transpose === 0 ? 'as written' : `moved ${describeShift(a.transpose)}`;
  const folded = a.notes.filter((n) => n.fit === 'octave').length;
  const parts = [name, shift];
  if (folded > 0) parts.push(`${plural(folded, 'note')} moved by an octave to fit`);
  if (a.skipped.length > 0) parts.push(`${plural(a.skipped.length, 'note')} left out: no tongue has them`);
  return parts.join(' · ');
}

function describeOption(option: TransposeOption, best: boolean): string {
  const parts = [describeShift(option.transpose)];
  if (option.folded > 0) parts.push(`${plural(option.folded, 'note')} moved by an octave`);
  if (option.skipped > 0) parts.push(`${plural(option.skipped, 'note')} left out`);
  if (best) parts.push('best fit');
  return parts.join(' · ');
}

// a tap in retune mode: natural → sharp → flat → natural
const NEXT_TUNING: Record<number, number> = { 0: 1, 1: -1, [-1]: 0 };
const SKIPPED_SHOWN = 6;
const SKIPPED_TEXT_LENGTH = 40;

function describeIgnored(ignored: readonly IgnoredText[]): string {
  if (ignored.length === 0) return '';
  const shorten = (text: string) => (text.length > SKIPPED_TEXT_LENGTH ? `${text.slice(0, SKIPPED_TEXT_LENGTH - 1)}…` : text);
  const items = ignored
    .slice(0, SKIPPED_SHOWN)
    .map((i) => `line ${i.line} "${shorten(i.text)}"${i.reason ? ` (${i.reason})` : ''}`);
  const more = ignored.length > SKIPPED_SHOWN ? ` and ${ignored.length - SKIPPED_SHOWN} more` : '';
  return `Skipped what isn't notes: ${items.join(' · ')}${more}`;
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
  const highwayBox = doc.createElement('div');
  highwayBox.className = 'highway-box';
  const canvas = doc.createElement('canvas');
  canvas.className = 'highway';
  highwayBox.append(canvas);
  stage.append(highwayBox);
  root.append(panel, stage);

  const field = <T extends Element>(name: string) => panel.querySelector<T>(`[name="${name}"]`)!;
  const songSelect = field<HTMLSelectElement>('song');
  const modeSelect = field<HTMLSelectElement>('mode');
  const tempoInput = field<HTMLInputElement>('tempo');
  const tempoValue = field<HTMLOutputElement>('tempo-value');
  const textArea = field<HTMLTextAreaElement>('text');
  const status = panel.querySelector<HTMLElement>('.status')!;
  const error = panel.querySelector<HTMLElement>('.error')!;
  const skipped = panel.querySelector<HTMLElement>('.skipped')!;

  const songs: PracticeSong[] = [...config.songs];
  const nameInput = field<HTMLInputElement>('import-name');
  const keySelect = field<HTMLSelectElement>('import-key');
  const transposeSelect = field<HTMLSelectElement>('transpose');
  const retuneButton = field<HTMLButtonElement>('retune');
  const tuningText = panel.querySelector<HTMLElement>('.tuning')!;
  let session: PracticeSession | undefined;
  let fit = '';
  let halfSteps = config.tongues.map((_, i) => config.tuning?.[i] ?? 0);
  let tongues = retune(config.tongues, halfSteps);
  let retuning = false;

  const kalimba = mountKalimba(
    stage,
    tongues,
    {
      pluck(tongue) {
        config.sound.pluck(tongue);
        if (!session || session.finished) return;
        if (session.pluck(tongue) === 'miss') kalimba.markMiss(tongue);
        refresh();
      },
    },
    { onRetune: (tongue) => retuneTongue(tongue.index) },
  );
  const highway = config.highway(canvas, kalimba);

  const refresh = () => {
    kalimba.setTargets(session && !session.finished ? session.targets() : []);
    if (session) status.textContent = [fit, describeScore(session)].filter(Boolean).join(' — ');
  };

  const setTempo = (bpm: number) => {
    tempoInput.value = String(bpm);
    tempoValue.textContent = `${tempoInput.value} BPM`;
  };

  const selectedSong = () => songs[Number(songSelect.value)];

  // offered afresh whenever the text changes; the player's pick is used at Start
  const offerTranspositions = () => {
    let options: TransposeOption[] = [];
    try {
      options = transposeOptions(parseSong(textArea.value, { tongues }), tongues);
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
    }
    transposeSelect.innerHTML = options
      .map((o, i) => `<option value="${o.transpose}">${escapeHtml(describeOption(o, i === 0))}</option>`)
      .join('');
    transposeSelect.disabled = options.length === 0;
  };

  const showSong = () => {
    textArea.value = selectedSong()?.text ?? '';
    setTempo(tempoOf(textArea.value) ?? DEFAULT_TEMPO);
    offerTranspositions();
  };

  // pasted tabs rarely name a tempo: then the slider keeps its setting
  const takeTempoFromText = () => {
    const tempo = tempoOf(textArea.value);
    if (tempo !== undefined) setTempo(tempo);
  };

  const clearMessages = () => {
    error.textContent = '';
    skipped.textContent = '';
  };

  const importSong = () => {
    clearMessages();
    const title = nameInput.value.trim();
    if (!title) {
      error.textContent = 'Give the song a name to import it.';
      return;
    }
    if (songs.some((song) => song.title === title)) {
      error.textContent = `A song named "${title}" is already in the list: pick another name.`;
      return;
    }
    // the tuning goes into the text as a key line, so it stays visible and editable
    const text = keySelect.value && !keyOf(textArea.value) ? `key: ${keySelect.value}\n${textArea.value}` : textArea.value;
    try {
      const parsed = parseSong(text, { tongues });
      songs.push({ title, text });
      textArea.value = text;
      keySelect.value = '';
      offerTranspositions();
      songSelect.insertAdjacentHTML('beforeend', songOption(songs.at(-1)!, songs.length - 1));
      songSelect.value = String(songs.length - 1);
      nameInput.value = '';
      stop();
      takeTempoFromText();
      skipped.textContent = describeIgnored(parsed.ignored);
      const ignoredPart = parsed.ignored.length > 0 ? `, ${plural(parsed.ignored.length, 'part')} skipped` : '';
      status.textContent = `Added "${title}": ${plural(parsed.notes.length, 'note')}${ignoredPart}. Press Start to play it.`;
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
      error.textContent = e.message;
    }
  };

  const start = () => {
    clearMessages();
    try {
      const song = parseSong(textArea.value, { tongues });
      skipped.textContent = describeIgnored(song.ignored);
      const transpose = transposeSelect.value === '' ? undefined : Number(transposeSelect.value);
      const arrangement = arrange(song, tongues, { transpose });
      session = new PracticeSession(arrangement, modeSelect.value as PracticeMode);
      // a title line in the text wins: it may be a built-in edited into something else
      fit = describeFit(titleOf(textArea.value) ?? selectedSong()?.title ?? song.title, arrangement);
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

  const beatsPerMinute = () => Number(tempoInput.value);

  songSelect.addEventListener('change', showSong);
  textArea.addEventListener('input', () => {
    takeTempoFromText();
    offerTranspositions();
  });
  tempoInput.addEventListener('input', () => setTempo(beatsPerMinute()));
  field<HTMLButtonElement>('start').addEventListener('click', start);
  field<HTMLButtonElement>('stop').addEventListener('click', stop);
  field<HTMLButtonElement>('import').addEventListener('click', importSong);
  // a song fitted to the old tuning no longer fits: stop it and offer new transpositions
  const applyTuning = (next: number[]) => {
    halfSteps = next;
    tongues = retune(config.tongues, halfSteps);
    kalimba.setTongues(tongues);
    stop();
    offerTranspositions();
    tuningText.textContent = tuningLine();
    config.onTuningChange?.(halfSteps);
  };

  const retuneTongue = (index: number) => {
    applyTuning(halfSteps.map((h, i) => (i === index ? NEXT_TUNING[h] : h)));
    kalimba.pluck(tongues[index]); // hear the new pitch, like checking a tongue with a tuner
  };

  const tuningLine = () => (retuning ? `${describeTuning(tongues)} · tap a tongue: natural → # → b` : describeTuning(tongues));

  const toggleRetuning = () => {
    retuning = !retuning;
    retuneButton.setAttribute('aria-pressed', String(retuning));
    kalimba.setRetuning(retuning);
    tuningText.textContent = tuningLine();
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') importSong();
  });
  retuneButton.addEventListener('click', toggleRetuning);
  field<HTMLButtonElement>('retune-reset').addEventListener('click', () => applyTuning(halfSteps.map(() => 0)));
  tuningText.textContent = tuningLine();
  showSong();

  return {
    tick(seconds) {
      if (session && !session.finished) {
        const beats = (seconds * beatsPerMinute()) / 60;
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
