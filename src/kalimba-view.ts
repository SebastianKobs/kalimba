import { keyForTongue, tongueForKey } from './keymap';
import type { Tongue } from './layout';
import { describeTuning, DOT_BELOW, engravedTuning, tongueNumberParts } from './tuning';

export interface Plucker {
  pluck(tongue: Tongue): void;
}

export interface KalimbaHandle {
  /** pluck as if by finger: sound through the plucker, plus the visual */
  pluck(tongue: Tongue): void;
  /** light up the tongues to play next; replaces the previous targets */
  setTargets(tongues: readonly Tongue[]): void;
  markMiss(tongue: Tongue): void;
  /** the tongue elements, left to right, for aligning things with them */
  readonly tongueElements: readonly HTMLElement[];
  /** relabel after retuning; same tongues in the same places. home: the pitch class a song retuned for comes home on, naming its scale */
  setTongues(tongues: readonly Tongue[], home?: number): void;
  unmount(): void;
}

export interface KalimbaOptions {
  /** a tap on a tongue's end, from the bridge up: retune it */
  onRetune?(tongue: Tongue): void;
  /** the screw on the body: back to the standard tuning */
  onResetTuning?(): void;
}

// what a German (QWERTZ) keyboard prints on the key at each position; the keys play by position
const GERMAN_KEY_LABELS: Record<string, string> = { KeyZ: 'Y', Comma: ',', Period: '.', Slash: '-', Semicolon: 'Ö', Quote: 'Ä' };

function keyLabel(code: string): string {
  return GERMAN_KEY_LABELS[code] ?? code.replace('Key', '');
}

function labelTongue(el: HTMLElement, tongue: Tongue): void {
  el.dataset.note = tongue.note;
  el.setAttribute('aria-label', tongue.note);
  el.classList.toggle('retuned', tongue.tuning !== 0);
  // written as you'd type it into a song: F#′ over #4′
  const { accidental, digit, above, below } = tongueNumberParts(tongue);
  // primes in their own element so they stand out; a dot below combines with the character right before it
  const dots = DOT_BELOW.repeat(below);
  const primes = above ? `<span class="octave">${above}</span>` : '';
  el.innerHTML = `
    <span class="tongue-head" title="Umstimmen: ♮ → ♯ → ♭"></span>
    <span class="letter">${tongue.letter}${dots}${tongue.accidental}${primes}</span>
    <span class="cipher">${accidental}${digit}${dots}${primes}</span>
    <span class="key">${keyLabel(keyForTongue(tongue))}</span>`;
}

function renderTongue(tongue: Tongue): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'tongue';
  el.dataset.index = String(tongue.index);
  el.style.setProperty('--length', String(tongue.lengthRatio));
  labelTongue(el, tongue);
  return el;
}

// a brass screw with a turning arrow engraved: back to the standard tuning
function renderResetScrew(doc: Document): HTMLButtonElement {
  const screw = doc.createElement('button');
  screw.type = 'button';
  screw.className = 'tuning-reset';
  screw.setAttribute('aria-label', 'Stimmung zurücksetzen');
  screw.title = 'Stimmung zurücksetzen';
  screw.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8.5A6 6 0 1 1 6 12" /><path d="M7.5 3.5v5h5" /></svg>`;
  return screw;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

function flash(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth; // restart the CSS animation on re-pluck
  el.classList.add(className);
}

/** Draws the tongues into root and wires pointer + keyboard input to the plucker. */
export function mountKalimba(
  root: HTMLElement,
  initialTongues: readonly Tongue[],
  plucker: Plucker,
  options: KalimbaOptions = {},
): KalimbaHandle {
  const doc = root.ownerDocument;
  let tongues = initialTongues;
  const board = doc.createElement('div');
  board.className = 'kalimba';
  const elements = tongues.map(renderTongue);
  const resetScrew = renderResetScrew(doc);
  // the tuning burnt into the wood, across from its screw, short; in words for a screen reader
  const said = doc.createElement('p');
  said.className = 'tuning visually-hidden';
  const engraving = doc.createElement('p');
  engraving.className = 'engraving';
  engraving.setAttribute('aria-hidden', 'true');
  board.append(...elements, resetScrew, said, engraving);
  root.append(board);
  let home: number | undefined;
  const showTuning = () => {
    resetScrew.disabled = tongues.every((t) => t.tuning === 0);
    said.textContent = describeTuning(tongues, home);
    engraving.title = said.textContent; // the whole of it, where the wood shows only part
    engraving.replaceChildren(...engravedTuning(tongues, home).map((line) => Object.assign(doc.createElement('span'), { textContent: line })));
  };
  showTuning();
  resetScrew.addEventListener('click', () => options.onResetTuning?.());

  const pluck = (tongue: Tongue) => {
    plucker.pluck(tongue);
    flash(elements[tongue.index], 'plucked');
  };
  const tongueAt = (target: EventTarget | null): Tongue | undefined => {
    const el = target instanceof Element ? target.closest<HTMLElement>('.tongue') : null;
    return el && board.contains(el) ? tongues[Number(el.dataset.index)] : undefined;
  };

  // per-pointer last tongue, so dragging across tongues strums each one once
  const lastTongue = new Map<number, Tongue | undefined>();

  const onPointerDown = (e: PointerEvent) => {
    const tongue = tongueAt(e.target);
    if (!tongue) return;
    e.preventDefault();
    if (e.target instanceof Element && e.target.closest('.tongue-head')) {
      options.onRetune?.(tongue); // no strumming while tuning: one tap, one tongue
      return;
    }
    lastTongue.set(e.pointerId, tongue);
    pluck(tongue);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!lastTongue.has(e.pointerId)) return;
    const tongue = tongueAt(doc.elementFromPoint(e.clientX, e.clientY));
    if (!tongue || tongue === lastTongue.get(e.pointerId)) return;
    lastTongue.set(e.pointerId, tongue);
    pluck(tongue);
  };
  const onPointerUp = (e: PointerEvent) => lastTongue.delete(e.pointerId);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    const tongue = tongueForKey(e.code, tongues);
    if (!tongue) return;
    e.preventDefault();
    pluck(tongue);
  };

  board.addEventListener('pointerdown', onPointerDown);
  doc.addEventListener('pointermove', onPointerMove);
  doc.addEventListener('pointerup', onPointerUp);
  doc.addEventListener('pointercancel', onPointerUp);
  doc.addEventListener('keydown', onKeyDown);

  return {
    pluck,
    setTargets(targets) {
      const wanted = new Set(targets.map((t) => t.index));
      elements.forEach((el, i) => el.classList.toggle('target', wanted.has(i)));
    },
    markMiss: (tongue) => flash(elements[tongue.index], 'miss'),
    tongueElements: elements,
    setTongues(next, songHome) {
      tongues = next;
      home = songHome;
      next.forEach((tongue, i) => labelTongue(elements[i], tongue));
      showTuning();
    },
    unmount() {
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('pointercancel', onPointerUp);
      doc.removeEventListener('keydown', onKeyDown);
      board.remove();
    },
  };
}
