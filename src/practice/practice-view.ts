import { mountKalimba, type KalimbaHandle, type Plucker } from '../kalimba-view';
import { retune, type Tongue } from '../layout';
import { arrange, transposeOptions, type ArrangedNote, type Arrangement, type TransposeOption } from '../music/arrange';
import { describeShift } from '../music/interval';
import { homeNoteOf, tuningFor, type TuningOption } from '../music/retune-for';
import { DEFAULT_TEMPO, keyOf, meterOf, parseSong, SongTextError, tempoOf, titleOf, type IgnoredText, type Meter, type SourceRange } from '../music/notation';
import { clicksBetween } from './metronome';
import { PracticeSession, type PracticeMode } from './session';
import type { SongStart } from './song-player';

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
  /** listening and playing along: the song, its time and its click on the clock, ahead of time; none: the frames keep time */
  readonly songPlayer?: SongClock;
}

/** Plays a song on the clock (song-player.ts): its notes ahead of time, the click on its beats, where it is in its beats. */
export interface SongClock {
  play(start: SongStart): void;
  stop(): void;
  /** none when no song plays */
  beat(): number | undefined;
  setTempo(bpm: number): void;
  setClick(on: boolean): void;
}

export interface PracticeView {
  /** advance by wall-clock seconds; the caller drives it, e.g. from requestAnimationFrame */
  tick(seconds: number): void;
  unmount(): void;
}

// the first is chosen at the start: hear the song first, then play along, or step by step
const MODES: readonly [PracticeMode, string][] = [
  ['listen', 'Anhören: die Kalimba spielt'],
  ['play-along', 'Mitspielen: im Takt'],
  ['wait', 'Warten: Schritt für Schritt'],
];

// the tab format, a section each: an example as written, and what it means
const FORMAT_HELP: readonly { title: string; lines: readonly [string, string][] }[] = [
  { title: 'Noten', lines: [
    ['1 … 7', 'Kalimba-Zahlen wie auf den Zungen: 1 = C4 … 7 = B4'],
    ['C  F#  Bb', 'Buchstaben, mit Oktave wie C5; B ist das deutsche H'],
  ] },
  { title: 'Oktaven', lines: [
    ["1'", 'eine höher, auch ′ * ° oder ein Punkt darüber'],
    ["1''", 'zwei höher, auch ″ oder "'],
    ['1,', 'eine tiefer, auch ein Punkt darunter'],
  ] },
  { title: 'Zusammen', lines: [
    ['(1 3 5)', 'zusammen gespielt, auch (135) oder [C E G]'],
  ] },
  { title: 'Rhythmus', lines: [
    ['1', 'ein Schlag, im Tempo des Reglers'],
    ['2-', 'einen Schlag länger: 2-4 ist 2 für zwei Schläge, dann 4'],
    ['1_', 'ein halber Schlag'],
    ['1.', 'anderthalb Schläge'],
    ['0', 'eine Pause'],
  ] },
  { title: 'Kopfzeilen', lines: [
    ['title: …', 'der Name des Lieds'],
    ['tempo: 90', 'stellt den Tempo-Regler'],
    ['meter: 3/4', 'stellt den Takt, sonst 4/4'],
    ['key: G', 'jedes F wird F#, wie mit erhöhter F-Zunge; auch D, F, Bb, Em …'],
  ] },
];

// the song text edited, and imported, in an overlay: the page keeps its room for the kalimba
function songEditorMarkup(): string {
  return `<dialog class="song-editor overlay" aria-labelledby="song-editor-title">
      <header>
        <h2 id="song-editor-title">Liedtext</h2>
        <button type="button" name="song-editor-close" aria-label="Schließen">×</button>
      </header>
      <div class="song-editor-body">
        <textarea name="text" rows="12" spellcheck="false" aria-label="Liedtext"
          placeholder="Kalimba-Tab hier einfügen, benennen und Importieren drücken"></textarea>
        <div class="import-row">
          <label class="field">Name <input type="text" name="import-name" maxlength="${MAX_NAME_LENGTH}" placeholder="z. B. Sweden" /></label>
          <label class="field">Tab-Stimmung <select name="import-key">${TAB_TUNINGS.map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
          <button type="button" name="import">Importieren</button>
          <button type="button" name="format-help" class="help-link" aria-haspopup="dialog">Tab-Format ?</button>
        </div>
        <p class="error editor-error" role="alert"></p>
      </div>
    </dialog>`;
}

function formatHelpMarkup(): string {
  const sections = FORMAT_HELP.map(({ title, lines }) => {
    const rows = lines.map(([example, meaning]) => `<dt><code>${escapeHtml(example)}</code></dt><dd>${escapeHtml(meaning)}</dd>`).join('');
    return `<section><h3>${title}</h3><dl>${rows}</dl></section>`;
  }).join('');
  return `<dialog class="format-help overlay" aria-labelledby="format-help-title">
      <header>
        <h2 id="format-help-title">Tab-Format</h2>
        <button type="button" name="format-help-close" aria-label="Schließen">×</button>
      </header>
      <p>Einen Kalimba-Tab einfügen oder selbst schreiben.</p>
      <div class="format-sections">${sections}</div>
      <p>Alles andere, etwa Liedtext, Links oder Überschriften, wird übersprungen und aufgelistet.</p>
    </dialog>`;
}

// the transport as symbols, drawn in the text's colour; each named for a screen reader where it's used
const ICONS = {
  start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M8 5.5v13l10.5-6.5z" /></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="fill" x="6.5" y="6.5" width="11" height="11" rx="1.5" /></svg>',
  // a metronome: its body, the pendulum leaning
  click: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3.5h6l3.5 17h-13z M12 16.5l4-9.5 M8 16.5h8" /></svg>',
  // round and back again
  loop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3.5l3 3-3 3 M20 6.5H8a4 4 0 0 0-4 4v1 M7 20.5l-3-3 3-3 M4 17.5h12a4 4 0 0 0 4-4v-1" /></svg>',
};

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
      <label class="field tempo">Tempo <span><input type="range" name="tempo" min="20" max="240" step="1" value="${DEFAULT_TEMPO}" />
        <output name="tempo-value">${DEFAULT_TEMPO} BPM</output></span></label>
      <label class="field meter">Takt <select name="meter">${METERS.map((m) => `<option value="${m}">${m}</option>`).join('')}</select></label>
      <div class="actions">
        <label class="icon-toggle" title="Klick"><input type="checkbox" name="click" />${ICONS.click}<span class="visually-hidden">Klick</span></label>
        <label class="icon-toggle" title="Schleife"><input type="checkbox" name="loop" checked />${ICONS.loop}<span class="visually-hidden">Schleife</span></label>
        <button type="button" name="stop" aria-label="Stopp" title="Stopp">${ICONS.stop}</button>
        <button type="button" name="start" aria-label="Start" title="Start">${ICONS.start}</button>
      </div>
    </div>
    <div class="song-strip">
      <pre class="tab-view" aria-label="Liedtext" title="Liedtext bearbeiten"></pre>
      <button type="button" name="edit-text" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4" /></svg><span class="label">Liedtext bearbeiten</span></button>
    </div>
    ${songEditorMarkup()}
    ${formatHelpMarkup()}
    <p class="skipped"></p>
    <p class="error" role="alert"></p>`;
}

/** An overlay shut by its ×, Escape (the browser's) or a click beside it. */
function wireOverlay(overlay: HTMLDialogElement, closeName: string): void {
  overlay.querySelector(`[name="${closeName}"]`)!.addEventListener('click', () => overlay.close());
  overlay.addEventListener('click', (e) => e.target === overlay && overlay.close()); // the backdrop: a click on the dialog itself, not its content
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

// the transpose menu's entries for retuning the kalimba instead, and for its standard tuning again
const RETUNE = 'retune';
const STANDARD = 'standard';

function describeRetuning(option: TuningOption): string {
  return `Umstimmen: ${option.changes.map((c) => `${c.letter} → ${c.to}`).join(', ')} · ${describeShift(option.transpose)}`;
}

function describeOption(option: TransposeOption, best: boolean): string {
  const parts = [describeShift(option.transpose)];
  if (option.folded > 0) parts.push(`${noteCount(option.folded)} um eine Oktave versetzt`);
  if (option.skipped > 0) parts.push(`${noteCount(option.skipped)} ausgelassen`);
  if (best) parts.push('passt am besten');
  return parts.join(' · ');
}

// a tap on a tongue's end: natural → sharp → flat → natural
const NEXT_TUNING: Record<number, number> = { 0: 1, 1: -1, [-1]: 0 };
/** The song text as written, each played part in its own element so it can be highlighted. Keyed by start offset. */
function renderTabView(view: HTMLElement, text: string, notes: readonly { readonly source: SourceRange }[]): Map<number, HTMLElement> {
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
  // what's going on, over the falling notes' empty top: no row of its own
  const status = doc.createElement('p');
  status.className = 'status';
  status.setAttribute('role', 'status');
  highwayBox.append(canvas, status);
  stage.append(highwayBox);
  root.append(panel, stage);

  const field = <T extends Element>(name: string) => panel.querySelector<T>(`[name="${name}"]`)!;
  const songSelect = field<HTMLSelectElement>('song');
  const modeSelect = field<HTMLSelectElement>('mode');
  const tempoInput = field<HTMLInputElement>('tempo');
  const tempoValue = field<HTMLOutputElement>('tempo-value');
  const meterSelect = field<HTMLSelectElement>('meter');
  const clickBox = field<HTMLInputElement>('click');
  const loopBox = field<HTMLInputElement>('loop');
  // while a song runs, stop is the button lit, not start
  const controls = panel.querySelector<HTMLElement>('.controls')!;
  const textArea = field<HTMLTextAreaElement>('text');
  const error = panel.querySelector<HTMLElement>('.error:not(.editor-error)')!;
  const editorError = panel.querySelector<HTMLElement>('.editor-error')!;
  const editor = panel.querySelector<HTMLDialogElement>('dialog.song-editor')!;
  const skipped = panel.querySelector<HTMLElement>('.skipped')!;

  const songs: PracticeSong[] = [...config.songs];
  const nameInput = field<HTMLInputElement>('import-name');
  const keySelect = field<HTMLSelectElement>('import-key');
  const transposeSelect = field<HTMLSelectElement>('transpose');
  let retuning: TuningOption | undefined; // what the transpose menu offers instead of moving the song
  let retuningHome: number | undefined; // and where that song comes home
  const tabView = panel.querySelector<HTMLElement>('.tab-view')!;
  let tabMarks = new Map<number, HTMLElement>();
  let highlighted: HTMLElement[] = [];
  let session: PracticeSession | undefined;
  let fit = '';
  let halfSteps = config.tongues.map((_, i) => config.tuning?.[i] ?? 0);
  let tongues = retune(config.tongues, halfSteps);

  const kalimba = mountKalimba(
    stage,
    tongues,
    {
      pluck(tongue) {
        config.sound.pluck(tongue);
        if (!session || session.finished) return;
        if (session.pluck(tongue) === 'miss') kalimba.markMiss(tongue);
        if (session.finished) loopOrEnd(session); // waiting or playing along, the last note played ends it
        refresh();
      },
    },
    { onRetune: (tongue) => retuneTongue(tongue.index), onResetTuning: () => applyTuning(halfSteps.map(() => 0)) },
  );
  const highway = config.highway(canvas, kalimba);

  // the strip shows the song as written, from its first notes on; while it runs, the part being played is highlighted
  const showText = () => {
    highlighted = [];
    const notes = notesIn(textArea.value);
    tabMarks = renderTabView(tabView, textArea.value, notes);
    showLineOf(tabMarks.get(notes[0]?.source.start ?? -1));
  };

  const notesIn = (text: string) => {
    try {
      return parseSong(text, { tongues }).notes;
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
      return [];
    }
  };

  // its line on top, the next under it: the strip shows two
  const showLineOf = (mark: HTMLElement | undefined) => {
    tabView.scrollTop = mark ? Math.max(0, mark.offsetTop - parseFloat(getComputedStyle(tabView).paddingTop || '0')) : 0;
  };

  const highlight = (notes: readonly ArrangedNote[]) => {
    highlighted.forEach((mark) => mark.classList.remove('now'));
    highlighted = notes.map((n) => tabMarks.get(n.source.start)).filter((mark) => mark !== undefined);
    highlighted.forEach((mark) => mark.classList.add('now'));
    if (highlighted[0]) showLineOf(highlighted[0]);
  };

  const refresh = () => {
    const running = session !== undefined && !session.finished;
    controls.classList.toggle('playing', running);
    kalimba.setTargets(running ? session!.targets() : []);
    if (session) status.textContent = [fit, describeScore(session)].filter(Boolean).join(' — ');
    highlight(running ? session!.currentNotes() : []);
  };

  const setTempo = (bpm: number) => {
    tempoInput.value = String(bpm);
    tempoValue.textContent = `${tempoInput.value} BPM`;
  };

  const selectedSong = () => songs[Number(songSelect.value)];

  // offered afresh whenever the text changes; the player's pick is used at Start
  // the song moved onto the tongues; or, where that plays more of it in its own key, the tongues retuned to the song
  const offerTranspositions = () => {
    let options: TransposeOption[] = [];
    retuning = undefined;
    try {
      const song = parseSong(textArea.value, { tongues });
      options = transposeOptions(song, tongues);
      retuning = tuningFor(song, tongues);
      retuningHome = homeNoteOf(song, keyOf(textArea.value));
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
    }
    const retuneOption = retuning ? `<option value="${RETUNE}">${escapeHtml(describeRetuning(retuning))}</option>` : '';
    // retuned, the way back is in the same list: not everyone finds the screw
    const standardOption = halfSteps.some((h) => h !== 0) ? `<option value="${STANDARD}">Zurück zu Standard-C</option>` : '';
    transposeSelect.innerHTML =
      options.map((o, i) => `<option value="${o.transpose}">${escapeHtml(describeOption(o, i === 0))}</option>`).join('') +
      retuneOption +
      standardOption;
    transposeSelect.disabled = options.length === 0;
  };

  // chosen, the retuning is made at once: the tongues as it says, the song then as written
  transposeSelect.addEventListener('change', () => {
    if (transposeSelect.value === RETUNE && retuning) applyTuning([...retuning.halfSteps], retuningHome);
    if (transposeSelect.value === STANDARD) applyTuning(halfSteps.map(() => 0));
  });

  // a meter outside the list, such as 7/4, joins it
  const setMeter = (meter: Meter | string) => {
    const value = typeof meter === 'string' ? meter : `${meter.beatsPerBar}/${meter.beatUnit}`;
    if (![...meterSelect.options].some((o) => o.value === value)) meterSelect.add(new Option(value, value));
    meterSelect.value = value;
  };
  const meter = (): Meter => {
    const [beatsPerBar, beatUnit] = meterSelect.value.split('/').map(Number);
    return { beatsPerBar: beatsPerBar!, beatUnit: beatUnit! };
  };
  const beatsPerBar = () => meter().beatsPerBar;

  const showSong = () => {
    textArea.value = selectedSong()?.text ?? '';
    showText();
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
    editorError.textContent = '';
    skipped.textContent = '';
  };

  const importSong = () => {
    clearMessages();
    const title = nameInput.value.trim();
    if (!title) {
      editorError.textContent = 'Gib dem Lied einen Namen, um es zu importieren.';
      return;
    }
    if (songs.some((song) => song.title === title)) {
      editorError.textContent = `Ein Lied namens „${title}“ steht schon in der Liste: wähle einen anderen Namen.`;
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
      showText();
      takeHeadersFromText();
      skipped.textContent = describeIgnored(parsed.ignored);
      const ignoredPart = parsed.ignored.length > 0 ? `, ${plural(parsed.ignored.length, 'Teil', 'Teile')} übersprungen` : '';
      status.textContent = `„${title}“ hinzugefügt: ${noteCount(parsed.notes.length)}${ignoredPart}. Start drücken zum Spielen.`;
      editor.close(); // in the list and chosen: ready to play
    } catch (e) {
      if (!(e instanceof SongTextError)) throw e;
      editorError.textContent = e.message;
    }
  };

  const start = () => {
    clearMessages();
    try {
      const song = parseSong(textArea.value, { tongues });
      skipped.textContent = describeIgnored(song.ignored);
      const transpose = transposeSelect.value === '' ? undefined : Number(transposeSelect.value);
      const arrangement = arrange(song, tongues, { transpose });
      // a bar counted in only with the click to count it; without, the song starts on the next beat
      const leadInBeats = clickBox.checked ? beatsPerBar() : 0;
      session = new PracticeSession(arrangement, modeSelect.value as PracticeMode, { beatsPerBar: beatsPerBar(), leadInBeats });
      playOnClock(session, leadInBeats);
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

  // listening or playing along, the song player keeps the time and the click, and plays the notes when listening
  const playOnClock = (running: PracticeSession, leadInBeats: number) => {
    config.songPlayer?.stop();
    if (running.mode === 'wait') return;
    config.songPlayer?.play({
      notes: running.mode === 'listen' ? running.arrangement.notes : [],
      bpm: beatsPerMinute(),
      meter: meter(),
      leadInBeats,
      click: clickBox.checked,
    });
  };

  const loopOrEnd = (done: PracticeSession) => {
    if (loopBox.checked) playAgain(done);
    else config.songPlayer?.stop();
  };

  // the song again from the next bar line, so the loop keeps the beat; waiting, at once
  const playAgain = (done: PracticeSession) => {
    const toBarLine = done.mode === 'wait' ? 0 : Math.ceil(done.beat / done.beatsPerBar - 1e-9) * done.beatsPerBar - done.beat;
    session = new PracticeSession(done.arrangement, done.mode, { beatsPerBar: done.beatsPerBar, leadInBeats: toBarLine });
    playOnClock(session, toBarLine);
    highlight([]);
  };

  const stop = () => {
    config.songPlayer?.stop();
    session = undefined;
    kalimba.setTargets([]);
    highlight([]);
    controls.classList.remove('playing');
  };

  const beatsPerMinute = () => Number(tempoInput.value);

  songSelect.addEventListener('change', showSong);
  textArea.addEventListener('input', () => {
    showText();
    takeHeadersFromText();
    offerTranspositions();
  });
  tempoInput.addEventListener('input', () => {
    setTempo(beatsPerMinute());
    config.songPlayer?.setTempo(beatsPerMinute());
  });
  clickBox.addEventListener('change', () => config.songPlayer?.setClick(clickBox.checked));
  field<HTMLButtonElement>('start').addEventListener('click', start);
  field<HTMLButtonElement>('stop').addEventListener('click', stop);
  field<HTMLButtonElement>('import').addEventListener('click', importSong);
  // what plays is what the text says: editing it stops the song
  const editText = () => {
    if (session) stop();
    editor.showModal();
  };
  field<HTMLButtonElement>('edit-text').addEventListener('click', editText);
  tabView.addEventListener('click', editText);
  wireOverlay(editor, 'song-editor-close');
  const formatHelp = panel.querySelector<HTMLDialogElement>('dialog.format-help')!;
  field<HTMLButtonElement>('format-help').addEventListener('click', () => formatHelp.showModal());
  wireOverlay(formatHelp, 'format-help-close');
  // a song fitted to the old tuning no longer fits: stop it and offer new transpositions
  // home: where the song it's retuned for comes home, to name the scale; by hand, none
  const applyTuning = (next: number[], home?: number) => {
    halfSteps = next;
    tongues = retune(config.tongues, halfSteps);
    kalimba.setTongues(tongues, home);
    stop();
    offerTranspositions();
    config.onTuningChange?.(halfSteps);
  };

  const retuneTongue = (index: number) => {
    applyTuning(halfSteps.map((h, i) => (i === index ? NEXT_TUNING[h] : h)));
    kalimba.pluck(tongues[index]); // hear the new pitch, like checking a tongue with a tuner
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') importSong();
  });
  showSong();

  return {
    tick(seconds) {
      if (session && !session.finished) {
        const clocked = session.mode === 'wait' ? undefined : config.songPlayer?.beat();
        if (clocked !== undefined) {
          session.advance(Math.max(0, clocked - session.beat)); // the song player plays the notes and the click
        } else {
          const beats = (seconds * beatsPerMinute()) / 60;
          const from = session.beat;
          session.advance(beats).forEach((note) => kalimba.pluck(note.tongue));
          if (clickBox.checked) clicksBetween(from, session.beat, session.beatsPerBar).forEach((c) => config.metronome?.click(c.accent));
        }
        if (session.finished) loopOrEnd(session);
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
