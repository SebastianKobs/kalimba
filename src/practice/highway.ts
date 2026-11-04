import type { KalimbaHandle } from '../kalimba-view';
import type { Tongue } from '../layout';
import { tongueNumberParts } from '../tuning';
import type { Highway } from './practice-view';
import type { PracticeSession } from './session';

const PIXELS_PER_BEAT = 64;
const NOTE_HEIGHT = 34;
const FONT_SIZE = 11;
const NOTE_GAP = 3; // between a note's end and the next one's head
const MIN_NOTE = 14; // a 16th still a block, not a line
const FULL_LABEL = 30; // a head this tall has room for the letter and the number

export interface NoteShape {
  /** from its head's foot to its end, in pixels */
  readonly length: number;
  readonly head: number;
  readonly label: 'full' | 'letter';
}

/** A falling note as long as it lasts: its head where it lands, the held rest of it above. */
export function noteShape(beats: number): NoteShape {
  const length = Math.max(MIN_NOTE, beats * PIXELS_PER_BEAT - NOTE_GAP);
  const head = Math.min(NOTE_HEIGHT, length);
  return { length, head, label: head >= FULL_LABEL ? 'full' : 'letter' };
}

function cssColour(el: Element, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/** One label line with its octave marks drawn apart: primes bigger after the text, dots under it. */
function drawMarked(
  ctx: CanvasRenderingContext2D,
  text: string,
  above: string,
  below: number,
  centre: number,
  y: number,
  colours: { label: string; octave: string },
  suffix = '', // after the dots below: F̣# has its dot under the F
): void {
  ctx.font = `700 ${FONT_SIZE}px system-ui, sans-serif`;
  const baseWidth = ctx.measureText(text).width;
  const textWidth = ctx.measureText(text + suffix).width;
  ctx.font = `900 ${FONT_SIZE * 1.5}px system-ui, sans-serif`;
  const primeWidth = above ? ctx.measureText(above).width : 0;
  const left = centre - (textWidth + primeWidth) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = colours.label;
  ctx.font = `700 ${FONT_SIZE}px system-ui, sans-serif`;
  ctx.fillText(text + suffix, left, y);
  ctx.fillStyle = colours.octave;
  if (above) {
    ctx.font = `900 ${FONT_SIZE * 1.5}px system-ui, sans-serif`;
    ctx.fillText(above, left + textWidth, y + 2);
  }
  for (let i = 0; i < below; i++) {
    ctx.beginPath();
    ctx.arc(left + baseWidth / 2 + (text.length > 1 ? baseWidth / 4 : 0), y + FONT_SIZE * 0.6 + i * 3, 1.4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawNoteLabel(ctx: CanvasRenderingContext2D, tongue: Tongue, centre: number, y: number, colours: { label: string; octave: string }): void {
  const { accidental, digit, above, below } = tongueNumberParts(tongue);
  drawMarked(ctx, tongue.letter, above, below, centre, y - FONT_SIZE * 0.6, colours, tongue.accidental);
  drawMarked(ctx, accidental + digit, above, below, centre, y + FONT_SIZE * 0.5, colours);
}

/** Canvas lane per tongue; notes fall onto the hit line at the bridge, one beat every PIXELS_PER_BEAT. */
// where it lies on the page as laid out, transforms ignored: a lifted bonnet must not move the lanes
function pageLeft(el: HTMLElement): number {
  let left = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) left += node.offsetLeft;
  return left;
}

export function canvasHighway(canvas: HTMLCanvasElement, kalimba: KalimbaHandle): Highway {
  const ctx = canvas.getContext('2d');
  return {
    draw(session: PracticeSession | undefined) {
      if (!ctx) return;
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const origin = pageLeft(canvas);
      const lanes = kalimba.tongueElements.map((el) => ({ centre: pageLeft(el) - origin + el.offsetWidth / 2, width: el.offsetWidth }));
      const hitY = height - NOTE_HEIGHT / 2 - 2;
      const colours = {
        lane: cssColour(canvas, '--lane', '#ffffff14'),
        grid: cssColour(canvas, '--grid', '#ffffff10'),
        bar: cssColour(canvas, '--bar', '#ffffff40'),
        hit: cssColour(canvas, '--hit-line', '#000000'),
        exact: cssColour(canvas, '--note', '#c0394f'),
        folded: cssColour(canvas, '--note-octave', '#edb8bf'),
      };
      // each kind of note its own ink: light on the rose red, dark on the pale rose
      const ink = {
        exact: { label: cssColour(canvas, '--note-label', '#ffffff'), octave: cssColour(canvas, '--note-mark', '#ffd0d7') },
        folded: { label: cssColour(canvas, '--note-octave-label', '#3a1018'), octave: cssColour(canvas, '--note-octave-mark', '#8a1c30') },
      };

      ctx.fillStyle = colours.lane;
      lanes.forEach((l) => {
        ctx.beginPath();
        ctx.roundRect(l.centre - l.width / 2, 0, l.width, height, [6, 6, 0, 0]);
        ctx.fill();
      });
      ctx.fillStyle = colours.hit;
      ctx.fillRect(0, hitY - 1, width, 2);
      if (!session) return;

      // one faint line per beat, so rhythm reads as spacing; a stronger one where a bar starts
      const now = session.beat;
      for (let b = Math.ceil(now); (b - now) * PIXELS_PER_BEAT < height; b++) {
        const barStart = ((b % session.beatsPerBar) + session.beatsPerBar) % session.beatsPerBar === 0;
        ctx.fillStyle = barStart ? colours.bar : colours.grid;
        ctx.fillRect(0, hitY - (b - now) * PIXELS_PER_BEAT, width, barStart ? 2 : 1);
      }

      ctx.textBaseline = 'middle';
      for (const note of session.inView()) {
        const y = hitY - (note.beat - now) * PIXELS_PER_BEAT; // its head's middle meets the line as it's struck
        const shape = noteShape(note.beats);
        const foot = y + shape.head / 2;
        const end = foot - shape.length;
        if (foot < 0) break; // sorted by onset: the rest is further up
        const lane = lanes[note.tongue.index];
        const struck = note.beat < now;
        ctx.fillStyle = note.fit === 'exact' ? colours.exact : colours.folded;
        // the held part, lighter, narrower, above the head; struck, it sinks into the line as it sounds
        const heldFoot = struck ? hitY : foot - shape.head;
        if (heldFoot > end) {
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          ctx.roundRect(lane.centre - lane.width * 0.3, end, lane.width * 0.6, heldFoot - end, [6, 6, 0, 0]);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (struck) continue;
        ctx.beginPath();
        ctx.roundRect(lane.centre - lane.width * 0.45, foot - shape.head, lane.width * 0.9, shape.head, 6);
        ctx.fill();
        const noteInk = note.fit === 'exact' ? ink.exact : ink.folded;
        if (shape.label === 'full') drawNoteLabel(ctx, note.tongue, lane.centre, y, noteInk);
        else {
          const { above, below } = tongueNumberParts(note.tongue);
          drawMarked(ctx, note.tongue.letter, above, below, lane.centre, y, noteInk, note.tongue.accidental);
        }
      }
    },
  };
}
