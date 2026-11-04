// ---------- build/web-audio/output: the output after what's built ----------
// A gain of its own into where the sound goes, between what's built and the speakers:
//   - from silence, faded in, so no sound starts at full volume;
//   - faded out quickly, to pause: switching the audio off once it's quiet is its owner's;
//   - faded in again, from where the fade got to, or from silence once the audio was off.
// The volume is the master's fader's, not the output's: this only fades.
// Kept awake: a silent source runs into it from the start. Firefox skips a glide on a gain
// nothing has gone through yet, so the first sound to come came at full volume.
import { restartAt } from '../../../base/automation/index.ts';
import { automate } from './automation.ts';

export const FADE_IN = 0.25; // s, a time constant
export const FADE_OUT = 0.08; // s, a time constant

export class Output {
  readonly node: GainNode; // where what's built goes in
  readonly #context: BaseAudioContext;

  constructor(context: BaseAudioContext) {
    this.#context = context;
    this.node = context.createGain();
    this.node.gain.value = 0;
    this.node.connect(context.destination);
    const awake = context.createConstantSource();
    awake.offset.value = 0;
    awake.connect(this.node);
    awake.start();
    this.fadeIn();
  }
  fadeOut(): void {
    automate(this.node.gain, [['target', 0, 0, FADE_OUT]], this.#context.currentTime);
  }
  // fromSilence: the audio was off, so from 0; otherwise from where the fade got to
  fadeIn({ fromSilence = false }: { fromSilence?: boolean } = {}): void {
    const restart = fromSilence ? restartAt(0, 0) : [];
    automate(this.node.gain, [...restart, ['target', 1, 0, FADE_IN]], this.#context.currentTime);
  }
}
