// @vitest-environment jsdom
import { KALIMBA_21, type Tongue } from '../../src/layout';
import { mountPractice } from '../../src/practice/practice-view';

const SONGS = [
  { title: 'Built-in one', text: 'title: Built-in one\ntempo: 60\nC4 E4' },
  { title: 'Built-in two', text: 'title: Built-in two\nG4' },
];

function setup(tuning?: number[]) {
  const root = document.createElement('div');
  document.body.append(root);
  const sounded: string[] = [];
  const savedTunings: number[][] = [];
  const sound = { pluck: (t: Tongue) => sounded.push(t.note) };
  const view = mountPractice(root, {
    tongues: KALIMBA_21,
    sound,
    songs: SONGS,
    highway: () => ({ draw() {} }),
    tuning,
    onTuningChange: (halfSteps) => savedTunings.push([...halfSteps]),
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
  return { root, view, sounded, savedTunings, q, set, tongue, targets, press, start };
}

afterEach(() => document.body.replaceChildren());

describe('mountPractice', () => {
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
    expect(q('[role="status"]').textContent).toMatch(/Mine.*down a whole tone \(2 semitones\)/);
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
    // 30 BPM: half a beat per second; 4 beats lead-in
    view.tick(8);
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
    expect(skipped).toMatch(/line 1 "Source: some page"/);
    expect(skipped).toMatch(/line 2 "H4"/);
  });

  it('does not start when nothing in the text is a note, and says so', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    set('text', 'just some words');
    start();
    view.tick(10);
    expect(q('[role="alert"]').textContent).toMatch(/no notes/i);
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

  describe('transpose', () => {
    const options = (q: ReturnType<typeof setup>['q']) =>
      [...q<HTMLSelectElement>('[name="transpose"]').options].map((o) => o.text);

    it('lists the ways to fit the song, best first, and updates when the text changes', () => {
      const { q, set } = setup();
      set('text', 'key: G\n1 2 3 4 5 6 7 1′ 3″');
      expect(options(q)).toEqual([
        'down a fifth (7 semitones) · best fit',
        'up a fourth (5 semitones) · 1 note moved by an octave',
        'up an octave and a fourth (17 semitones) · 2 notes moved by an octave',
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
      expect(q('[role="status"]').textContent).toMatch(/moved up a fourth/);
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

    it('cycles a tapped tongue natural → sharp → flat → natural, playing each new pitch', () => {
      const { q, root, sounded, savedTunings } = setup();
      q<HTMLButtonElement>('[name="retune"]').click();
      const f3 = () => root.querySelectorAll<HTMLElement>('.tongue')[10];
      for (let i = 0; i < 3; i++) f3().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      expect(sounded).toEqual(['F#3', 'Fb3', 'F3']);
      expect(savedTunings.map((t) => t[10])).toEqual([1, -1, 0]);
      expect(q('[name="retune"]').getAttribute('aria-pressed')).toBe('true');
    });

    it('starts from a saved tuning and says which tongues are retuned', () => {
      const { root, q } = setup(raisedF);
      expect(notes(root).filter((n) => n?.includes('#'))).toEqual(['F#4', 'F#3', 'F#5']);
      expect(q('.tuning').textContent).toBe('Tuning: Standard C with 4\u0323, 4 and 4′ raised from F to F#');
    });

    it('fits songs to the retuned tongues: a G major tab plays as written with the F tongues raised', () => {
      const { q, set, start, view } = setup(raisedF);
      set('text', 'key: G\n1 4 1″ 3″');
      expect(q<HTMLSelectElement>('[name="transpose"]').options[0].text).toBe('as written · best fit');
      start();
      view.tick(1);
      expect(q('[role="status"]').textContent).toMatch(/· as written/);
    });

    it('plays a tab number on the tongue it names, as retuned', () => {
      const onlyF5 = KALIMBA_21.map((t) => (t.note === 'F5' ? 1 : 0));
      const { q, set, start, view, targets, press } = setup(onlyF5);
      set('mode', 'wait');
      set('text', '4′ 4');
      expect(q<HTMLSelectElement>('[name="transpose"]').options[0].text).toBe('as written · best fit');
      start();
      view.tick(10);
      expect(targets()).toEqual(['F#5']);
      press('F#5');
      expect(targets()).toEqual(['F4']);
    });

    it('resets to the standard tuning', () => {
      const { q, root, savedTunings } = setup(raisedF);
      q<HTMLButtonElement>('[name="retune-reset"]').click();
      expect(notes(root)).toEqual(KALIMBA_21.map((t) => t.note));
      expect(savedTunings.at(-1)).toEqual(KALIMBA_21.map(() => 0));
      expect(q('.tuning').textContent).toBe('Tuning: Standard C');
    });

    it('stops a running song when the tuning changes', () => {
      const { q, set, start, view, targets, root } = setup();
      set('mode', 'wait');
      start();
      view.tick(10);
      expect(targets()).toEqual(['C4']);
      q<HTMLButtonElement>('[name="retune"]').click();
      root.querySelectorAll<HTMLElement>('.tongue')[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      expect(targets()).toEqual([]);
    });
  });

  describe('import', () => {
    const importButton = (q: ReturnType<typeof setup>['q']) => q<HTMLButtonElement>('[name="import"]');

    it('shows the song box, a name field and the Import button without opening anything', () => {
      const { q } = setup();
      for (const name of ['text', 'import-name', 'import']) {
        expect(q(`[name="${name}"]`).closest('details, [hidden]')).toBeNull();
      }
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
      expect(q('[role="status"]').textContent).toMatch(/Added "My tab": 6 notes, 1 part skipped/);
      expect(q('.skipped').textContent).toMatch(/line 1 "Source: a page"/);
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
      expect(q('[role="status"]').textContent).toMatch(/^My tab · as written/);
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
      expect(q('[role="status"]').textContent).toMatch(/^Raised F tab · moved down a fifth/);
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
      ['', 'C D E', /name/i],
      ['Built-in one', 'C D E', /already/i],
      ['Words', 'no notes here', /no notes/i],
    ])('refuses name %j with text %j, saying why, and adds nothing', (name, text, reason) => {
      const { q, set } = setup();
      set('text', text);
      set('import-name', name);
      importButton(q).click();
      expect(q('[role="alert"]').textContent).toMatch(reason);
      expect(q<HTMLSelectElement>('[name="song"]').options).toHaveLength(2);
    });
  });
});
