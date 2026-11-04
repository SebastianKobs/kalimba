// @vitest-environment jsdom
import { KALIMBA_21, type Tongue } from '../../src/layout';
import { mountPractice } from '../../src/practice/practice-view';

const SONGS = [
  { title: 'Built-in one', text: 'title: Built-in one\ntempo: 60\nC4 E4' },
  { title: 'Built-in two', text: 'title: Built-in two\nG4' },
];

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  const sounded: string[] = [];
  const sound = { pluck: (t: Tongue) => sounded.push(t.note) };
  const view = mountPractice(root, { tongues: KALIMBA_21, sound, songs: SONGS, highway: () => ({ draw() {} }) });
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
  return { root, view, sounded, q, set, tongue, targets, press, start };
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
    expect(q('[role="status"]').textContent).toMatch(/Mine.*down 2 semitones/);
    expect(targets()).toEqual(['C4']);
  });

  it('in listen mode, plays the song itself at the chosen speed', () => {
    const { set, start, view, sounded } = setup();
    set('mode', 'listen');
    set('speed', '50');
    start();
    // tempo 60 at 50%: half a beat per second; 4 beats lead-in
    view.tick(8);
    expect(sounded).toEqual(['C4']);
    view.tick(2);
    expect(sounded).toEqual(['C4', 'E4']);
  });

  it('rejects song text it cannot read, with the reason, and does not start', () => {
    const { set, start, q, view, targets } = setup();
    set('mode', 'wait');
    set('text', 'C4 H4');
    start();
    view.tick(10);
    expect(q('[role="alert"]').textContent).toMatch(/"H4" is not a note/);
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
});
