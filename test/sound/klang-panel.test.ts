// @vitest-environment jsdom
import { DEFAULT_KLANG, MACROS, type KlangValues } from '../../src/sound/klang';
import { mountKlangPanel } from '../../src/sound/klang-panel';

function setup(values: KlangValues = DEFAULT_KLANG) {
  const root = document.createElement('div');
  const kalimba = document.createElement('div');
  kalimba.className = 'kalimba';
  root.append(kalimba);
  document.body.append(root);
  const changes: KlangValues[] = [];
  mountKlangPanel(kalimba, { values, onChange: (next) => changes.push(next) });
  const q = <T extends Element>(selector: string) => root.querySelector<T>(selector);
  const toggle = () => q<HTMLButtonElement>('[name="klang"]')!.click();
  const slide = (name: string, value: number) => {
    const slider = q<HTMLInputElement>(`input[name="${name}"]`)!;
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const shown = (name: string) => q(`output[name="${name}-value"]`)!.textContent;
  return { root, kalimba, changes, q, toggle, slide, shown };
}

afterEach(() => document.body.replaceChildren());

describe('mountKlangPanel', () => {
  it('makes the kalimba’s body a bonnet over its sliders: shut until its latch is pulled, then a slider for each macro, labelled in German', () => {
    const { q, root, kalimba, toggle } = setup();
    const bay = q<HTMLElement>('.klang-bay')!;
    const latch = q<HTMLButtonElement>('[name="klang"]')!;
    expect(kalimba.parentElement).toBe(q('.bonnet-front'));
    expect(latch.closest('.bonnet-front')).not.toBeNull(); // on the body, lifted with it
    expect(latch.textContent).toBe('Klang');
    expect(latch.title).toBe('Klang bearbeiten');
    expect(latch.getAttribute('aria-expanded')).toBe('false');
    expect(latch.getAttribute('aria-controls')).toBe(q('.klang')!.id);
    expect(bay.classList.contains('open')).toBe(false);
    expect(q('.klang')!.closest('[inert]')).not.toBeNull(); // shut: its sliders out of reach of Tab
    toggle();
    expect(latch.getAttribute('aria-expanded')).toBe('true');
    expect(bay.classList.contains('open')).toBe(true);
    expect(q('.klang')!.closest('[inert]')).toBeNull();
    expect(q('.bonnet-front')!.hasAttribute('inert')).toBe(true); // lifted: its tongues and latch out of reach
    expect([...root.querySelectorAll('.klang label .macro-label')].map((l) => l.textContent)).toEqual(MACROS.map((m) => m.label));
    expect(q('input[name="stimmung"]')!.closest('label')!.title).toMatch(/Cent/);
  });

  it('shuts from its own button, from Escape and from a click on the lifted lid, the latch then in reach again', () => {
    const { q, toggle } = setup();
    const bay = q<HTMLElement>('.klang-bay')!;
    const shutBy = (action: () => void) => {
      toggle();
      expect(bay.classList.contains('open')).toBe(true);
      action();
      expect(bay.classList.contains('open')).toBe(false);
      expect(q('.bonnet-front')!.hasAttribute('inert')).toBe(false);
      expect(q('[name="klang"]')!.getAttribute('aria-expanded')).toBe('false');
    };
    shutBy(() => q<HTMLButtonElement>('[name="klang-close"]')!.click());
    shutBy(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    shutBy(() => q<HTMLElement>('.bonnet-underside')!.click()); // the inside of the lid, what shows of it lifted
  });

  it('shows Helligkeit at 3500 Hz to start', () => {
    expect(setup().shown('helligkeit')).toBe('3500 Hz');
  });

  it('starts from the values handed in', () => {
    const { q, shown } = setup({ ...DEFAULT_KLANG, stimmung: -12 });
    expect(q<HTMLInputElement>('input[name="stimmung"]')!.value).toBe('-12');
    expect(shown('stimmung')).toBe('-12 Cent');
  });

  it('tells each slide, and shows its value', () => {
    const { changes, slide, shown } = setup();
    slide('stimmung', 20);
    slide('helligkeit', 0);
    expect(changes.at(-1)).toEqual({ ...DEFAULT_KLANG, stimmung: 20, helligkeit: 0 });
    expect(shown('stimmung')).toBe('+20 Cent');
    expect(shown('helligkeit')).toBe('300 Hz');
  });

  it('puts one macro back to its default on a double-click of its slider', () => {
    const { q, changes, slide, shown } = setup();
    slide('stimmung', 30);
    slide('obertoene', 2);
    q('input[name="stimmung"]')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(changes.at(-1)).toEqual({ ...DEFAULT_KLANG, obertoene: 2 });
    expect(q<HTMLInputElement>('input[name="stimmung"]')!.value).toBe('0');
    expect(shown('stimmung')).toBe('0 Cent');
  });

  it('puts every macro back from its reset', () => {
    const { q, changes, slide, toggle } = setup();
    toggle();
    slide('obertoene', 2);
    q<HTMLButtonElement>('[name="klang-reset"]')!.click();
    expect(changes.at(-1)).toEqual(DEFAULT_KLANG);
    expect(q<HTMLInputElement>('input[name="obertoene"]')!.value).toBe('1');
  });
});
