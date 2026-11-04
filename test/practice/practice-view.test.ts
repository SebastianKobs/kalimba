// @vitest-environment jsdom
import { KALIMBA_21, type Tongue } from '../../src/layout';
import { mountPractice, type SongClock } from '../../src/practice/practice-view';
import type { SongStart } from '../../src/practice/song-player';

const SONGS = [
  { title: 'Built-in one', text: 'title: Built-in one\ntempo: 60\nC4 E4' },
  { title: 'Built-in two', text: 'title: Built-in two\nG4' },
];

// a song player in place of the clock and the clip player: what it's asked, and the beat it says the song is at
function fakeSongPlayer() {
  const asked = { played: [] as SongStart[], stops: 0, tempos: [] as number[], clicks: [] as boolean[] };
  let at: number | undefined;
  const player: SongClock = {
    play: (start) => {
      asked.played.push(start);
      at = -start.leadInBeats;
    },
    stop: () => {
      asked.stops++;
      at = undefined;
    },
    beat: () => at,
    setTempo: (bpm) => asked.tempos.push(bpm),
    setClick: (on) => asked.clicks.push(on),
  };
  return { player, asked, moveTo: (beat: number) => (at = beat) };
}

function setup(tuning?: number[], songPlayer?: SongClock) {
  const root = document.createElement('div');
  document.body.append(root);
  const sounded: string[] = [];
  const savedTunings: number[][] = [];
  const clicks: boolean[] = [];
  const sound = { pluck: (t: Tongue) => sounded.push(t.note) };
  const view = mountPractice(root, {
    tongues: KALIMBA_21,
    sound,
    songs: SONGS,
    highway: () => ({ draw() {} }),
    tuning,
    onTuningChange: (halfSteps) => savedTunings.push([...halfSteps]),
    metronome: { click: (accent: boolean) => clicks.push(accent) },
    songPlayer,
  });
  const q = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const set = (name: string, value: string) => {
    const field = q<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const tongue = (note: string) => q<HTMLElement>(`[data-note="${note}"]`);
  const targets = () => [...root.querySelectorAll<HTMLElement>('.tongue.target')].map((t) => t.dataset.note);
  const press = (note: string) => tongue(note).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  const start = () => q<HTMLButtonElement>('[name="start"]').click();
  const check = (name: string, on: boolean) => {
    const box = q<HTMLInputElement>(`[name="${name}"]`);
    box.checked = on;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };
  return { root, view, sounded, savedTunings, clicks, q, set, check, tongue, targets, press, start };
}

// jsdom has no modal dialogs: open and close them as the browser does, as far as the view needs
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };
});

afterEach(() => document.body.replaceChildren());

describe('mountPractice', () => {
  it('starts with the kalimba playing the song: listening is the mode chosen', () => {
    const { q } = setup();
    expect(q<HTMLSelectElement>('[name="mode"]').value).toBe('listen');
  });

  it('speaks German', () => {
    const { q } = setup();
    const texts = (selector: string) => [...q(`${selector}`).querySelectorAll('option')].map((o) => o.text);
    expect(texts('[name="mode"]')).toEqual(['Anhören: die Kalimba spielt', 'Mitspielen: im Takt', 'Warten: Schritt für Schritt']);
    expect(['import', 'edit-text'].map((name) => q(`[name="${name}"]`).textContent)).toEqual(['Importieren', 'Liedtext bearbeiten']);
    // symbols, named for a screen reader and as a tooltip
    expect(['start', 'stop'].map((name) => [q(`[name="${name}"]`).getAttribute('aria-label'), q<HTMLElement>(`[name="${name}"]`).title])).toEqual([
      ['Start', 'Start'], ['Stopp', 'Stopp'],
    ]);
    expect(['click', 'loop'].map((name) => [q(`[name="${name}"]`).closest('label')!.textContent!.trim(), q(`[name="${name}"]`).closest('label')!.title])).toEqual([
      ['Klick', 'Klick'], ['Schleife', 'Schleife'],
    ]);
    expect(['start', 'stop', 'click', 'loop'].every((name) => q(`[name="${name}"]`).closest('label, button')!.querySelector('svg'))).toBe(true);
    expect(q('.tuning-reset').getAttribute('aria-label')).toBe('Stimmung zurücksetzen');
    expect(q('.tuning').textContent).toBe('Stimmung: Standard-C');
  });

  it('offers the built-in songs and shows the chosen one as text', () => {
    const { q, set } = setup();
    const options = [...q<HTMLSelectElement>('[name="song"]').options].map((o) => o.text);
    expect(options).toEqual(['Built-in one', 'Built-in two']);
    expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe(SONGS[0].text);
    set('song', '1');
    expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe(SONGS[1].text);
  });

  it('in wait mode, lights the tongue to play and moves on once it is played', () => {
    const { set, start, targets, press, view, sounded } = setup();
    set('mode', 'wait');
    start();
    view.tick(10);
    expect(targets()).toEqual(['C4']);
    press('C4');
    expect(sounded).toEqual(['C4']);
    expect(targets()).toEqual(['E4']);
  });

  it('marks a wrong pluck', () => {
    const { set, start, press, tongue, view } = setup();
    set('mode', 'wait');
    start();
    view.tick(10);
    press('G4');
    expect(tongue('G4').classList.contains('miss')).toBe(true);
  });

  it('says how a pasted song was fitted onto the kalimba', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    set('text', 'title: Mine\nD4 F#4 C#5');
    start();
    view.tick(10);
    expect(q('[role="status"]').textContent).toMatch(/Mine · einen Ganzton tiefer \(2 Halbtöne\)/);
    expect(targets()).toEqual(['C4']);
  });

  it('sets the tempo slider from the chosen song, 90 BPM when it names none', () => {
    const { set, q } = setup();
    expect(q<HTMLInputElement>('[name="tempo"]').value).toBe('60');
    expect(q('[name="tempo-value"]').textContent).toBe('60 BPM');
    set('song', '1');
    expect(q<HTMLInputElement>('[name="tempo"]').value).toBe('90');
  });

  it('takes the tempo from pasted text that names one, and keeps the slider otherwise', () => {
    const { set, q } = setup();
    set('tempo', '75');
    set('text', 'C D E');
    expect(q<HTMLInputElement>('[name="tempo"]').value).toBe('75');
    set('text', 'tempo: 120\nC D E');
    expect(q<HTMLInputElement>('[name="tempo"]').value).toBe('120');
  });

  it('in listen mode, plays a pasted tab without tempo at the slider\'s tempo', () => {
    const { set, start, view, sounded } = setup();
    set('mode', 'listen');
    set('text', 'C4 E4');
    set('tempo', '30');
    start();
    // 30 BPM: half a beat per second; no click, no lead-in
    view.tick(1);
    expect(sounded).toEqual(['C4']);
    view.tick(2);
    expect(sounded).toEqual(['C4', 'E4']);
  });

  it('plays what it can read and lists what it skipped', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    set('text', 'Source: some page\nC4 H4 E4');
    start();
    view.tick(10);
    expect(targets()).toEqual(['C4']);
    const skipped = q('.skipped').textContent;
    expect(skipped).toMatch(/Zeile 1 „Source: some page“/);
    expect(skipped).toMatch(/Zeile 2 „H4“/);
  });

  it('does not start when nothing in the text is a note, and says so', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    set('text', 'just some words');
    start();
    view.tick(10);
    expect(q('[role="alert"]:not(dialog *)').textContent).toMatch(/keine Noten/i); // on the page, by Start
    expect(targets()).toEqual([]);
  });

  it('clears the targets when stopped', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    start();
    view.tick(10);
    q<HTMLButtonElement>('[name="stop"]').click();
    expect(targets()).toEqual([]);
  });

  describe('the tab format’s help', () => {
    it('is an overlay of its own, opened by a button by the import, shut by its close button', () => {
      const { q } = setup();
      const help = q<HTMLDialogElement>('dialog.format-help');
      expect(q('.import-row [name="format-help"]').textContent).toContain('Tab-Format');
      expect(q('details.help')).toBeNull(); // no longer folded into the panel
      expect(help.querySelector('[name="format-help-close"]')).not.toBeNull();
    });

    it('is short sections of examples with their meaning, not a wall of text', () => {
      const { q } = setup();
      const help = q('dialog.format-help');
      const headings = [...help.querySelectorAll('h3')].map((h) => h.textContent);
      expect(headings).toEqual(['Noten', 'Oktaven', 'Zusammen', 'Rhythmus', 'Kopfzeilen']);
      const examples = [...help.querySelectorAll('dt code')].map((c) => c.textContent);
      expect(examples).toEqual(expect.arrayContaining(['1 … 7', "1'", '(1 3 5)', '2-', 'tempo: 90', 'key: G']));
      // every line of it short enough to read at a glance
      [...help.querySelectorAll('dd, p')].forEach((line) => expect(line.textContent!.length).toBeLessThanOrEqual(90));
    });
  });

  describe('meter and click', () => {
    const meter = (q: ReturnType<typeof setup>['q']) => q<HTMLSelectElement>('[name="meter"]').value;

    it('takes the meter from the song or pasted text that names one, 4/4 otherwise', () => {
      const { q, set } = setup();
      expect(meter(q)).toBe('4/4');
      set('text', 'meter: 3/4\nC4');
      expect(meter(q)).toBe('3/4');
      set('text', 'C D'); // a tab without a meter keeps the choice
      expect(meter(q)).toBe('3/4');
      set('song', '1');
      expect(meter(q)).toBe('4/4');
      set('text', 'meter: 7/4\nC4');
      expect(meter(q)).toBe('7/4');
    });

    it('counts in one bar of the chosen meter, with the click on', () => {
      const { set, start, check, view, sounded } = setup();
      set('mode', 'listen');
      set('text', 'C4');
      set('meter', '3/4');
      set('tempo', '60');
      check('click', true);
      start();
      view.tick(2.9);
      expect(sounded).toEqual([]);
      view.tick(0.2);
      expect(sounded).toEqual(['C4']);
    });

    it('clicks every beat while Klick is on, the first of each bar accented', () => {
      const { set, check, start, view, clicks } = setup();
      set('mode', 'listen');
      set('text', 'C4 C4 C4 C4');
      set('meter', '3/4');
      set('tempo', '60');
      check('click', true);
      start();
      for (let i = 0; i < 4; i++) view.tick(i === 0 ? 0.01 : 1);
      expect(clicks).toEqual([true, false, false, true]);
    });

    it('stays silent with Klick off', () => {
      const { set, start, view, clicks } = setup();
      set('mode', 'listen');
      set('text', 'C4');
      start();
      view.tick(5);
      expect(clicks).toEqual([]);
    });
  });

  it('marks the controls as playing while a song runs, so start is lit then and stop while stopped', () => {
    const { q, set, start, view } = setup();
    const playing = () => q('.controls').classList.contains('playing');
    set('mode', 'wait');
    set('text', 'C4');
    expect(playing()).toBe(false);
    start();
    view.tick(0.1);
    expect(playing()).toBe(true);
    q<HTMLButtonElement>('[name="stop"]').click();
    expect(playing()).toBe(false);
  });

  describe('the loop', () => {
    it('is a toggle beside the click, labelled Schleife, on to start', () => {
      const { q } = setup();
      const loop = q<HTMLInputElement>('[name="loop"]');
      expect(loop.checked).toBe(true);
      expect(loop.closest('label')!.textContent!.trim()).toBe('Schleife');
    });

    it('waiting, starts the song again once its last note is played', () => {
      const { set, start, check, view, press, targets } = setup();
      set('mode', 'wait');
      set('text', 'C4 E4');
      check('loop', true);
      start();
      view.tick(0.1);
      press('C4');
      press('E4');
      view.tick(0.1);
      expect(targets()).toEqual(['C4']);
    });

    it('waiting, without the click, shows the first note at once: no bar to wait through', () => {
      const { set, start, view, targets } = setup();
      set('mode', 'wait');
      set('text', 'C4');
      start();
      view.tick(0.01);
      expect(targets()).toEqual(['C4']);
    });
  });

  describe('the song text', () => {
    it('opens for editing from its strip: a button at its end, or a click anywhere on it', () => {
      const { q } = setup();
      expect(q('.song-strip [name="edit-text"]')).not.toBeNull();
      q<HTMLElement>('.tab-view').click();
      expect(q<HTMLDialogElement>('dialog.song-editor').open).toBe(true);
    });

    it('leaves no row of its own under the controls: the status sits over the falling notes', () => {
      const { q } = setup();
      expect(q('.status-row')).toBeNull();
      expect(q('.highway-box [role="status"]')).not.toBeNull();
    });

    const now = (q: ReturnType<typeof setup>['q']) => [...q('.tab-view').querySelectorAll('.now')].map((el) => el.textContent);
    const editorOpen = (q: ReturnType<typeof setup>['q']) => q<HTMLDialogElement>('dialog.song-editor').open;

    it('is edited in an overlay of its own, with the import and the format’s help, opened from a button', () => {
      const { q } = setup();
      const editor = q('dialog.song-editor');
      ['text', 'import-name', 'import-key', 'import', 'format-help', 'song-editor-close'].forEach((name) =>
        expect(editor.querySelector(`[name="${name}"]`), name).not.toBeNull(),
      );
      expect(editorOpen(q)).toBe(false);
      q<HTMLButtonElement>('[name="edit-text"]').click();
      expect(editorOpen(q)).toBe(true);
      q<HTMLButtonElement>('[name="song-editor-close"]').click();
      expect(editorOpen(q)).toBe(false);
    });

    it('shows on a strip outside it, read-only, also when stopped: the song as written, as it is edited', () => {
      const { q, set } = setup();
      expect(q<HTMLElement>('.tab-view').hidden).toBe(false);
      expect(q('.tab-view').textContent).toBe(SONGS[0]!.text);
      set('text', 'C4 E4');
      expect(q('.tab-view').textContent).toBe('C4 E4');
    });

    it('highlights on the strip the note to play next while playing', () => {
      const { q, set, start, view, press } = setup();
      set('mode', 'wait');
      set('text', 'title: a<b\nC4 D4\nE4');
      start();
      view.tick(10);
      expect(q('.tab-view').textContent).toBe('title: a<b\nC4 D4\nE4');
      expect(now(q)).toEqual(['C4']);
      press('C4');
      expect(now(q)).toEqual(['D4']);
    });

    it('highlights the part of a - run being played, and a group once', () => {
      const { q, set, start, view, press } = setup();
      set('mode', 'wait');
      set('text', '1-(5-7)');
      start();
      view.tick(10);
      expect(now(q)).toEqual(['1']);
      press('C4');
      expect(now(q)).toEqual(['(5-7)']);
    });

    it('follows the kalimba when listening', () => {
      const { q, set, start, view } = setup();
      set('mode', 'listen');
      set('text', 'C4 E4');
      set('tempo', '60');
      start();
      view.tick(0.5);
      expect(now(q)).toEqual(['C4']);
      view.tick(1);
      expect(now(q)).toEqual(['E4']);
    });

    it('drops the highlight when stopped or done', () => {
      const { q, set, start, check, view, press } = setup();
      set('mode', 'wait');
      set('text', 'C4');
      check('loop', false); // done, not again
      start();
      view.tick(10);
      q<HTMLButtonElement>('[name="stop"]').click();
      expect(now(q)).toEqual([]);
      start();
      view.tick(10);
      press('C4');
      view.tick(0.1);
      expect(now(q)).toEqual([]);
    });

    it('stops a song playing when opened for editing: what plays is what the text says', () => {
      const { q, set, start, view, targets } = setup();
      set('mode', 'wait');
      set('text', 'C4');
      start();
      view.tick(10);
      expect(targets()).toEqual(['C4']);
      q<HTMLButtonElement>('[name="edit-text"]').click();
      expect(targets()).toEqual([]);
      expect(now(q)).toEqual([]);
    });
  });

  describe('on the song player’s clock', () => {
    const withPlayer = () => {
      const fake = fakeSongPlayer();
      return { ...setup(undefined, fake.player), ...fake };
    };
    const notesOf = (start: SongStart) => start.notes.map((n) => `${n.tongue.note}@${n.beat}`);

    it('listening, hands it the song at Start: its notes, the tempo, the meter, and with the click a bar’s lead-in', () => {
      const { set, start, check, asked } = withPlayer();
      set('mode', 'listen');
      set('text', 'meter: 3/4\nC4 E4');
      set('tempo', '72');
      check('click', true);
      start();
      expect(asked.played).toHaveLength(1);
      expect(notesOf(asked.played[0]!)).toEqual(['C4@0', 'E4@1']);
      expect(asked.played[0]).toMatchObject({ bpm: 72, meter: { beatsPerBar: 3, beatUnit: 4 }, leadInBeats: 3, click: true });
    });

    it('counts nothing in without the click: the song starts on the next beat', () => {
      const { set, start, asked } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4 E4');
      start();
      expect(asked.played[0]).toMatchObject({ leadInBeats: 0, click: false });
    });

    it('loops when asked: at the song’s end it starts again on the next bar line, no count-in between', () => {
      const { set, start, check, view, asked, moveTo, q } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4 E4 G4'); // three beats: the bar ends a beat after
      check('click', true);
      check('loop', true);
      start();
      moveTo(3.2);
      view.tick(0.016);
      expect(asked.played).toHaveLength(2);
      expect(asked.played[1]!.leadInBeats).toBeCloseTo(0.8, 6); // to beat 4, the next bar line
      expect(q('[role="status"]').textContent).not.toMatch(/Fertig/);
    });

    it('stops at the song’s end without the loop', () => {
      const { set, start, check, view, asked, moveTo } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4 E4');
      check('loop', false);
      start();
      moveTo(2.2);
      view.tick(0.016);
      expect(asked.played).toHaveLength(1);
      expect(asked.stops).toBeGreaterThan(0);
    });

    it('listening, leaves the plucking to it and follows its beat, however long the frames: the text marks what it plays', () => {
      const { set, start, view, sounded, q, moveTo } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4 E4');
      start();
      view.tick(10);
      expect(sounded).toEqual([]); // nothing played from the frame: the song player plays
      moveTo(0.5);
      view.tick(0.016);
      expect([...q('.tab-view').querySelectorAll('.now')].map((el) => el.textContent)).toEqual(['C4']);
      moveTo(1.2);
      view.tick(0.016);
      expect([...q('.tab-view').querySelectorAll('.now')].map((el) => el.textContent)).toEqual(['E4']);
      expect(sounded).toEqual([]);
    });

    it('playing along, keeps the time and the click for the player, and plays none of the notes', () => {
      const { set, start, check, view, q, asked, moveTo, press, sounded } = withPlayer();
      set('mode', 'play-along');
      set('text', 'C4 E4');
      check('loop', false); // to its end, once
      start();
      expect(asked.played[0]!.notes).toEqual([]);
      moveTo(0);
      view.tick(0.016);
      press('C4');
      expect(sounded).toEqual(['C4']); // the player's own pluck, heard
      moveTo(3);
      view.tick(0.016);
      expect(q('.status').textContent).toMatch(/1 von 2 gespielt · 1 Fehler/);
    });

    it('waiting, keeps its own time: the song player isn’t asked', () => {
      const { set, start, asked } = withPlayer();
      set('mode', 'wait');
      set('text', 'C4');
      start();
      expect(asked.played).toEqual([]);
    });

    it('is stopped by Stopp, and before a song starts again', () => {
      const { set, start, q, asked } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4');
      start();
      start();
      q<HTMLButtonElement>('[name="stop"]').click();
      expect(asked.stops).toBeGreaterThanOrEqual(2);
      expect(asked.played).toHaveLength(2);
    });

    it('follows the tempo slider and Klick as they change', () => {
      const { set, check, asked } = withPlayer();
      set('tempo', '120');
      check('click', true);
      expect(asked.tempos.at(-1)).toBe(120);
      expect(asked.clicks.at(-1)).toBe(true);
    });

    it('stops it once the song is done, so its click doesn’t run on', () => {
      const { set, start, view, asked, moveTo } = withPlayer();
      set('mode', 'play-along');
      set('text', 'C4 E4');
      start();
      const stopsAtStart = asked.stops;
      moveTo(10);
      view.tick(0.016);
      expect(asked.stops).toBe(stopsAtStart + 1);
    });

    it('clicks no beats from the frame: the song player clicks them', () => {
      const { set, check, start, view, clicks, moveTo } = withPlayer();
      set('mode', 'listen');
      set('text', 'C4 E4 G4 C5');
      check('click', true);
      start();
      moveTo(2);
      view.tick(1);
      expect(clicks).toEqual([]);
    });
  });

  describe('transpose', () => {
    const options = (q: ReturnType<typeof setup>['q']) =>
      [...q<HTMLSelectElement>('[name="transpose"]').options].map((o) => o.text);

    it('lists the ways to fit the song, best first, and updates when the text changes', () => {
      const { q, set } = setup();
      set('text', 'key: G\n1 2 3 4 5 6 7 1′ 3″');
      expect(options(q)).toEqual([
        'eine Quinte tiefer (7 Halbtöne) · passt am besten',
        'eine Quarte höher (5 Halbtöne) · 1 Note um eine Oktave versetzt',
        'eine Oktave und eine Quarte höher (17 Halbtöne) · 2 Noten um eine Oktave versetzt',
      ]);
      expect(q<HTMLSelectElement>('[name="transpose"]').value).toBe('-7');
    });

    it('plays the chosen way', () => {
      const { q, set, start, view, targets } = setup();
      set('mode', 'wait');
      set('text', 'key: G\n1 2 3 4 5 6 7 1′ 3″');
      set('transpose', '5');
      start();
      view.tick(10);
      expect(q('[role="status"]').textContent).toMatch(/eine Quarte höher/);
      expect(targets()).toEqual(['F4']);
    });

    it('offers nothing while the text has no notes', () => {
      const { q, set } = setup();
      set('text', 'just words');
      expect(options(q)).toEqual([]);
      expect(q<HTMLSelectElement>('[name="transpose"]').disabled).toBe(true);
    });
  });

  describe('retune', () => {
    const F_TONGUES = ['F3', 'F4', 'F5'];
    const raisedF = KALIMBA_21.map((t) => (F_TONGUES.includes(t.note) ? 1 : 0));
    const notes = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.tongue')].map((t) => t.dataset.note);

    const tapEnd = (root: HTMLElement, index: number) =>
      root.querySelectorAll<HTMLElement>('.tongue-head')[index]!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    it('cycles a tongue tapped above the bridge natural → sharp → flat → natural, playing each new pitch; no mode to switch on', () => {
      const { q, root, sounded, savedTunings } = setup();
      expect(q('[name="retune"]')).toBeNull();
      for (let i = 0; i < 3; i++) tapEnd(root, 10);
      expect(sounded).toEqual(['F#3', 'Fb3', 'F3']);
      expect(savedTunings.map((t) => t[10])).toEqual([1, -1, 0]);
    });

    it('starts from a saved tuning and says which tongues are retuned', () => {
      const { root, q } = setup(raisedF);
      expect(notes(root).filter((n) => n?.includes('#'))).toEqual(['F#4', 'F#3', 'F#5']);
      expect(q('.tuning').textContent).toBe('Stimmung: Standard-C mit 4\u0323, 4 und 4′ erhöht von F auf F#');
    });

    it('fits songs to the retuned tongues: a G major tab plays as written with the F tongues raised', () => {
      const { q, set, start, view } = setup(raisedF);
      set('text', 'key: G\n1 4 1″ 3″');
      expect(q<HTMLSelectElement>('[name="transpose"]').options[0].text).toBe('wie notiert · passt am besten');
      start();
      view.tick(1);
      expect(q('[role="status"]').textContent).toMatch(/· wie notiert/);
    });

    it('plays a tab number on the tongue it names, as retuned', () => {
      const onlyF5 = KALIMBA_21.map((t) => (t.note === 'F5' ? 1 : 0));
      const { q, set, start, view, targets, press } = setup(onlyF5);
      set('mode', 'wait');
      set('text', '4′ 4');
      expect(q<HTMLSelectElement>('[name="transpose"]').options[0].text).toBe('wie notiert · passt am besten');
      start();
      view.tick(10);
      expect(targets()).toEqual(['F#5']);
      press('F#5');
      expect(targets()).toEqual(['F4']);
    });

    it('resets to the standard tuning with the screw on the bridge', () => {
      const { q, root, savedTunings } = setup(raisedF);
      q<HTMLButtonElement>('.tuning-reset').click();
      expect(notes(root)).toEqual(KALIMBA_21.map((t) => t.note));
      expect(savedTunings.at(-1)).toEqual(KALIMBA_21.map(() => 0));
      expect(q('.tuning').textContent).toBe('Stimmung: Standard-C');
    });

    it('stops a running song when the tuning changes', () => {
      const { set, start, view, targets, root } = setup();
      set('mode', 'wait');
      start();
      view.tick(10);
      expect(targets()).toEqual(['C4']);
      tapEnd(root, 0);
      expect(targets()).toEqual([]);
    });
  });

  describe('import', () => {
    const importButton = (q: ReturnType<typeof setup>['q']) => q<HTMLButtonElement>('[name="import"]');

    it('shuts the editor once the song is in the list, to be played; a reason not to stays in it, where it was asked', () => {
      const { q, set } = setup();
      q<HTMLButtonElement>('[name="edit-text"]').click();
      set('text', 'C4 E4');
      importButton(q).click(); // no name yet
      expect(q<HTMLDialogElement>('dialog.song-editor').open).toBe(true);
      expect(q('dialog.song-editor [role="alert"]').textContent).toMatch(/Namen/);
      set('import-name', 'Mine');
      importButton(q).click();
      expect(q<HTMLDialogElement>('dialog.song-editor').open).toBe(false);
      expect(q('dialog.song-editor [role="alert"]').textContent).toBe('');
    });

    it('adds the pasted song under its name to the song list, selects it and says what it read', () => {
      const { q, set } = setup();
      set('text', 'Source: a page\nC D E (CEG)');
      set('import-name', '  My tab ');
      importButton(q).click();
      const select = q<HTMLSelectElement>('[name="song"]');
      expect([...select.options].map((o) => o.text)).toEqual(['Built-in one', 'Built-in two', 'My tab']);
      expect(select.selectedOptions[0].text).toBe('My tab');
      expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe('Source: a page\nC D E (CEG)');
      expect(q<HTMLInputElement>('[name="import-name"]').value).toBe('');
      expect(q('[role="status"]').textContent).toMatch(/„My tab“ hinzugefügt: 6 Noten, 1 Teil übersprungen/);
      expect(q('.skipped').textContent).toMatch(/Zeile 1 „Source: a page“/);
    });

    it('keeps the imported text when switching songs and back', () => {
      const { q, set } = setup();
      set('text', 'C D E');
      set('import-name', 'My tab');
      importButton(q).click();
      set('song', '0');
      set('song', '2');
      expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe('C D E');
    });

    it('names the imported song in the status when it is started', () => {
      const { q, set, start, view } = setup();
      set('text', 'C D E');
      set('import-name', 'My tab');
      importButton(q).click();
      start();
      view.tick(1);
      expect(q('[role="status"]').textContent).toMatch(/^My tab · wie notiert/);
    });

    it('writes the chosen tab tuning into the song as a key line', () => {
      const { q, set, start, view } = setup();
      set('text', '1 4 1″ 3″');
      set('import-name', 'Raised F tab');
      set('import-key', 'G');
      importButton(q).click();
      expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe('key: G\n1 4 1″ 3″');
      expect(q<HTMLSelectElement>('[name="import-key"]').value).toBe('');
      start();
      view.tick(1);
      expect(q('[role="status"]').textContent).toMatch(/^Raised F tab · eine Quinte tiefer/);
    });

    it('leaves a key line already in the text alone', () => {
      const { q, set } = setup();
      set('text', 'key: D\n1 4');
      set('import-name', 'Has key');
      set('import-key', 'G');
      importButton(q).click();
      expect(q<HTMLTextAreaElement>('[name="text"]').value).toBe('key: D\n1 4');
    });

    it.each([
      ['', 'C D E', /Namen/],
      ['Built-in one', 'C D E', /schon/],
      ['Words', 'no notes here', /keine Noten/i],
    ])('refuses name %j with text %j, saying why, and adds nothing', (name, text, reason) => {
      const { q, set } = setup();
      set('text', text);
      set('import-name', name);
      importButton(q).click();
      expect(q('dialog.song-editor [role="alert"]').textContent).toMatch(reason);
      expect(q<HTMLSelectElement>('[name="song"]').options).toHaveLength(2);
    });
  });
});
