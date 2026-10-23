import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./theme";
import { at, clamp01, lerp, noise2, rnd } from "./util";
import { LOW, HIGH, VOCAL } from "./drive";

const TILE = 1024;

/**
 * A seamless texture tile, scrolled by an arbitrary offset.
 *
 * Remotion's renderer can miss a CSS background-image that has not decoded before the frame is
 * captured, which is why its linter forbids the property. An explicit grid of <Img> tiles is
 * decoded through the same path as every other image in the film, so a frame is never captured
 * with the paper layer silently absent.
 */
const Tile: React.FC<{ src: string; ox: number; oy: number; opacity: number; blend: React.CSSProperties["mixBlendMode"] }> = ({ src, ox, oy, opacity, blend }) => {
  const left = -(((ox % TILE) + TILE) % TILE);
  const top = -(((oy % TILE) + TILE) % TILE);
  const cells: React.ReactNode[] = [];
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < 3; cx++) {
      cells.push(
        <Img
          key={`${cx}-${cy}`}
          src={staticFile(src)}
          style={{ position: "absolute", left: cx * TILE, top: cy * TILE, width: TILE, height: TILE }}
        />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: blend, opacity }}>
      <AbsoluteFill style={{ left, top, width: TILE * 3, height: TILE * 2 }}>{cells}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Film grade. Everything here is *physical*: paper grain that crawls, ink that pools
 * unevenly, a vignette that tightens with the bass, and a projector-style flicker.
 * No flat overlays at constant opacity.
 */
export const Grade: React.FC<{ warmth?: number }> = ({ warmth = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const low = at(LOW, t);
  const high = at(HIGH, t);
  const vocal = at(VOCAL, t);

  // paper grain crawls on a non-repeating path so it never looks like a loop
  const gx = Math.floor(noise2(t * 3.1, 0.5) * 1024);
  const gy = Math.floor(noise2(0.5, t * 2.7) * 1024);
  const flicker = 0.965 + 0.035 * Math.sin(t * 41.3) * Math.sin(t * 7.7);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* uneven ink pooling in the corners */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 118% 96% at 50% 46%, rgba(0,0,0,0) 38%, rgba(4,7,11,0.30) 74%, rgba(3,5,8,0.62) 100%)",
          opacity: 0.82 + low * 0.16,
        }}
      />
      {/* bass-driven vignette tightening */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${180 + low * 150}px ${40 + low * 60}px rgba(3,5,8,${0.42 + low * 0.26})`,
        }}
      />
      {/* cold moonlight wash from the top-left, breathing with the vocal */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 22% 12%, rgba(127,154,163,0.20), rgba(127,154,163,0) 68%)",
          opacity: 0.5 + vocal * 0.45,
          mixBlendMode: "screen",
        }}
      />
      {/* warm lamp counter-light, only where the shot calls for it */}
      {warmth > 0.01 ? (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 34% 40% at 74% 62%, rgba(217,154,78,0.42), rgba(217,154,78,0) 70%)",
            opacity: warmth * (0.55 + high * 0.45),
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {/* Rice-paper fibre, crawling. The source tile is a 512 square and its edges do not
          match, so tiling it directly printed a visible 512px grid across the flat fog in
          the wide shots. The shipped tile is mirror-quadrant (2x2 of the original, flipped),
          which is seamless by construction and four times the period. */}
      <Tile src="tex/paper_seam.png" ox={gx} oy={gy} blend="soft-light" opacity={0.26} />
      {/* grain: per-frame jitter, never a static texture */}
      <Tile
        src="grain_seam.png"
        ox={(frame * 37) % 1024}
        oy={(frame * 53) % 1024}
        blend="overlay"
        opacity={0.15 + high * 0.12}
      />
      {/* projector flicker */}
      <AbsoluteFill style={{ background: "#000", opacity: (1 - flicker) * 0.5 }} />
    </AbsoluteFill>
  );
};

/**
 * Snow-burst: the interlude device. A shockwave of cut-paper shards from a point,
 * plus a momentary whiteout that is *not* a fade - it is a hard flash with structure.
 */
export const SnowBurst: React.FC<{ t: number; origin: [number, number] }> = ({ t, origin }) => {
  if (t < 0 || t > 1.5) return null;
  const p = clamp01(t / 1.35);
  const shards = 190;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: C.snow,
          opacity: Math.pow(1 - clamp01(t / 0.5), 2.4) * 0.9,
        }}
      />
      {Array.from({ length: shards }, (_, i) => {
        const ang = rnd(i, 5) * Math.PI * 2;
        const spd = 380 + rnd(i, 9) * 1500;
        const dist = spd * Math.pow(p, 0.55);
        const x = origin[0] + Math.cos(ang) * dist;
        const y = origin[1] + Math.sin(ang) * dist * 0.72 + p * p * 420;
        const s = 4 + rnd(i, 17) * 26 * (1 - p * 0.55);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s * (0.4 + rnd(i, 23)),
              background: rnd(i, 31) > 0.72 ? C.cinnabar : C.snow,
              opacity: (1 - p) * (0.4 + rnd(i, 41) * 0.6),
              transform: `rotate(${ang * 57 + p * 520}deg)`,
              clipPath: "polygon(0% 0%, 100% 22%, 84% 100%, 12% 78%)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Hand-held camera shake that reacts to the transient envelope instead of running on a sine. */
export const shake = (t: number, amount: number) => {
  const ax = (noise2(t * 8.3, 11.1) - 0.5) * 2;
  const ay = (noise2(21.7, t * 7.9) - 0.5) * 2;
  const r = (noise2(t * 5.1, 31.3) - 0.5) * 2;
  return `translate(${ax * amount}px, ${ay * amount}px) rotate(${r * amount * 0.05}deg)`;
};

export const blendOverlay = (a: number, b: number, t: number) => lerp(a, b, t);
