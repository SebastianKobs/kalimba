import { mountKalimba, type KalimbaHandle, type Plucker } from '../kalimba-view';
import { retune, type Tongue } from '../layout';
import { describeTuning } from '../tuning';
import { arrange, transposeOptions, type ArrangedNote, type Arrangement, type TransposeOption } from '../music/arrange';
import { describeShift } from '../music/interval';
import { DEFAULT_TEMPO, keyOf, meterOf, parseSong, SongTextError, tempoOf, titleOf, type IgnoredText, type Meter } from '../music/notation';
import { clicksBetween } from './metronome';
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
  /** plays the click; the first beat of a bar is accented */
  readonly metronome?: { click(accent: boolean): void };
}

export interface PracticeView {
  /** advance by wall-clock seconds; the caller drives it, e.g. from requestAnimationFrame */
  tick(seconds: number): void;
  unmount(): void;
}

const MODES: readonly [PracticeMode, string][] = [
  ['wait', 'Warten: Schritt für Schritt'],
  ['play-along', 'Mitspielen: im Takt'],
  ['listen', 'Anhören: die Kalimba spielt'],
];

const FORMAT_HELP =
  'Einen Kalimba-Tab einfügen oder selbst schreiben. Noten: Kalimba-Zahlen wie auf den Zungen (1 = C4 … 7 = B4) oder Buchstaben (C, F#, Bb, oder C5 mit Oktave; B ist hier das deutsche H). ' +
  "Eine Oktave höher: ' ′ * ° oder ein Punkt darüber, doppelt (oder ″ \") für zwei; eine Oktave tiefer: , oder ein Punkt darunter. " +
  'Zusammen gespielt: ( ) oder [ ], z. B. (1 3 5), (135), (5-7), [C E G]. Ein - nach einer Note hält sie einen Schlag länger: 2-4 ist 2 für zwei Schläge, dann 4. ' +
  'Rhythmus: ein Schlag pro Note im Tempo des Reglers; _ halbiert, . verlängert um die Hälfte, 0 ist eine Pause. ' +
  'Kopfzeilen: "title: …", "tempo: 90" (stellt den Regler), "meter: 3/4" (stellt den Takt, sonst 4/4) und "key: G" (jedes F wird F#, wie bei einer Kalimba mit erhöhter F-Zunge; auch D, F, Bb, Em …). Alles andere, etwa Liedtext, Links oder Überschriften, wird übersprungen und aufgelistet.';

const MAX_NAME_LENGTH = 80;
const METERS = ['2/4', '3/4', '4/4', '5/4', '6/8', '12/8'];
const DEFAULT_METER = '4/4';

// retuned kalimbas tabs are often written for; any other key can be typed as a "key:" line
const TAB_TUNINGS: readonly [string, string][] = [
  ['', 'wie notiert (C)'],
  ['G', 'F erhöht auf F# (G-Dur)'],
  ['D', 'F und C erhöht (D-Dur)'],
  ['F', 'B (H) erniedrigt auf Bb (F-Dur)'],
];

function songOption(song: PracticeSong, index: number): string {
  return `<option value="${index}">${escapeHtml(song.title)}</option>`;
}

function controlsMarkup(songs: readonly PracticeSong[]): string {
  const songOptions = songs.map(songOption).join('');
  const modeOptions = MODES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  return `
    <div class="panel controls" role="group" aria-label="Spielen">
      <label class="field song">Lied <select name="song">${songOptions}</select></label>
      <label class="field mode">Modus <select name="mode">${modeOptions}</select></label>
      <label class="field transpose">Transponieren <select name="transpose"></select></label>
      <div class="break"></div>
      <label class="field tempo">Tempo <span><input type="range" name="tempo" min="20" max="240" step="1" value="${DEFAULT_TEMPO}" />
        <output name="tempo-value">${DEFAULT_TEMPO} BPM</output></span></label>
      <label class="field meter">Takt <select name="meter">${METERS.map((m) => `<option value="${m}">${m}</option>`).join('')}</select></label>
      <label class="click-toggle"><input type="checkbox" name="click" /> Klick</label>
      <div class="actions">
        <button type="button" name="stop">Stopp</button>
        <button type="button" name="start">Start</button>
      </div>
    </div>
    <div class="panel song-text">
      <h2>Liedtext</h2>
      <textarea name="text" rows="6" spellcheck="false" aria-label="Liedtext"
        placeholder="Kalimba-Tab hier einfügen, benennen und Importieren drücken"></textarea>
      <pre class="tab-view" hidden aria-label="Liedtext beim Spielen"></pre>
      <div class="import-row">
        <label class="field">Name <input type="text" name="import-name" maxlength="${MAX_NAME_LENGTH}" placeholder="z. B. Sweden" /></label>
        <label class="field">Tab-Stimmung <select name="import-key">${TAB_TUNINGS.map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
        <button type="button" name="import">Importieren</button>
        <details class="help"><summary>Tab-Format</summary><p>${FORMAT_HELP}</p></details>
      </div>
    </div>
    <div class="status-row">
      <p class="status" role="status"></p>
      <div class="tuning-row">
        <span class="tuning"></span>
        <button type="button" name="retune" aria-pressed="false">Umstimmen</button>
        <button type="button" name="retune-reset">Stimmung zurücksetzen</button>
      </div>
    </div>
    <p class="skipped"></p>
    <p class="error" role="alert"></p>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

const noteCount = (count: number) => plural(count, 'Note', 'Noten');

function describeFit(name: string, a: Arrangement): string {
  const folded = a.notes.filter((n) => n.fit === 'octave').length;
  const parts = [name, describeShift(a.transpose)];
  if (folded > 0) parts.push(`${noteCount(folded)} um eine Oktave versetzt, damit sie passen`);
  if (a.skipped.length > 0) parts.push(`${noteCount(a.skipped.length)} ausgelassen: keine Zunge dafür`);
  return parts.join(' · ');
}

function describeOption(option: TransposeOption, best: boolean): string {
  const parts = [describeShift(option.transpose)];
  if (option.folded > 0) parts.push(`${noteCount(option.folded)} um eine Oktave versetzt`);
  if (option.skipped > 0) parts.push(`${noteCount(option.skipped)} ausgelassen`);
  if (best) parts.push('passt am besten');
  return parts.join(' · ');
}

// a tap in retune mode: natural → sharp → flat → natural
const NEXT_TUNING: Record<number, number> = { 0: 1, 1: -1, [-1]: 0 };
/** The song text as written, each played part in its own element so it can be highlighted. Keyed by start offset. */
function renderTabView(view: HTMLElement, text: string, notes: readonly ArrangedNote[]): Map<number, HTMLElement> {
  const ranges = [...new Map(notes.map((n) => [n.source.start, n.source])).values()].sort((a, b) => a.start - b.start);
  const marks = new Map<number, HTMLElement>();
  view.replaceChildren();
  let cursor = 0;
  for (const range of ranges) {
    view.append(text.slice(cursor, range.start));
    const mark = view.ownerDocument.createElement('span');
    mark.className = 'tab-note';
    mark.textContent = text.slice(range.start, range.end);
    view.append(mark);
    marks.set(range.start, mark);
    cursor = range.end;
  }
  view.append(text.slice(cursor));
  return marks;
}

const SKIPPED_SHOWN = 6;
const SKIPPED_TEXT_LENGTH = 40;

function describeIgnored(ignored: readonly IgnoredText[]): string {
  if (ignored.length === 0) return '';
  const shorten = (text: string) => (text.length > SKIPPED_TEXT_LENGTH ? `${text.slice(0, SKIPPED_TEXT_LENGTH - 1)}…` : text);
  const items = ignored
    .slice(0, SKIPPED_SHOWN)
    .map((i) => `Zeile ${i.line} „${shorten(i.text)}“${i.reason ? ` (${i.reason})` : ''}`);
  const more = ignored.length > SKIPPED_SHOWN ? ` und ${ignored.length - SKIPPED_SHOWN} weitere` : '';
  return `Übersprungen, weil keine Noten: ${items.join(' · ')}${more}`;
}

function describeScore(session: PracticeSession): string {
  if (session.mode === 'listen') return session.finished ? 'Fertig.' : '';
  const { hits, misses, total } = session.score;
  const prefix = session.finished ? 'Fertig: ' : '';
  return `${prefix}${hits} von ${total} gespielt · ${misses} Fehler`;
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
  const meterSelect = field<HTMLSelectElement>('meter');
  const clickBox = field<HTMLInputElement>('click');
  const textArea = field<HTMLTextAreaElement>('text');
  const status = panel.querySelector<HTMLElement>('.status')!;
  const error = panel.querySelector<HTMLElement>('.error')!;
  const skipped = panel.querySelector<HTMLElement>('.skipped')!;

  const songs: PracticeSong[] = [...config.songs];
  const nameInput = field<HTMLInputElement>('import-name');
  const keySelect = field<HTMLSelectElement>('import-key');
  const transposeSelect = field<HTMLSelectElement>('transpose');
  const retuneButton = field<HTMLButtonElement>('retune');
  const tabView = panel.querySelector<HTMLElement>('.tab-view')!;
  let tabMarks = new Map<number, HTMLElement>();
  let highlighted: HTMLElement[] = [];
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

  // while a song runs the text is shown read-only, so the part being played can be highlighted
  const showText = (editable: boolean) => {
    // same height as the box it replaces, so the kalimba doesn't jump
    if (!editable && !textArea.hidden && textArea.offsetHeight > 0) tabView.style.height = `${textArea.offsetHeight}px`;
    textArea.hidden = !editable;
    tabView.hidden = editable;
  };

  const highlight = (notes: readonly ArrangedNote[]) => {
    highlighted.forEach((mark) => mark.classList.remove('now'));
    highlighted = notes.map((n) => tabMarks.get(n.source.start)).filter((mark) => mark !== undefined);
    highlighted.forEach((mark) => mark.classList.add('now'));
    const first = highlighted[0];
    if (first) tabView.scrollTop = Math.max(0, first.offsetTop - tabView.clientHeight / 2);
  };

  const refresh = () => {
    const running = session !== undefined && !session.finished;
    kalimba.setTargets(running ? session!.targets() : []);
    if (session) status.textContent = [fit, describeScore(session)].filter(Boolean).join(' — ');
    showText(!running);
    if (running) highlight(session!.currentNotes());
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

  // a meter outside the list, such as 7/4, joins it
  const setMeter = (meter: Meter | string) => {
    const value = typeof meter === 'string' ? meter : `${meter.beatsPerBar}/${meter.beatUnit}`;
    if (![...meterSelect.options].some((o) => o.value === value)) meterSelect.add(new Option(value, value));
    meterSelect.value = value;
  };
  const beatsPerBar = () => Number(meterSelect.value.split('/')[0]);

  const showSong = () => {
    textArea.value = selectedSong()?.text ?? '';
    setTempo(tempoOf(textArea.value) ?? DEFAULT_TEMPO);
    setMeter(meterOf(textArea.value) ?? DEFAULT_METER);
    offerTranspositions();
  };

  // pasted tabs rarely name a tempo or meter: then the controls keep their setting
  const takeHeadersFromText = () => {
    const tempo = tempoOf(textArea.value);
    if (tempo !== undefined) setTempo(tempo);
    const meter = meterOf(textArea.value);
    if (meter) setMeter(meter);
  };

  const clearMessages = () => {
    error.textContent = '';
    skipped.textContent = '';
  };

  const importSong = () => {
    clearMessages();
    const title = nameInput.value.trim();
    if (!title) {
      error.textContent = 'Gib dem Lied einen Namen, um es zu importieren.';
      return;
    }
    if (songs.some((song) => song.title === title)) {
      error.textContent = `Ein Lied namens „${title}“ steht schon in der Liste: wähle einen anderen Namen.`;
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
      takeHeadersFromText();
      skipped.textContent = describeIgnored(parsed.ignored);
      const ignoredPart = parsed.ignored.length > 0 ? `, ${plural(parsed.ignored.length, 'Teil', 'Teile')} übersprungen` : '';
      status.textContent = `„${title}“ hinzugefügt: ${noteCount(parsed.notes.length)}${ignoredPart}. Start drücken zum Spielen.`;
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
      session = new PracticeSession(arrangement, modeSelect.value as PracticeMode, { beatsPerBar: beatsPerBar() });
      tabMarks = renderTabView(tabView, textArea.value, arrangement.notes);
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
    showText(true);
  };

  const beatsPerMinute = () => Number(tempoInput.value);

  songSelect.addEventListener('change', showSong);
  textArea.addEventListener('input', () => {
    takeHeadersFromText();
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

  const tuningLine = () => (retuning ? `${describeTuning(tongues)} · Zunge antippen: natürlich → # → b` : describeTuning(tongues));

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
        const from = session.beat;
        session.advance(beats).forEach((note) => kalimba.pluck(note.tongue));
        if (clickBox.checked) clicksBetween(from, session.beat, session.beatsPerBar).forEach((c) => config.metronome?.click(c.accent));
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
