import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./theme";
import { rnd, clamp01 } from "./util";

type Flake = { x: number; y: number; z: number; s: number; sp: number; ph: number; rot: number; kind: number };

const SHAPES = [
  "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  "polygon(0% 8%, 100% 0%, 92% 100%, 6% 88%)",
  "circle(46% at 50% 50%)",
  "polygon(20% 0%, 80% 12%, 100% 60%, 62% 100%, 14% 84%, 0% 36%)",
];

const makeFlakes = (n: number, seed: number): Flake[] =>
  Array.from({ length: n }, (_, i) => {
    const z = rnd(i, seed) * 0.85 + 0.15;
    return {
      x: rnd(i, seed + 11) * 1.3 - 0.15,
      y: rnd(i, seed + 23),
      z,
      s: 1.4 + z * 6.4 + rnd(i, seed + 37) * 2.8,
      sp: 0.35 + z * 1.25,
      ph: rnd(i, seed + 53) * Math.PI * 2,
      rot: rnd(i, seed + 61) * 360,
      kind: Math.floor(rnd(i, seed + 79) * SHAPES.length),
    };
  });

/**
 * Snow is cut paper, not CGI: every flake is a scissor-cut shard that tumbles in 3D
 * (its own spin rate, its own depth, its own sway) and is lit from one side, so it
 * flashes bright then dark as it turns. Near flakes are large and blurred by speed.
 */
const Layer: React.FC<{
  flakes: Flake[];
  t: number;
  wind: number;
  fall: number;
  density: number;
  opacity: number;
  blur: number;
  tint: string;
}> = ({ flakes, t, wind, fall, density, opacity, blur, tint }) => (
  <AbsoluteFill style={{ filter: blur > 0 ? `blur(${blur}px)` : undefined }}>
    {flakes.map((f, i) => {
      if (i / flakes.length > density) return null;
      const y = ((f.y + t * fall * f.sp * 0.09) % 1.25) - 0.12;
      const sway = Math.sin(t * (1.1 + f.z) + f.ph) * (14 + f.z * 26);
      const x = f.x + sway / 1920 + t * wind * f.sp * 0.02;
      // tumbling: the shard's apparent width collapses as it turns edge-on
      const spin = (t * (52 + f.z * 130) + f.rot) * (Math.PI / 180);
      const facing = Math.abs(Math.cos(spin));
      const lit = 0.45 + facing * 0.55;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${((x % 1.15) + 1.15) % 1.15 * 100}%`,
            top: `${y * 100}%`,
            width: f.s * (0.35 + facing * 0.65),
            height: f.s * (0.8 + f.z * 0.5),
            background: tint,
            clipPath: SHAPES[f.kind],
            opacity: opacity * (0.3 + f.z * 0.7) * lit,
            transform: `rotate(${(f.rot + t * 22 * f.z) % 360}deg) skewX(${(facing - 0.5) * 14}deg)`,
            boxShadow: f.z > 0.62 ? `0 0 ${f.s * 0.8}px rgba(242,240,234,0.45)` : undefined,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

export const Snow: React.FC<{ density: number; wind: number; reverse?: number; tint?: string }> = ({
  density,
  wind,
  reverse = 0,
  tint = C.snow,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const far = React.useMemo(() => makeFlakes(300, 3), []);
  const near = React.useMemo(() => makeFlakes(140, 71), []);
  const d = clamp01(density);
  const flow = t * (1 - reverse * 1.9);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Layer flakes={far} t={flow} wind={wind} fall={1} density={0.22 + d * 0.78} opacity={0.42} blur={1.6} tint={tint} />
      <Layer flakes={near} t={flow} wind={wind * 1.6} fall={1.9} density={0.12 + d * 0.88} opacity={0.9} blur={0} tint={tint} />
    </AbsoluteFill>
  );
};
