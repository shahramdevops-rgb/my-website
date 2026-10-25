import type { TechCategory } from "@/lib/keyboard/keycaps";
import { soundEnabled } from "./sound-preference";

// The keyboard hero's mechanical-key sound (P3-T9), synthesized with the Web Audio API instead of recorded samples:
// no audio files to download or license, a different sound for every key, and every press slightly different, like
// a real board. Since P3-T13 each category has its own switch, as on a board built from mixed switches:
//   backend  = Blue      clicky: the click jacket snaps, a metallic tick, then the keycap bottoms out;
//   frontend = Brown     tactile: a soft bump, no click, a gentle clack;
//   database = Red       linear: no bump, no click, only a deep "thock" from the keycap and the plate;
//   devops   = Box Navy  heavy and loud: a thick click bar, lower and longer than a Blue.
// Every value below is a knob to retune by ear. A press is a few short layers:
//   noise — band- or low-passed white noise: clicks, clacks and thocks;
//   tone  — a sine sliding in pitch: the click's metallic edge, or the case's low resonance.
// Nothing is ever started without a pointer or key event of the visitor's.

export type KeyStroke = "down" | "up";

/** Band- or low-passed noise burst. `delay` in seconds after the stroke, `decay` its length. */
type NoiseLayer = {
  kind: "noise";
  delay: number;
  filter: BiquadFilterType;
  frequency: number;
  q: number;
  gain: number;
  decay: number;
};

/** A sine sliding from `from` to `to` Hz. */
type ToneLayer = {
  kind: "tone";
  delay: number;
  from: number;
  to: number;
  gain: number;
  decay: number;
};

export type SoundLayer = NoiseLayer | ToneLayer;

type SwitchProfile = Record<KeyStroke, SoundLayer[]>;

export const switchProfiles: Record<TechCategory, SwitchProfile> = {
  // Cherry MX Blue (P3-T9's sound): a bright click at the actuation point, its metallic edge, the bottom-out 14 ms
  // later. It clicks on the way up too (the jacket resetting), a little softer and higher.
  backend: {
    down: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 5200,
        q: 3,
        gain: 0.8,
        decay: 0.009,
      },
      { kind: "tone", delay: 0, from: 3400, to: 2700, gain: 0.22, decay: 0.014 },
      {
        kind: "noise",
        delay: 0.014,
        filter: "bandpass",
        frequency: 1900,
        q: 1.1,
        gain: 0.4,
        decay: 0.03,
      },
    ],
    up: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 4400,
        q: 2.5,
        gain: 0.45,
        decay: 0.008,
      },
      { kind: "tone", delay: 0, from: 2900, to: 2400, gain: 0.12, decay: 0.01 },
    ],
  },
  // Brown: the tactile bump is a dull, short knock (no click jacket); then a rounder clack than a Blue's.
  // Released, only a soft tick of the stem returning.
  frontend: {
    down: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 1400,
        q: 1.4,
        gain: 0.3,
        decay: 0.012,
      },
      {
        kind: "noise",
        delay: 0.012,
        filter: "bandpass",
        frequency: 1650,
        q: 0.9,
        gain: 0.45,
        decay: 0.034,
      },
    ],
    up: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 2600,
        q: 1.5,
        gain: 0.16,
        decay: 0.008,
      },
    ],
  },
  // Red: linear, so the whole sound is the bottom-out — low-passed noise for the keycap hitting the plate and a
  // low sine for the case resonating: the "thock". Released, a soft tick.
  database: {
    down: [
      {
        kind: "noise",
        delay: 0.006,
        filter: "lowpass",
        frequency: 750,
        q: 0.8,
        gain: 0.6,
        decay: 0.05,
      },
      { kind: "tone", delay: 0.006, from: 190, to: 120, gain: 0.3, decay: 0.055 },
    ],
    up: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 2100,
        q: 1.2,
        gain: 0.13,
        decay: 0.007,
      },
    ],
  },
  // Kailh Box Navy: a thick click bar — louder, lower and longer than a Blue's click — and a heavy bottom-out.
  // It clicks on the way up too.
  devops: {
    down: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 3600,
        q: 2.5,
        gain: 1,
        decay: 0.012,
      },
      { kind: "tone", delay: 0, from: 2200, to: 1700, gain: 0.3, decay: 0.018 },
      {
        kind: "noise",
        delay: 0.018,
        filter: "bandpass",
        frequency: 1300,
        q: 1,
        gain: 0.55,
        decay: 0.04,
      },
    ],
    up: [
      {
        kind: "noise",
        delay: 0,
        filter: "bandpass",
        frequency: 3200,
        q: 2.2,
        gain: 0.7,
        decay: 0.011,
      },
      { kind: "tone", delay: 0, from: 2000, to: 1600, gain: 0.18, decay: 0.014 },
    ],
  },
};

/** Which key sounds: what makes one key of the board sound different from the next. */
export type KeySound = {
  /** The keycap's id: its own fixed pitch (`keyPitch`). */
  id: string;
  category: TechCategory;
  /** Across the plate: -1 left edge, 0 centre, 1 right edge (keyPosition). */
  x: number;
  /** Front to back: 0 back row, 1 front row. */
  y: number;
  /** The shallower "also used" keys. */
  small: boolean;
};

// How much each property of a key changes its sound.
/** Edge keys sound hollower: the plate flexes and rings more there. */
const edgeRing = { decay: 0.3, q: 0.4, frequency: -0.06 };
/** Rows toward the back sound a little brighter (the case is open above them). */
const backBrightness = 0.08;
/** Shallower keycaps resonate higher. */
const smallKeyPitch = 1.06;
/** Per press, at random: ± this share of timing (ms), filter frequency, decay and gain. */
const jitter = { delayMs: 2, frequency: 0.04, decay: 0.1, gain: 0.08 };

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
 * The layers one stroke of `key` plays, with every per-key and per-press change applied. Pure (the randomness is a
 * parameter), so tests can compare categories and positions; `random` = () => 0.5 means no jitter.
 */
export function strokeLayers(
  stroke: KeyStroke,
  key: KeySound,
  random: () => number = Math.random,
): SoundLayer[] {
  const spread = (share: number) => 1 + (random() - 0.5) * 2 * share;
  const edge = Math.min(1, Math.abs(key.x));
  const pitch =
    keyPitch(key.id) *
    (1 + edgeRing.frequency * edge) *
    (1 + backBrightness * (1 - key.y)) *
    (key.small ? smallKeyPitch : 1);
  const ring = 1 + edgeRing.decay * edge;

  return switchProfiles[key.category][stroke].map((layer, index): SoundLayer => {
    // The first layer is the moment of the stroke; only the later ones drift in time.
    const delay = Math.max(
      0,
      layer.delay + (index === 0 ? 0 : (random() - 0.5) * 2 * jitter.delayMs * 0.001),
    );
    const decay = layer.decay * ring * spread(jitter.decay);
    const gain = layer.gain * spread(jitter.gain);
    if (layer.kind === "tone") {
      const shift = pitch * spread(jitter.frequency);
      return { ...layer, delay, decay, gain, from: layer.from * shift, to: layer.to * shift };
    }
    return {
      ...layer,
      delay,
      decay,
      gain,
      frequency: layer.frequency * pitch * spread(jitter.frequency),
      q: layer.q * (1 + edgeRing.q * edge),
    };
  });
}

type Engine = { context: AudioContext; output: GainNode; noise: AudioBuffer };

let engine: Engine | undefined;

/**
 * Plays one stroke of `key`. Silent when the visitor muted it, when the browser has no Web Audio, and before the
 * visitor's first click, tap or key press on the page: browsers allow sound only after such an interaction
 * (hovering doesn't count), and creating the audio engine earlier would only log a warning.
 */
export function playKeySound(stroke: KeyStroke, key: KeySound): void {
  if (!soundEnabled()) return;
  const audio = getEngine();
  if (!audio) return;

  // A few milliseconds ahead, so every layer starts on the same audio frame.
  const at = audio.context.currentTime + 0.005;
  for (const layer of strokeLayers(stroke, key)) {
    if (layer.kind === "noise") noiseBurst(audio, at + layer.delay, layer);
    else tone(audio, at + layer.delay, layer);
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

function noiseBurst({ context, output, noise }: Engine, at: number, layer: NoiseLayer): void {
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = layer.filter;
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

function tone({ context, output }: Engine, at: number, layer: ToneLayer): void {
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(layer.from, at);
  oscillator.frequency.exponentialRampToValueAtTime(layer.to, at + layer.decay);

  oscillator.connect(hitEnvelope(context, at, layer.gain, layer.decay)).connect(output);
  oscillator.start(at);
  oscillator.stop(at + layer.decay + 0.01);
}
