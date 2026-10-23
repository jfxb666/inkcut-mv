import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { clamp01, easeOut, rnd, lerp } from "./util";
import { C } from "./theme";

export type TearKind = "tearH" | "tearV";
export type Edge = "top" | "bottom" | "left" | "right";

/** A jagged cut-paper edge: n vertices across the sweep axis, jittered deterministically. */
const tearEdge = (n: number, seed: number, amp: number) => {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const base = (i / n) * 100;
    const j = (rnd(i, seed) - 0.5) * amp;
    const j2 = (rnd(i, seed + 9) - 0.5) * amp * 0.45;
    pts.push(base + j + j2);
  }
  return pts;
};

/**
 * Paper-tear reveal. This is not a cross-fade: the incoming plate is clipped by a jagged
 * advancing tear line, is offset perpendicular to that line like a sheet being peeled,
 * and carries a paper-fibre highlight along the cut. The tear decelerates at the end
 * (easeOut) so it reads as resistance, not as a wipe.
 */
export const TearMask: React.FC<{
  p: number;
  kind: TearKind;
  from: Edge;
  seed: number;
  children: React.ReactNode;
}> = ({ p, kind, from, seed, children }) => {
  const e = easeOut(clamp01(p));
  const pts = tearEdge(34, seed, 7.5);
  // The tear line sweeps *inward from the edge the sheet is torn away from*. For a tear that
  // opens at the left or top, the covered strip is [0, lead] and lead grows from -9 to 109.
  // For a tear that opens at the right or bottom the covered strip is [lead, 100] instead,
  // so lead has to travel the other way - otherwise the incoming shot would start fully
  // covering the frame and shrink away, which reads as the new shot leaving, not arriving.
  const adv = e * 118 - 9;
  const lead = from === "left" || from === "top" ? adv : 100 - adv;

  // The polygon has to be walked as a closed ring along the frame edge, down the jagged
  // tear line, and back along the opposite edge. Anything looser lets the implicit closing
  // edge cut a diagonal across the picture.
  const L = lead.toFixed(2);
  let poly: string;
  if (kind === "tearV") {
    const jag = pts.map((y) => `${L}% ${y.toFixed(2)}%`);
    poly =
      from === "left"
        ? ["0% 0%", ...jag, "0% 100%"].join(", ")
        : ["100% 0%", ...jag, "100% 100%"].join(", ");
  } else {
    const jag = pts.map((x) => `${x.toFixed(2)}% ${L}%`);
    poly =
      from === "top"
        ? ["0% 0%", "100% 0%", ...jag.slice().reverse()].join(", ")
        : ["0% 100%", "100% 100%", ...jag.slice().reverse()].join(", ");
  }

  const off = (1 - e) * 54;
  const dx = kind === "tearV" ? (from === "left" ? off : -off) : 0;
  const dy = kind === "tearH" ? (from === "top" ? off : -off) : 0;

  return (
    <AbsoluteFill style={{ clipPath: `polygon(${poly})` }}>
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${1 + (1 - e) * 0.06})` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Ink-bleed reveal using the 24-frame soak-through mask sequence. */
export const InkMask: React.FC<{ p: number; variant: "a" | "b" | "c"; children: React.ReactNode }> = ({
  p,
  variant,
  children,
}) => {
  const FULL = 23;
  const idx = Math.min(FULL, Math.round(Math.pow(clamp01(p), 0.78) * FULL));
  const url = `url(${staticFile(`tex/ink_${variant}_${String(idx).padStart(2, "0")}.png`)})`;
  return (
    <AbsoluteFill
      style={{
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** The 3-frame paper-fibre flash that rides a hard cut. Additive light only, never a fade. */
export const CutFlash: React.FC<{ t: number; kind: TearKind; seed: number }> = ({ t, kind, seed }) => {
  const p = clamp01(t / 0.17);
  if (p >= 1) return null;
  const e = easeOut(p);
  const pts = tearEdge(34, seed, 7.5);
  const w = lerp(6, 0, p);
  const grad =
    kind === "tearH"
      ? `linear-gradient(to bottom, transparent ${e * 100 - w}%, ${C.snow} ${e * 100}%, transparent ${e * 100 + w}%)`
      : `linear-gradient(to right, transparent ${e * 100 - w}%, ${C.snow} ${e * 100}%, transparent ${e * 100 + w}%)`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: 0.85 * (1 - p) }}>
      <AbsoluteFill style={{ background: grad, filter: "blur(0.7px)" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {kind === "tearH" ? (
          <polyline
            points={pts.map((x, i) => `${(x / 100) * 1920},${e * 1080 + (rnd(i, seed + 3) - 0.5) * 20}`).join(" ")}
            fill="none"
            stroke={C.snow}
            strokeWidth={1.8}
            opacity={0.6}
          />
        ) : (
          <polyline
            points={pts.map((y, i) => `${e * 1920 + (rnd(i, seed + 3) - 0.5) * 20},${(y / 100) * 1080}`).join(" ")}
            fill="none"
            stroke={C.snow}
            strokeWidth={1.8}
            opacity={0.6}
          />
        )}
      </svg>
    </AbsoluteFill>
  );
};
