// @vitest-environment jsdom
import { mountKalimba } from '../src/kalimba-view';
import { KALIMBA_21, type Tongue } from '../src/layout';

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  const plucked: string[] = [];
  const handle = mountKalimba(root, KALIMBA_21, { pluck: (t: Tongue) => plucked.push(t.note) });
  const tongue = (note: string) => root.querySelector<HTMLElement>(`[data-note="${note}"]`)!;
  const press = (code: string, init: KeyboardEventInit = {}) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...init }));
  return { root, plucked, handle, tongue, press };
}

afterEach(() => document.body.replaceChildren());

describe('mountKalimba', () => {
  it('draws the tongues left to right, labelled like the card', () => {
    const { root } = setup();
    const tongues = [...root.querySelectorAll<HTMLElement>('[data-note]')];
    expect(tongues.map((t) => t.dataset.note)).toEqual(KALIMBA_21.map((t) => t.note));
    expect(tongues[0].textContent).toContain('D');
    expect(tongues[0].textContent).toContain('2');
  });

  it('plucks a tongue when it is pressed', () => {
    const { plucked, tongue } = setup();
    tongue('F3').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(plucked).toEqual(['F3']);
  });

  it('plucks a tongue from the computer keyboard, once per key press', () => {
    const { plucked, press } = setup();
    press('KeyZ');
    press('KeyZ', { repeat: true });
    press('Quote');
    expect(plucked).toEqual(['F3', 'E6']);
  });

  it('leaves unmapped keys and browser shortcuts alone', () => {
    const { plucked, press } = setup();
    press('Space');
    press('KeyZ', { ctrlKey: true });
    press('KeyA', { metaKey: true });
    expect(plucked).toEqual([]);
  });

  it('leaves typing in text fields alone', () => {
    const { plucked } = setup();
    const field = document.createElement('textarea');
    document.body.append(field);
    field.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true }));
    expect(plucked).toEqual([]);
  });

  it('stops listening once unmounted', () => {
    const { plucked, press, handle, root } = setup();
    handle.unmount();
    press('KeyZ');
    expect(plucked).toEqual([]);
    expect(root.childElementCount).toBe(0);
  });

  it('marks the tongues to play next, and a wrong pluck', () => {
    const { handle, tongue } = setup();
    const [d6, f3] = [KALIMBA_21[0], KALIMBA_21[10]];
    handle.setTargets([d6, f3]);
    expect(tongue('D6').classList.contains('target')).toBe(true);
    expect(tongue('F3').classList.contains('target')).toBe(true);
    handle.setTargets([f3]);
    expect(tongue('D6').classList.contains('target')).toBe(false);
    handle.markMiss(d6);
    expect(tongue('D6').classList.contains('miss')).toBe(true);
  });

  it('plucks from code, like a finger would', () => {
    const { handle, plucked, tongue } = setup();
    handle.pluck(KALIMBA_21[10]);
    expect(plucked).toEqual(['F3']);
    expect(tongue('F3').classList.contains('plucked')).toBe(true);
  });
});
