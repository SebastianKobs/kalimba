import type { KalimbaHandle } from '../kalimba-view';
import type { Tongue } from '../layout';
import { tongueNumberParts } from '../tuning';
import type { Highway } from './practice-view';
import type { PracticeSession } from './session';

const PIXELS_PER_BEAT = 64;
const NOTE_HEIGHT = 34;
const FONT_SIZE = 11;

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

      const origin = canvas.getBoundingClientRect().left;
      const lanes = kalimba.tongueElements.map((el) => {
        const r = el.getBoundingClientRect();
        return { centre: r.left - origin + r.width / 2, width: r.width };
      });
      const hitY = height - NOTE_HEIGHT / 2 - 2;
      const colours = {
        lane: cssColour(canvas, '--lane', '#ffffff14'),
        grid: cssColour(canvas, '--grid', '#ffffff10'),
        hit: cssColour(canvas, '--accent', '#ffcf6b'),
        exact: cssColour(canvas, '--note', '#ffcf6b'),
        folded: cssColour(canvas, '--note-octave', '#8fd3ff'),
        label: cssColour(canvas, '--note-label', '#1c1c1c'),
        octaveMark: cssColour(canvas, '--octave', '#1a4fa0'),
      };

      ctx.fillStyle = colours.lane;
      lanes.forEach((l) => ctx.fillRect(l.centre - l.width / 2, 0, l.width, height));
      ctx.fillStyle = colours.hit;
      ctx.fillRect(0, hitY - 1, width, 2);
      if (!session) return;

      // one faint line per beat, so rhythm reads as spacing
      const now = session.beat;
      ctx.fillStyle = colours.grid;
      for (let b = Math.ceil(now); (b - now) * PIXELS_PER_BEAT < height; b++) {
        ctx.fillRect(0, hitY - (b - now) * PIXELS_PER_BEAT, width, 1);
      }

      ctx.textBaseline = 'middle';
      for (const note of session.upcoming()) {
        const y = hitY - (note.beat - now) * PIXELS_PER_BEAT;
        if (y < -NOTE_HEIGHT) break; // sorted by onset: the rest is further up
        const lane = lanes[note.tongue.index];
        const fill = note.fit === 'exact' ? colours.exact : colours.folded;
        const tail = note.beats * PIXELS_PER_BEAT - NOTE_HEIGHT / 2;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = fill;
        if (tail > 0) ctx.fillRect(lane.centre - 2, y - tail, 4, tail);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.roundRect(lane.centre - lane.width * 0.45, y - NOTE_HEIGHT / 2, lane.width * 0.9, NOTE_HEIGHT, 6);
        ctx.fill();
        drawNoteLabel(ctx, note.tongue, lane.centre, y, { label: colours.label, octave: colours.octaveMark });
      }
    },
  };
}
