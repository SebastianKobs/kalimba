import type { Plucker } from './kalimba-view';
import type { Tongue } from './layout';
import { renderClick, renderTine } from './synth';

const VOICE_SECONDS = 4.5; // longest tine (F3) is 60 dB down after ~3 s
const TAIL_FADE_SECONDS = 0.5;
// re-plucking a ringing tine damps it first; short ramp avoids a click
const DAMP_SECONDS = 0.02;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** Edge: turns plucks into sound via Web Audio. One voice per tongue, polyphonic across tongues. */
export class WebAudioPlucker implements Plucker {
  private context?: AudioContext;
  private master?: AudioNode;
  // buffers by pitch, voices by place: a retuned tongue is a new object but the same tine
  private readonly buffers = new Map<number, AudioBuffer>();
  private readonly voices = new Map<number, Voice>();
  private readonly clicks = new Map<boolean, AudioBuffer>();

  pluck(tongue: Tongue): void {
    const context = this.ensureContext();
    this.damp(tongue, context.currentTime);
    const source = context.createBufferSource();
    source.buffer = this.bufferFor(tongue, context);
    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(1, now + VOICE_SECONDS - TAIL_FADE_SECONDS);
    gain.gain.linearRampToValueAtTime(0, now + VOICE_SECONDS);
    source.connect(gain).connect(this.master!);
    source.start(now);
    const voice = { source, gain };
    this.voices.set(tongue.index, voice);
    source.onended = () => {
      if (this.voices.get(tongue.index) === voice) this.voices.delete(tongue.index);
      gain.disconnect();
    };
  }

  /** A metronome tick, the first beat of a bar accented; straight to the master, no voice. */
  click(accent: boolean): void {
    const context = this.ensureContext();
    let buffer = this.clicks.get(accent);
    if (!buffer) {
      const samples = renderClick(context.sampleRate, accent);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      this.clicks.set(accent, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master!);
    source.start();
  }

  /** Render all tongues ahead of time so the first pluck of each has no latency. */
  prepare(tongues: readonly Tongue[]): void {
    const context = this.ensureContext();
    tongues.forEach((t) => this.bufferFor(t, context));
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      const level = this.context.createGain();
      level.gain.value = 0.5; // headroom for chords
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 12;
      level.connect(limiter).connect(this.context.destination);
      this.master = level;
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private bufferFor(tongue: Tongue, context: AudioContext): AudioBuffer {
    const cached = this.buffers.get(tongue.frequency);
    if (cached) return cached;
    const samples = renderTine(tongue.frequency, context.sampleRate, VOICE_SECONDS);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.buffers.set(tongue.frequency, buffer);
    return buffer;
  }

  private damp(tongue: Tongue, now: number): void {
    const voice = this.voices.get(tongue.index);
    if (!voice) return;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + DAMP_SECONDS);
    voice.source.stop(now + DAMP_SECONDS);
    this.voices.delete(tongue.index);
  }
}
