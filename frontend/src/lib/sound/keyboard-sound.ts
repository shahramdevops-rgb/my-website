import { soundEnabled } from "./sound-preference";

// The keyboard hero's mechanical-key sound (P3-T9), synthesized with the Web Audio API instead of recorded samples:
// no audio files to download or license, a different sound for every key, and every press slightly different, like
// a real board. The character is a clicky switch like a Cherry MX Blue (Shahram's choice, 2026-10-25); a press is
// three short layers (all values below are the knobs to tune it):
//   click — the click jacket snapping: high band-passed noise, under 10 ms;
//   tick  — the click's metallic edge: a high tone sliding down;
//   clack — the keycap bottoming out ~14 ms later: mid band-passed noise.
// A release clicks again, softer. Nothing is ever started without a pointer or key event of the visitor's.

export type KeyStroke = "down" | "up";

type Engine = { context: AudioContext; output: GainNode; noise: AudioBuffer };

let engine: Engine | undefined;

/**
 * Each key's own pitch factor (0.92–1.08), the same every time: on a real keyboard the position and the switch make
 * each key sound a little different. A string hash, so it works for any key id.
 */
export function keyPitch(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return 1 + ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.16;
}

/**
 * Plays one stroke of the key `seed`. Silent when the visitor muted it, when the browser has no Web Audio, and before
 * the visitor's first click, tap or key press on the page: browsers allow sound only after such an interaction
 * (hovering doesn't count), and creating the audio engine earlier would only log a warning.
 */
export function playKeySound(stroke: KeyStroke, seed: string): void {
  if (!soundEnabled()) return;
  const audio = getEngine();
  if (!audio) return;

  // ±2 % at random on top of the key's own pitch: no two presses identical.
  const pitch = keyPitch(seed) * (1 + (Math.random() - 0.5) * 0.04);
  // A few milliseconds ahead, so every layer starts on the same audio frame.
  const at = audio.context.currentTime + 0.005;

  if (stroke === "down") {
    // The click jacket snapping at the actuation point: short, bright, the "click" of a Blue switch.
    noiseBurst(audio, at, {
      type: "bandpass",
      frequency: 5200 * pitch,
      q: 3,
      gain: 0.8,
      decay: 0.009,
    });
    // Its metallic edge: a high tick that slides down a little.
    tone(audio, at, { from: 3400 * pitch, to: 2700 * pitch, gain: 0.22, decay: 0.014 });
    // The keycap bottoming out a moment later (the rest of the travel): a mid plastic clack, not a bass thud.
    noiseBurst(audio, at + 0.014, {
      type: "bandpass",
      frequency: 1900 * pitch,
      q: 1.1,
      gain: 0.4,
      decay: 0.03,
    });
  } else {
    // A Blue clicks on the way up too (the jacket resetting), a little softer and higher.
    noiseBurst(audio, at, {
      type: "bandpass",
      frequency: 4400 * pitch,
      q: 2.5,
      gain: 0.45,
      decay: 0.008,
    });
    tone(audio, at, { from: 2900 * pitch, to: 2400 * pitch, gain: 0.12, decay: 0.01 });
  }
}

function getEngine(): Engine | undefined {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  if (activation && !activation.hasBeenActive) return undefined;
  if (typeof AudioContext === "undefined") return undefined;

  if (!engine) {
    const context = new AudioContext({ latencyHint: "interactive" });
    // Fast typing stacks many sounds at once; the compressor keeps the sum from clipping.
    const compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    const output = context.createGain();
    output.gain.value = 0.5;
    output.connect(compressor);
    engine = { context, output, noise: whiteNoise(context) };
  }

  // A context made before (or kept across) a pause may be suspended; after a user activation it may resume.
  if (engine.context.state === "suspended") void engine.context.resume();
  return engine;
}

/** Half a second of white noise, made once; each burst starts at a random offset into it. */
function whiteNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A gain that rises in 1 ms and dies away exponentially: the shape of a hit. */
function hitEnvelope(context: AudioContext, at: number, gain: number, decay: number): GainNode {
  const envelope = context.createGain();
  // Exponential ramps can't start from or reach 0; 0.0001 is silence to the ear.
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.001);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  return envelope;
}

function noiseBurst(
  { context, output, noise }: Engine,
  at: number,
  layer: { type: BiquadFilterType; frequency: number; q: number; gain: number; decay: number },
): void {
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = layer.type;
  filter.frequency.value = layer.frequency;
  filter.Q.value = layer.q;

  source
    .connect(filter)
    .connect(hitEnvelope(context, at, layer.gain, layer.decay))
    .connect(output);
  source.start(at, Math.random() * (noise.duration - 0.1));
  // Stopped nodes are disconnected and garbage-collected by the browser.
  source.stop(at + layer.decay + 0.01);
}

function tone(
  { context, output }: Engine,
  at: number,
  layer: { from: number; to: number; gain: number; decay: number },
): void {
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(layer.from, at);
  oscillator.frequency.exponentialRampToValueAtTime(layer.to, at + layer.decay);

  oscillator.connect(hitEnvelope(context, at, layer.gain, layer.decay)).connect(output);
  oscillator.start(at);
  oscillator.stop(at + layer.decay + 0.01);
}
