import './style.css';
import { WebAudioPlucker } from './audio';
import { KALIMBA_21 } from './layout';
import { canvasHighway } from './practice/highway';
import { mountPractice } from './practice/practice-view';
import { SONGS } from './songs';
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

const sound = new WebAudioPlucker();
const practice = mountPractice(document.querySelector<HTMLElement>('#app')!, {
  tongues: KALIMBA_21,
  sound,
  songs: SONGS,
  highway: canvasHighway,
  tuning: loadTuning(),
  onTuningChange: saveTuning,
  metronome: sound,
});

// audio may only start after a user gesture; render all tines on the first one
const prepareOnce = () => sound.prepare(KALIMBA_21);
document.addEventListener('pointerdown', prepareOnce, { once: true });
document.addEventListener('keydown', prepareOnce, { once: true });

let last = performance.now();
const frame = (now: number) => {
  practice.tick(Math.min(0.1, (now - last) / 1000)); // cap: a background tab must not skip the song
  last = now;
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
