// ---------- build/web-audio-engine: the Web Audio builder run in a browser, on the one clock ----------
// libs/modular-audio/build/web-audio/ builds a plan into any audio context; this makes the context and runs it:
//   - context.ts: the audio context a plan is built in, made at a low latency, on a clock;
//   - power.ts: the audio's power: started, what's built into the output, the clock on its time;
//     the output faded out and the context suspended, and back on;
//   - engine-building.ts: the Web Audio builder in the engine's context, its buffers shared.
export { ClockedContext, type ClockedContextOptions } from './context.ts';
export { AudioPower, STOP_AFTER, type BrowserAudio, type EngineOnceStarted } from './power.ts';
export { EngineBuilding, buildingIn, type BuildingIn } from './engine-building.ts';
