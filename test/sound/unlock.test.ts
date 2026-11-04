// @vitest-environment jsdom
import { unlockAudio } from '../../src/sound/unlock';

// an audio context as iOS keeps it: suspended until a tap it accepts resumes it; what it was asked to play
function fakeContext(state: AudioContextState | 'interrupted' = 'suspended') {
  const asked = { resumes: 0, silent: 0 };
  const context = {
    state,
    currentTime: 0,
    destination: {},
    resume: () => {
      asked.resumes++;
      return Promise.resolve();
    },
    createBuffer: () => ({}),
    createBufferSource: () => ({ buffer: null, connect: () => undefined, start: () => asked.silent++ }),
  };
  return { context, asked };
}

const tap = (type: string) => document.dispatchEvent(new Event(type, { bubbles: true }));

describe('unlockAudio', () => {
  it('starts the audio on each tap or key iOS accepts: resumed, and a silent sample played, which is what opens it there', () => {
    for (const type of ['touchend', 'click', 'pointerup', 'pointerdown', 'keydown']) {
      const { context, asked } = fakeContext();
      const stop = unlockAudio(document, () => context as unknown as AudioContext);
      tap(type);
      expect(asked, type).toEqual({ resumes: 1, silent: 1 });
      stop();
    }
  });

  it('resumes one iOS calls interrupted too, not only suspended', () => {
    const { context, asked } = fakeContext('interrupted');
    const stop = unlockAudio(document, () => context as unknown as AudioContext);
    tap('touchend');
    expect(asked.resumes).toBe(1);
    stop();
  });

  it('keeps trying on later taps while the audio isn’t running, and stops listening once it is', () => {
    const { context, asked } = fakeContext();
    unlockAudio(document, () => context as unknown as AudioContext);
    tap('pointerdown'); // iOS ignores this one: still suspended
    tap('touchend');
    expect(asked.resumes).toBe(2);
    context.state = 'running';
    tap('click'); // running now: it lets go
    tap('touchend');
    expect(asked.resumes).toBe(2);
  });
});
