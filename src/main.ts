import './style.css';
import { KALIMBA_21, retune } from './layout';
import { canvasHighway } from './practice/highway';
import { mountPractice } from './practice/practice-view';
import { SONGS } from './songs';
import { KLANG_STORAGE_KEY, parseStoredKlang, type KlangValues } from './sound/klang';
import { mountKlangPanel } from './sound/klang-panel';
import { ModularPlayer } from './sound/player';
import { parseStoredTuning, TUNING_STORAGE_KEY } from './stored-tuning';

// storage may be blocked (private window, previews): the kalimba then starts in standard tuning
function loadTuning(): number[] | undefined {
  try {
    return parseStoredTuning(localStorage.getItem(TUNING_STORAGE_KEY), KALIMBA_21.length);
  } catch {
    return undefined;
  }
}

function saveTuning(halfSteps: readonly number[]): void {
  try {
    localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(halfSteps));
  } catch {
    // not remembered; this session still has it
  }
}

function loadKlang(): KlangValues {
  try {
    return parseStoredKlang(localStorage.getItem(KLANG_STORAGE_KEY));
  } catch {
    return parseStoredKlang(null);
  }
}

function saveKlang(values: KlangValues): void {
  try {
    localStorage.setItem(KLANG_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // not remembered; this session still has it
  }
}

const klang = loadKlang();
const sound = new ModularPlayer(klang, retune(KALIMBA_21, loadTuning() ?? KALIMBA_21.map(() => 0)));
const app = document.querySelector<HTMLElement>('#app')!;
const practice = mountPractice(app, {
  tongues: KALIMBA_21,
  sound,
  songs: SONGS,
  highway: canvasHighway,
  tuning: loadTuning(),
  onTuningChange: (halfSteps) => {
    saveTuning(halfSteps);
    sound.setTongues(retune(KALIMBA_21, halfSteps));
  },
  metronome: sound,
});
// below the kalimba: its sound as a few macros, heard as they move, kept in the browser
mountKlangPanel(app, {
  values: klang,
  onChange: (values) => {
    sound.setKlang(values);
    saveKlang(values);
  },
});

// audio may only start after a user gesture: started on the first one
const prepareOnce = () => sound.prepare();
document.addEventListener('pointerdown', prepareOnce, { once: true });
document.addEventListener('keydown', prepareOnce, { once: true });

let last = performance.now();
const frame = (now: number) => {
  practice.tick(Math.min(0.1, (now - last) / 1000)); // cap: a background tab must not skip the song
  last = now;
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
