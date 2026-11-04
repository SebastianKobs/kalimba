import './style.css';
import { WebAudioPlucker } from './audio';
import { mountKalimba } from './kalimba-view';
import { KALIMBA_21 } from './layout';

const plucker = new WebAudioPlucker();
mountKalimba(document.querySelector<HTMLElement>('#app')!, KALIMBA_21, plucker);

// audio may only start after a user gesture; render all tines on the first one
const prepareOnce = () => plucker.prepare(KALIMBA_21);
document.addEventListener('pointerdown', prepareOnce, { once: true });
document.addEventListener('keydown', prepareOnce, { once: true });
