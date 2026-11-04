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

/**
 * Edge: the Klang panel under the kalimba's body, which becomes a bonnet hinged at its top edge: its latch on the belly;
 * pulled, the body lifts and the sliders show beneath it, each macro's, a reset and a close.
 */
export function mountKlangPanel(kalimba: HTMLElement, config: KlangPanelConfig): void {
  const doc = kalimba.ownerDocument;
  const bay = doc.createElement('section');
  bay.className = 'klang-panel klang-bay';
  bay.innerHTML = `
    <div class="klang-cavity" inert>
      <div class="klang" id="klang-macros">
        ${MACROS.map((m) => sliderMarkup(m, config.values[m.name])).join('')}
        <div class="klang-actions">
          <button type="button" name="klang-reset" title="Alle Regler zurück, wie die Kalimba gebaut ist.">Zurücksetzen</button>
          <button type="button" name="klang-close">Schließen</button>
        </div>
      </div>
    </div>
    <div class="bonnet">
      <div class="bonnet-front">
        <button type="button" name="klang" class="bonnet-latch" aria-controls="klang-macros" aria-expanded="false" title="Klang bearbeiten">Klang</button>
      </div>
      <div class="bonnet-underside" aria-hidden="true" title="Klang schließen"></div>
    </div>`;
  kalimba.replaceWith(bay);
  const front = bay.querySelector<HTMLElement>('.bonnet-front')!;
  front.prepend(kalimba);

  const cavity = bay.querySelector<HTMLElement>('.klang-cavity')!;
  const latch = bay.querySelector<HTMLButtonElement>('[name="klang"]')!;
  const setOpen = (open: boolean) => {
    bay.classList.toggle('open', open);
    cavity.toggleAttribute('inert', !open); // shut: its sliders out of reach of Tab
    front.toggleAttribute('inert', open); // lifted: the tongues and latch out of reach
    latch.setAttribute('aria-expanded', String(open));
    if (open) bay.querySelector<HTMLElement>('.klang input')?.focus({ preventScroll: true });
    else if (cavity.contains(doc.activeElement)) latch.focus({ preventScroll: true });
  };
  latch.addEventListener('click', () => setOpen(true));
  bay.querySelector('[name="klang-close"]')!.addEventListener('click', () => setOpen(false));
  bay.querySelector('.bonnet-underside')!.addEventListener('click', () => setOpen(false));
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bay.classList.contains('open')) setOpen(false);
  });

  const slider = (macro: Macro) => bay.querySelector<HTMLInputElement>(`input[name="${macro.name}"]`)!;
  const shown = (macro: Macro) => bay.querySelector<HTMLOutputElement>(`output[name="${macro.name}-value"]`)!;
  let values = config.values;

  const show = (macro: Macro) => (shown(macro).textContent = macro.format(values[macro.name]));
  const set = (next: KlangValues) => {
    values = next;
    config.onChange(values);
  };

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
  bay.querySelector('[name="klang-reset"]')!.addEventListener('click', () => {
    set(DEFAULT_KLANG);
    for (const macro of MACROS) {
      slider(macro).value = String(values[macro.name]);
      show(macro);
    }
  });
}
