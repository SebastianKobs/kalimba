import type { Plucker } from './kalimba-view';
import type { Tongue } from './layout';
import { renderTine } from './synth';

const VOICE_SECONDS = 7;
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
  private readonly buffers = new Map<Tongue, AudioBuffer>();
  private readonly voices = new Map<Tongue, Voice>();

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
    this.voices.set(tongue, voice);
    source.onended = () => {
      if (this.voices.get(tongue) === voice) this.voices.delete(tongue);
      gain.disconnect();
    };
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
    const cached = this.buffers.get(tongue);
    if (cached) return cached;
    const samples = renderTine(tongue.frequency, context.sampleRate, VOICE_SECONDS);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.buffers.set(tongue, buffer);
    return buffer;
  }

  private damp(tongue: Tongue, now: number): void {
    const voice = this.voices.get(tongue);
    if (!voice) return;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + DAMP_SECONDS);
    voice.source.stop(now + DAMP_SECONDS);
    this.voices.delete(tongue);
  }
}
