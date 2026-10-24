import { afterEach, describe, expect, it, vi } from "vitest";
import { keyPitch } from "./keyboard-sound";

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

    playKeySound("down", "csharp");

    expect(started.count).toBe(3);
  });

  it("stays silent before any interaction (browsers would block it anyway)", async () => {
    const started = fakeAudio();
    activate(false);
    const { playKeySound } = await import("./keyboard-sound");

    playKeySound("down", "csharp");

    expect(started.count).toBe(0);
  });

  it("stays silent when muted", async () => {
    const started = fakeAudio();
    activate(true);
    document.documentElement.setAttribute("data-sound", "off");
    const { playKeySound } = await import("./keyboard-sound");

    playKeySound("up", "csharp");

    expect(started.count).toBe(0);
  });
});
