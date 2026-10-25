import { afterEach, describe, expect, it, vi } from "vitest";
import { type KeySound, keyPitch, type SoundLayer, strokeLayers } from "./keyboard-sound";

/** A centre key of the front row of the main grid. */
const csharp: KeySound = { id: "csharp", category: "backend", x: 0, y: 1, small: false };
/** No jitter: random() in the middle of its range. */
const steady = () => 0.5;

const kinds = (layers: SoundLayer[]) =>
  layers.map((layer) => `${layer.kind}:${"filter" in layer ? layer.filter : "sine"}`);
const first = (layers: SoundLayer[]) => {
  const layer = layers[0];
  if (layer?.kind !== "noise") throw new Error("The first layer is not noise.");
  return layer;
};

describe("keyPitch", () => {
  it("gives every key its own pitch, the same each time", () => {
    expect(keyPitch("csharp")).toBe(keyPitch("csharp"));
    expect(keyPitch("csharp")).not.toBe(keyPitch("react"));
  });

  it.each(["csharp", "react", "dotnet", "postgresql", "", "ک"])(
    "stays within ±8 %% (%s)",
    (seed) => {
      expect(keyPitch(seed)).toBeGreaterThanOrEqual(0.92);
      expect(keyPitch(seed)).toBeLessThanOrEqual(1.08);
    },
  );
});

describe("strokeLayers", () => {
  it("gives every category its own switch", () => {
    const press = (category: KeySound["category"]) =>
      strokeLayers("down", { ...csharp, category }, steady);

    // Blue and Box Navy click (noise + metallic tone + bottom-out); Brown bumps; Red is a low-passed thock + resonance.
    expect(kinds(press("backend"))).toEqual(["noise:bandpass", "tone:sine", "noise:bandpass"]);
    expect(kinds(press("frontend"))).toEqual(["noise:bandpass", "noise:bandpass"]);
    expect(kinds(press("database"))).toEqual(["noise:lowpass", "tone:sine"]);
    expect(kinds(press("devops"))).toEqual(["noise:bandpass", "tone:sine", "noise:bandpass"]);
    // Box Navy's click bar: louder and lower than a Blue's click.
    expect(first(press("devops")).gain).toBeGreaterThan(first(press("backend")).gain);
    expect(first(press("devops")).frequency).toBeLessThan(first(press("backend")).frequency);
  });

  it("clicks again on release only for the clicky switches", () => {
    const release = (category: KeySound["category"]) =>
      strokeLayers("up", { ...csharp, category }, steady);

    expect(release("backend")).toHaveLength(2);
    expect(release("devops")).toHaveLength(2);
    expect(release("frontend")).toHaveLength(1);
    expect(release("database")).toHaveLength(1);
    expect(first(release("frontend")).gain).toBeLessThan(first(release("backend")).gain);
  });

  it("makes edge keys hollower than centre keys: longer, more resonant, a little lower", () => {
    const centre = first(strokeLayers("down", csharp, steady));
    const edge = first(strokeLayers("down", { ...csharp, x: -1 }, steady));

    expect(edge.decay).toBeGreaterThan(centre.decay);
    expect(edge.q).toBeGreaterThan(centre.q);
    expect(edge.frequency).toBeLessThan(centre.frequency);
  });

  it("makes back rows brighter and the small keys higher", () => {
    const front = first(strokeLayers("down", csharp, steady));
    const back = first(strokeLayers("down", { ...csharp, y: 0 }, steady));
    const small = first(strokeLayers("down", { ...csharp, small: true }, steady));

    expect(back.frequency).toBeGreaterThan(front.frequency);
    expect(small.frequency).toBeGreaterThan(front.frequency);
  });

  it("varies every press a little: timing, filter, decay and loudness", () => {
    const low = strokeLayers("down", csharp, () => 0);
    const high = strokeLayers("down", csharp, () => 1);
    const steadyPress = strokeLayers("down", csharp, steady);

    for (const press of [low, high]) {
      expect(first(press).frequency).not.toBe(first(steadyPress).frequency);
      expect(first(press).decay).not.toBe(first(steadyPress).decay);
      expect(first(press).gain).not.toBe(first(steadyPress).gain);
      expect(press[2]?.delay).not.toBe(steadyPress[2]?.delay);
    }
    // The stroke itself is never early or late; only the later layers drift.
    expect(low[0]?.delay).toBe(0);
    expect(high[0]?.delay).toBe(0);
  });
});

describe("playKeySound", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    document.documentElement.removeAttribute("data-sound");
  });

  /** A minimal Web Audio stand-in that counts started sources. */
  function fakeAudio() {
    const started = { count: 0 };
    const param = () => ({
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    });
    const node = () => ({ connect: (next: unknown) => next });
    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      sampleRate = 8000;
      destination = node();
      createDynamicsCompressor = node;
      createGain = () => ({ ...node(), gain: param() });
      createBiquadFilter = () => ({ ...node(), type: "", frequency: param(), Q: param() });
      createBuffer = (_: number, length: number) => ({
        duration: 0.5,
        getChannelData: () => new Float32Array(length),
      });
      createBufferSource = () => ({
        ...node(),
        buffer: null,
        start: () => started.count++,
        stop: vi.fn(),
      });
      createOscillator = () => ({
        ...node(),
        type: "",
        frequency: param(),
        start: () => started.count++,
        stop: vi.fn(),
      });
      resume = vi.fn();
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    return started;
  }

  function activate(hasBeenActive: boolean) {
    vi.stubGlobal("navigator", { ...navigator, userActivation: { hasBeenActive } });
  }

  it("plays the press layers once the visitor has interacted with the page", async () => {
    const started = fakeAudio();
    activate(true);
    const { playKeySound } = await import("./keyboard-sound");

    playKeySound("down", csharp);

    expect(started.count).toBe(3);
  });

  it("stays silent before any interaction (browsers would block it anyway)", async () => {
    const started = fakeAudio();
    activate(false);
    const { playKeySound } = await import("./keyboard-sound");

    playKeySound("down", csharp);

    expect(started.count).toBe(0);
  });

  it("stays silent when muted", async () => {
    const started = fakeAudio();
    activate(true);
    document.documentElement.setAttribute("data-sound", "off");
    const { playKeySound } = await import("./keyboard-sound");

    playKeySound("up", csharp);

    expect(started.count).toBe(0);
  });
});
