// ---------- libs/modular-audio/build/web-audio/buffers: the buffers a noise or a reverb plays, their samples ----------
// Their samples are pure, one array a channel, made with rand() (Math.random, or a seeded one in tests).
// Each buffer is made once, when it's first asked for (Buffers).
// noise: so many seconds of white noise, one channel (a noise block's 'noise', 2 s, and 'breath', 0.2 s).
// impulse: a reverb's impulse response, two channels of noise that darkens as it decays: a lowpass on it closes over its length, and
// it fades as (1 − t)^2.5

export function noise(seconds: number, sampleRate: number, rand: () => number): [Float32Array] {
  const samples = new Float32Array(Math.floor(sampleRate * seconds));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = rand() * 2 - 1;
  }
  return [samples];
}
export function impulse(seconds: number, sampleRate: number, rand: () => number): [Float32Array, Float32Array] {
  const len = Math.floor(sampleRate * seconds);
  const side = () => {
    const samples = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (rand() * 2 - 1 - lp) * (0.35 - 0.3 * t); // the tail gets darker over time
      samples[i] = lp * Math.pow(1 - t, 2.5);
    }
    return samples;
  };
  return [side(), side()];
}

// the buffers in a context, each made once, by what it is and how long, when it's first asked for
export class Buffers {
  readonly #context: BaseAudioContext;
  readonly #random: () => number;
  readonly #made = new Map<string, AudioBuffer>();

  constructor(context: BaseAudioContext, random: () => number) {
    this.#context = context;
    this.#random = random;
  }
  // so many seconds of white noise
  noise(seconds: number): AudioBuffer {
    return this.#once(`noise ${seconds}`, (sampleRate) => noise(seconds, sampleRate, this.#random));
  }
  // a reverb's impulse response, so many seconds long
  impulse(seconds: number): AudioBuffer {
    return this.#once(`impulse ${seconds}`, (sampleRate) => impulse(seconds, sampleRate, this.#random));
  }

  // a buffer by its key, made from its samples the first time
  #once(key: string, samplesAt: (sampleRate: number) => Float32Array[]): AudioBuffer {
    const made = this.#made.get(key);
    if (made) {
      return made;
    }
    const sampleRate = this.#context.sampleRate;
    const channels = samplesAt(sampleRate);
    const audioBuffer = this.#context.createBuffer(channels.length, channels[0]!.length, sampleRate); // one channel at least
    channels.forEach((samples, channel) => audioBuffer.getChannelData(channel).set(samples));
    this.#made.set(key, audioBuffer);
    return audioBuffer;
  }
}
