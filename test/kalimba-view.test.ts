// @vitest-environment jsdom
import { mountKalimba } from '../src/kalimba-view';
import { KALIMBA_21, type Tongue } from '../src/layout';

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  const plucked: string[] = [];
  const unmount = mountKalimba(root, KALIMBA_21, { pluck: (t: Tongue) => plucked.push(t.note) });
  const tongue = (note: string) => root.querySelector<HTMLElement>(`[data-note="${note}"]`)!;
  const press = (code: string, init: KeyboardEventInit = {}) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...init }));
  return { root, plucked, unmount, tongue, press };
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

  it('stops listening once unmounted', () => {
    const { plucked, press, unmount, root } = setup();
    unmount();
    press('KeyZ');
    expect(plucked).toEqual([]);
    expect(root.childElementCount).toBe(0);
  });
});
