import { KALIMBA_21, retune } from './layout';
import { canvasHighway } from './practice/highway';
import { mountPractice } from './practice/practice-view';
import { SONGS } from './songs';
import { KLANG_STORAGE_KEY, parseStoredKlang, type KlangValues } from './sound/klang';
import { mountKlangPanel } from './sound/klang-panel';
import { ModularPlayer } from './sound/player';
import { SongPlayer } from './practice/song-player';

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
// a retuning lasts the visit: each starts in the standard tuning
const sound = new ModularPlayer(klang, KALIMBA_21);
const app = document.querySelector<HTMLElement>('#app')!;
const practice = mountPractice(app, {
  tongues: KALIMBA_21,
  sound,
  songs: SONGS,
  highway: canvasHighway,
  onTuningChange: (halfSteps) => sound.setTongues(retune(KALIMBA_21, halfSteps)),
  metronome: sound,
  // listening and playing along: the song on the clock, as stim-garden's clip player plays a clip, its notes and clicks ahead of time
  songPlayer: new SongPlayer(sound),
});
// the kalimba's body a bonnet over its sound: a few macros, heard as they move, kept in the browser
mountKlangPanel(app.querySelector<HTMLElement>('.stage .kalimba')!, {
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
