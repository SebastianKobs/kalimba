import { DEFAULT_KLANG, MACROS, type KlangValues, type Macro } from './klang';
import './klang-panel.css';

export interface KlangPanelConfig {
  /** the macros as they start: the stored ones */
  readonly values: KlangValues;
  /** every change, the whole set */
  onChange(values: KlangValues): void;
}

function sliderMarkup(macro: Macro, value: number): string {
  const [min, max, step] = macro.range;
  return `
    <label title="${macro.hint} Doppelklick: zurück auf den Anfangswert.">
      <span class="macro-label">${macro.label}</span>
      <input type="range" name="${macro.name}" min="${min}" max="${max}" step="${step}" value="${value}" />
      <output name="${macro.name}-value">${macro.format(value)}</output>
    </label>`;
}

/** Edge: the Klang panel as a drawer hidden in the kalimba (mounted right after it): its pull shows under the belly; pulled, its sliders slide out, each macro's and a reset. */
export function mountKlangPanel(root: HTMLElement, config: KlangPanelConfig): void {
  const section = document.createElement('section');
  section.className = 'klang-panel klang-drawer';
  // the front last: pulled out, it moves down with the sliders behind it
  section.innerHTML = `
    <div class="klang-tray" inert>
      <div class="klang-slide">
        <div class="klang" id="klang-macros">
          ${MACROS.map((m) => sliderMarkup(m, config.values[m.name])).join('')}
          <button type="button" name="klang-reset" title="Alle Regler zurück, wie die Kalimba gebaut ist.">Zurücksetzen</button>
        </div>
      </div>
    </div>
    <button type="button" name="klang" class="drawer-front" aria-controls="klang-macros" aria-expanded="false" title="Klang bearbeiten"><span class="drawer-pull">Klang</span></button>`;
  root.append(section);

  const tray = section.querySelector<HTMLElement>('.klang-tray')!;
  const front = section.querySelector<HTMLButtonElement>('[name="klang"]')!;
  const slider = (macro: Macro) => section.querySelector<HTMLInputElement>(`input[name="${macro.name}"]`)!;
  const shown = (macro: Macro) => section.querySelector<HTMLOutputElement>(`output[name="${macro.name}-value"]`)!;
  let values = config.values;

  const show = (macro: Macro) => (shown(macro).textContent = macro.format(values[macro.name]));
  const set = (next: KlangValues) => {
    values = next;
    config.onChange(values);
  };

  front.addEventListener('click', () => {
    const open = !section.classList.contains('open');
    section.classList.toggle('open', open);
    tray.toggleAttribute('inert', !open); // shut: its sliders out of reach of Tab
    front.setAttribute('aria-expanded', String(open));
    front.title = open ? 'Klang schließen' : 'Klang bearbeiten';
  });
  for (const macro of MACROS) {
    slider(macro).addEventListener('input', () => {
      set({ ...values, [macro.name]: Number(slider(macro).value) });
      show(macro);
    });
    // a double-click puts it back where it starts, as on a mixing desk
    slider(macro).addEventListener('dblclick', () => {
      slider(macro).value = String(macro.default);
      set({ ...values, [macro.name]: macro.default });
      show(macro);
    });
  }
  section.querySelector('[name="klang-reset"]')!.addEventListener('click', () => {
    set(DEFAULT_KLANG);
    for (const macro of MACROS) {
      slider(macro).value = String(values[macro.name]);
      show(macro);
    }
  });
}
