"use client";

import { RoundedBox, useCursor } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  type Group,
  MathUtils,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  NormalBlending,
  type PerspectiveCamera,
  type PointLight,
  SRGBColorSpace,
} from "three";
import { type Keycap, keyboardLayout, keycapsIn } from "@/lib/keyboard/keycaps";
import { currentTheme, defaultTheme, subscribeToTheme, type Theme } from "@/lib/theme/theme";
import { cn } from "@/lib/ui/cn";

// Sizes in scene units (1 = a keycap's depth). The keycap's 8:5 top matches the poster's keycaps.
const keycapWidth = 1.6;
const keycapDepth = 1;
const keycapHeight = 0.42;
/**
 * The "also used" keycaps (P3-T10): as wide as the main ones, in the main grid's columns, so their names are just as
 * readable — but shallower and lower, like a keyboard's function row, so the main stack still leads.
 */
const smallKeycapDepth = 0.7;
const smallKeycapHeight = 0.3;
const keyGap = 0.22;
const casePadding = 0.36;
const caseHeight = 0.5;
/** How far a keycap travels when pushed. */
const pushDepth = 0.14;
/** Share of the view's width the case fills — the poster's keyboard is 88 % of its box too. */
const widthFill = 0.88;

/** For meshes the pointer should pass through (labels, glow): only keycaps answer to it. */
const noRaycast = () => null;

/** A keycap's outer size in scene units. */
type KeycapSize = { width: number; depth: number; height: number };

const mainKeycap: KeycapSize = { width: keycapWidth, depth: keycapDepth, height: keycapHeight };
const smallKeycap: KeycapSize = {
  width: keycapWidth,
  depth: smallKeycapDepth,
  height: smallKeycapHeight,
};

type SceneColors = {
  theme: Theme;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  accent: string;
  sans: string;
  mono: string;
};

/**
 * The scene's colors and fonts come from the same CSS tokens as the rest of the page (globals.css), read again
 * whenever the theme switches — so the keyboard is never a second, hard-coded palette.
 */
function useSceneColors(): SceneColors {
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => defaultTheme);

  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(`--color-${name}`).trim();
    return {
      theme,
      surface: token("surface"),
      surface2: token("surface-2"),
      text: token("text"),
      muted: token("muted"),
      accent: token("accent"),
      // next/font's family lists (src/lib/fonts.ts), with a generic family in case they are missing.
      sans: `${style.getPropertyValue("--font-vazirmatn").trim() || "system-ui"}, sans-serif`,
      mono: `${style.getPropertyValue("--font-jetbrains-mono").trim() || "ui-monospace"}, monospace`,
    };
  }, [theme]);
}

/** Legends are drawn into a 2D canvas, which can't wait for a font: load both faces before the first drawing. */
function useFontsLoaded(sans: string, mono: string): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A font that fails to load still lets the scene start, with the fallback face.
    Promise.allSettled([
      document.fonts.load(`600 48px ${sans}`),
      document.fonts.load(`500 32px ${mono}`),
    ]).then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sans, mono]);

  return loaded;
}

/** Renders only while the stage is on screen; scrolled away, the GPU and battery rest. */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

/**
 * A keycap's legend as a texture: the technology's name, shrunk to fit, and its key in the top-left corner.
 * A 2D canvas instead of a 3D text library: it uses the page's own self-hosted fonts and needs no font download,
 * no worker and no CSP exception.
 */
function drawLegend(
  keycap: Keycap,
  colors: SceneColors,
  active: boolean,
  keycapSize: KeycapSize,
): CanvasTexture {
  const width = 512;
  const height = Math.round((width * keycapSize.depth) / keycapSize.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const context = canvas.getContext("2d");
  if (!context) return texture;
  // The canvas isn't in the page, so it would not inherit dir="ltr"; legends are LTR in both languages.
  context.direction = "ltr";

  // A shallow keycap has a short canvas: its name gets a larger share of the height, so it ends up the same size as
  // a main keycap's name.
  let size = height * (keycap.row === "also" ? 0.42 : 0.3);
  context.font = `600 ${size}px ${colors.sans}`;
  const maxWidth = width * 0.84;
  const measured = context.measureText(keycap.name).width;
  if (measured > maxWidth) {
    size *= maxWidth / measured;
    context.font = `600 ${size}px ${colors.sans}`;
  }
  context.fillStyle = active ? colors.accent : colors.text;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(keycap.name, width / 2, height * (keycap.row === "also" ? 0.6 : 0.56));

  context.font = `500 ${height * 0.17}px ${colors.mono}`;
  context.fillStyle = colors.muted;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(keycap.key, width * 0.07, height * 0.08);

  return texture;
}

type KeycapMeshProps = {
  keycap: Keycap;
  size: KeycapSize;
  position: [number, number];
  active: boolean;
  down: boolean;
  colors: SceneColors;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

function KeycapMesh({
  keycap,
  size,
  position,
  active,
  down,
  colors,
  onHover,
  onSelect,
}: KeycapMeshProps) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const restY = caseHeight / 2 + size.height / 2;

  const legend = useMemo(
    () => drawLegend(keycap, colors, active, size),
    [keycap, colors, active, size],
  );
  // GPU memory isn't garbage-collected: a texture that is replaced must be freed by hand.
  useEffect(() => () => legend.dispose(), [legend]);

  // Every frame, ease toward the target instead of jumping: damp() gives the same speed at 60 and 120 Hz.
  useFrame((_, delta) => {
    if (!group.current || !material.current) return;
    const targetY = down ? restY - pushDepth : restY;
    group.current.position.y = MathUtils.damp(group.current.position.y, targetY, 18, delta);
    material.current.emissiveIntensity = MathUtils.damp(
      material.current.emissiveIntensity,
      active ? 0.28 : 0,
      10,
      delta,
    );
  });

  // A touch has no "over"; a tap is a click and selects (onClick below).
  const isTouch = (event: ThreeEvent<PointerEvent>) => event.nativeEvent.pointerType === "touch";

  return (
    <group ref={group} position={[position[0], restY, position[1]]}>
      <RoundedBox
        args={[size.width, size.height, size.depth]}
        radius={0.1}
        smoothness={4}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (!isTouch(event)) onHover(keycap.id);
        }}
        onPointerOut={(event) => {
          if (!isTouch(event)) onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(keycap.id);
        }}
      >
        <meshStandardMaterial
          ref={material}
          color={colors.surface}
          emissive={colors.accent}
          emissiveIntensity={0}
          roughness={0.55}
        />
      </RoundedBox>
      <mesh
        position={[0, size.height / 2 + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={noRaycast}
      >
        <planeGeometry args={[size.width * 0.92, size.depth * 0.92]} />
        <meshBasicMaterial map={legend} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A soft round spot for the glow under the case: white in the middle, transparent at the edge. */
function createGlowTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/**
 * The "RGB" of a mechanical keyboard, kept soft: a glow spilling out under the case and two colored lights whose
 * hue drifts slowly around the color wheel (one full turn in about half a minute).
 */
function Underglow({ width, depth, theme }: { width: number; depth: number; theme: Theme }) {
  const glow = useRef<MeshBasicMaterial>(null);
  const left = useRef<PointLight>(null);
  const right = useRef<PointLight>(null);
  const texture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    const hue = (clock.elapsedTime / 30) % 1;
    glow.current?.color.setHSL(hue, 0.8, 0.55);
    left.current?.color.setHSL(hue, 0.8, 0.6);
    right.current?.color.setHSL((hue + 1 / 3) % 1, 0.8, 0.6);
  });

  // On a dark page light adds up (additive blending); on a light page it would vanish, so it is painted over.
  const dark = theme === "dark";

  return (
    <>
      <mesh
        position={[0, -caseHeight / 2, -depth * 0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={noRaycast}
      >
        <planeGeometry args={[width * 1.35, depth * 1.6]} />
        <meshBasicMaterial
          ref={glow}
          map={texture}
          transparent
          opacity={dark ? 0.5 : 0.22}
          blending={dark ? AdditiveBlending : NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={left}
        position={[-width / 2, 1.2, depth / 2 + 0.4]}
        intensity={dark ? 5 : 2}
      />
      <pointLight ref={right} position={[width / 2, 1.2, -depth / 2]} intensity={dark ? 5 : 2} />
    </>
  );
}

/**
 * Places the camera so the case fills the same share of the view's width as the poster's keyboard, at every
 * size of the stage, looking down at it from 60° (steep enough for the legends to read easily; was 52° until
 * 2026-10-25). Looking at a point behind the keyboard puts it in the lower
 * part of the view, where the poster has it too, and leaves the top free for the glass card.
 */
function FitCamera({ width, depth }: { width: number; depth: number }) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    const elevation = MathUtils.degToRad(60);
    const halfHorizontalFov = Math.atan(Math.tan(MathUtils.degToRad(perspective.fov / 2)) * aspect);
    const distance = width / 2 / widthFill / Math.tan(halfHorizontalFov) + depth / 2;
    perspective.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    perspective.lookAt(0, 0, -depth * 0.4);
    perspective.updateProjectionMatrix();
  }, [camera, aspect, width, depth]);

  return null;
}

/** A slight tilt toward the pointer, so the keyboard feels like an object on the desk. */
function Tilt({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);

  useFrame(({ pointer }, delta) => {
    if (!group.current) return;
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      -pointer.y * 0.05,
      4,
      delta,
    );
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, pointer.x * 0.08, 4, delta);
  });

  return <group ref={group}>{children}</group>;
}

/** Tells the page once the first frame has been drawn, so the poster fades out only when there is a picture. */
function FirstFrame({ onFirstFrame }: { onFirstFrame: () => void }) {
  const sent = useRef(false);

  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    // useFrame runs just before the frame is drawn; the next animation frame comes after it.
    requestAnimationFrame(onFirstFrame);
  });

  return null;
}

/** If WebGL fails after all (driver crash, context refused), the scene disappears and the poster stays. */
class SceneErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type KeyboardSceneProps = {
  keycaps: Keycap[];
  activeId: string | null;
  downId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onReady: () => void;
  onFailed: () => void;
};

/**
 * The 3D keyboard (React Three Fiber): a case, one keycap per technology in the poster's grid (the main stack, and
 * the smaller "also used" row behind it), soft RGB light.
 * It shows the state KeyboardHero owns (which key is down, whose card is open) and reports pointer input back;
 * it keeps no state of its own about the keycaps. Loaded lazily by KeyboardHero — this file and Three.js are one
 * chunk that the first paint never waits for.
 */
export function KeyboardScene({
  keycaps,
  activeId,
  downId,
  onHover,
  onSelect,
  onReady,
  onFailed,
}: KeyboardSceneProps) {
  const colors = useSceneColors();
  const fontsLoaded = useFontsLoaded(colors.sans, colors.mono);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapperRef);
  const [ready, setReady] = useState(false);
  const [pointing, setPointing] = useState(false);
  useCursor(pointing);

  const main = keycapsIn(keycaps, "main");
  const also = keycapsIn(keycaps, "also");
  const { columns, rows } = keyboardLayout(main.length);
  const gridWidth = columns * keycapWidth + (columns - 1) * keyGap;
  // The top row spans the main grid's width; its keys share it.
  const alsoRows = Math.ceil(also.length / columns);
  const topRowDepth = alsoRows * (smallKeycapDepth + keyGap);
  const gridDepth = topRowDepth + rows * keycapDepth + (rows - 1) * keyGap;
  const width = gridWidth + 2 * casePadding;
  const depth = gridDepth + 2 * casePadding;
  // z grows toward the viewer: the top row sits at the back edge, the main grid in front of it.
  const backEdge = -gridDepth / 2;
  const dark = colors.theme === "dark";

  const hover = (id: string | null) => {
    setPointing(id !== null);
    onHover(id);
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "absolute inset-0 transition-opacity duration-500",
        ready ? "opacity-100" : "opacity-0",
      )}
    >
      {fontsLoaded && (
        <SceneErrorBoundary onError={onFailed}>
          <Canvas
            // No tone mapping: the scene's colors stay the CSS tokens' colors.
            flat
            dpr={[1, 2]}
            frameloop={inView ? "always" : "never"}
            camera={{ fov: 30, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            onCreated={({ gl }) =>
              gl.domElement.addEventListener("webglcontextlost", onFailed, { once: true })
            }
          >
            <FitCamera width={width} depth={depth} />
            <ambientLight intensity={dark ? 0.6 : 1.4} />
            <directionalLight position={[3, 8, 5]} intensity={dark ? 1.6 : 1.8} />
            <Tilt>
              <Underglow width={width} depth={depth} theme={colors.theme} />
              <RoundedBox args={[width, caseHeight, depth]} radius={0.18} smoothness={4}>
                <meshStandardMaterial color={colors.surface2} roughness={0.85} />
              </RoundedBox>
              {also.map((keycap, index) => (
                <KeycapMesh
                  key={keycap.id}
                  keycap={keycap}
                  size={smallKeycap}
                  position={[
                    ((index % columns) - (columns - 1) / 2) * (keycapWidth + keyGap),
                    backEdge +
                      smallKeycapDepth / 2 +
                      Math.floor(index / columns) * (smallKeycapDepth + keyGap),
                  ]}
                  active={keycap.id === activeId}
                  down={keycap.id === downId}
                  colors={colors}
                  onHover={hover}
                  onSelect={onSelect}
                />
              ))}
              {main.map((keycap, index) => {
                const column = index % columns;
                const row = Math.floor(index / columns);
                return (
                  <KeycapMesh
                    key={keycap.id}
                    keycap={keycap}
                    size={mainKeycap}
                    position={[
                      (column - (columns - 1) / 2) * (keycapWidth + keyGap),
                      backEdge + topRowDepth + keycapDepth / 2 + row * (keycapDepth + keyGap),
                    ]}
                    active={keycap.id === activeId}
                    down={keycap.id === downId}
                    colors={colors}
                    onHover={hover}
                    onSelect={onSelect}
                  />
                );
              })}
            </Tilt>
            <FirstFrame
              onFirstFrame={() => {
                setReady(true);
                onReady();
              }}
            />
          </Canvas>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
