import { keyForTongue, tongueForKey } from './keymap';
import type { Tongue } from './layout';
import { DOT_BELOW, tongueNumberParts } from './tuning';

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
  /** relabel after retuning; same tongues in the same places */
  setTongues(tongues: readonly Tongue[]): void;
  /** while on, a tap asks to retune the tongue (onRetune) instead of plucking it */
  setRetuning(on: boolean): void;
  unmount(): void;
}

export interface KalimbaOptions {
  onRetune?(tongue: Tongue): void;
}




function keyLabel(code: string): string {
  const symbols: Record<string, string> = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'" };
  return symbols[code] ?? code.replace('Key', '');
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
  let retuning = false;
  const board = doc.createElement('div');
  board.className = 'kalimba';
  const elements = tongues.map(renderTongue);
  board.append(...elements);
  root.append(board);

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
    if (retuning) {
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
    setTongues(next) {
      tongues = next;
      next.forEach((tongue, i) => labelTongue(elements[i], tongue));
    },
    setRetuning(on) {
      retuning = on;
      board.classList.toggle('retuning', on);
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
