import { keyForTongue, tongueForKey } from './keymap';
import type { Tongue } from './layout';

export interface Plucker {
  pluck(tongue: Tongue): void;
}

const DOT = '•';

function keyLabel(code: string): string {
  const symbols: Record<string, string> = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'" };
  return symbols[code] ?? code.replace('Key', '');
}

function renderTongue(tongue: Tongue): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'tongue';
  el.dataset.note = tongue.note;
  el.dataset.index = String(tongue.index);
  el.style.setProperty('--length', String(tongue.lengthRatio));
  el.setAttribute('aria-label', tongue.note);
  const dotsAbove = DOT.repeat(Math.max(0, tongue.octaveDots));
  const dotsBelow = DOT.repeat(Math.max(0, -tongue.octaveDots));
  el.innerHTML = `
    <span class="letter">${tongue.letter}</span>
    <span class="dots">${dotsAbove}</span>
    <span class="cipher">${tongue.cipher}</span>
    <span class="dots">${dotsBelow}</span>
    <span class="key">${keyLabel(keyForTongue(tongue))}</span>`;
  return el;
}

function flash(el: HTMLElement): void {
  el.classList.remove('plucked');
  void el.offsetWidth; // restart the CSS animation on re-pluck
  el.classList.add('plucked');
}

/** Draws the tongues into root and wires pointer + keyboard input to the plucker. Returns unmount. */
export function mountKalimba(root: HTMLElement, tongues: readonly Tongue[], plucker: Plucker): () => void {
  const doc = root.ownerDocument;
  const board = doc.createElement('div');
  board.className = 'kalimba';
  const elements = tongues.map(renderTongue);
  board.append(...elements);
  root.append(board);

  const pluck = (tongue: Tongue) => {
    plucker.pluck(tongue);
    flash(elements[tongue.index]);
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
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tongue = tongueForKey(e.code);
    if (!tongue) return;
    e.preventDefault();
    pluck(tongue);
  };

  board.addEventListener('pointerdown', onPointerDown);
  doc.addEventListener('pointermove', onPointerMove);
  doc.addEventListener('pointerup', onPointerUp);
  doc.addEventListener('pointercancel', onPointerUp);
  doc.addEventListener('keydown', onKeyDown);

  return () => {
    doc.removeEventListener('pointermove', onPointerMove);
    doc.removeEventListener('pointerup', onPointerUp);
    doc.removeEventListener('pointercancel', onPointerUp);
    doc.removeEventListener('keydown', onKeyDown);
    board.remove();
  };
}
