// the taps and keys a browser lets start audio: iOS takes touchend, click and pointerup, not pointerdown; the rest take any
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Edge: starts the audio on the first tap or key a browser accepts for it, and keeps trying on later ones until it runs. iOS creates a
 * context suspended (or interrupted) and only lets one run from inside such a tap; a silent sample played there is what opens its audio.
 * contextFor: the audio context, made if it isn't yet. Returns a stop, for when the page lets go.
 */
export function unlockAudio(target: EventTarget, contextFor: () => AudioContext): () => void {
  const stop = () => GESTURES.forEach((type) => target.removeEventListener(type, unlock, true));
  function unlock(): void {
    const context = contextFor();
    if (context.state === 'running') {
      stop();
      return;
    }
    void context.resume();
    const silence = context.createBufferSource();
    silence.buffer = context.createBuffer(1, 1, 22050);
    silence.connect(context.destination);
    silence.start(0);
  }
  // capturing: before the press's own handler, so a note it plays finds the audio already asked to start
  GESTURES.forEach((type) => target.addEventListener(type, unlock, true));
  return stop;
}
