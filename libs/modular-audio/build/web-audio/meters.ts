// ---------- build/web-audio/meters: a meter on a node, its peak read from Web Audio's analysers ----------

// a meter on a node: its peak, the loudest sample of its last window, left or right
export interface PeakMeter {
  peak(): number;
}

const WINDOW = 1024; // samples a meter reads: 21 ms at 48 kHz, a frame's worth down to 48 fps, so few peaks fall between reads

// a meter on a node: a splitter, and an analyser for each side, each reading the last window of samples
export function meterOn(audioContext: BaseAudioContext, node: AudioNode): PeakMeter {
  const split = audioContext.createChannelSplitter(2);
  const sides = [0, 1].map((side) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = WINDOW;
    split.connect(analyser, side);
    return analyser;
  });
  node.connect(split);
  const window = new Float32Array(WINDOW);
  return {
    peak() {
      let peak = 0;
      for (const analyser of sides) {
        analyser.getFloatTimeDomainData(window);
        for (const sample of window) {
          peak = Math.max(peak, Math.abs(sample));
        }
      }
      return peak;
    },
  };
}
