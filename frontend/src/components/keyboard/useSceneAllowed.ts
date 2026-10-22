"use client";

import { useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

let webGlSupport: boolean | undefined;

function probeWebGl(): boolean {
  // No WebGL API at all (very old browsers, and jsdom in tests): don't even try a context.
  if (typeof WebGLRenderingContext === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    // Browsers allow only a few live WebGL contexts; give this test one back at once.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

/** Whether this browser can draw WebGL at all (switched off, blocklisted GPU, old device). Checked once per page. */
function webGlAvailable(): boolean {
  webGlSupport ??= probeWebGl();
  return webGlSupport;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const sceneAllowed = () => !window.matchMedia(reducedMotionQuery).matches && webGlAvailable();

/**
 * Whether the 3D keyboard may replace its poster: WebGL works and the visitor hasn't asked for less motion.
 * The server can't know either, so it says no: the poster is what the first paint shows, and the scene only
 * starts loading after hydration. Turning reduced motion on later brings the poster back.
 */
export function useSceneAllowed(): boolean {
  return useSyncExternalStore(subscribe, sceneAllowed, () => false);
}
