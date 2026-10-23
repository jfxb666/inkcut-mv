import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { SHOT_ASSETS } from "./shotAssets";
import type { Shot, MoveKind } from "./shots";
import { C } from "./theme";
import { at, clamp, clamp01, easeInOut, lerp, rnd, noise2 } from "./util";
import { VOCAL, ONSET, LOW, BEATS } from "./drive";
import { shake } from "./Grade";

type Cam = { s: number; x: number; y: number; r: number };

/**
 * Camera paths. None of them is linear: each is modulated by the vocal envelope so the
 * camera breathes with the singing instead of sliding at a constant rate.
 */
const camAt = (kind: MoveKind, p: number, vocal: number, onset: number): Cam => {
  const e = easeInOut(clamp01(p));
  const breathe = 1 + vocal * 0.018;
  switch (kind) {
    case "pushIn":
      return { s: (1.03 + e * 0.20) * breathe, x: 0, y: -e * 12, r: 0 };
    case "pushOut":
      return { s: (1.24 - e * 0.20) * breathe, x: 0, y: e * 10, r: 0 };
    case "panLeft":
      return { s: (1.16 + vocal * 0.03) * breathe, x: (1 - e) * 96, y: -e * 8, r: -e * 0.5 };
    case "panRight":
      return { s: (1.16 + vocal * 0.03) * breathe, x: -(1 - e) * 96, y: -e * 8, r: e * 0.5 };
    case "driftUp":
      return { s: (1.12 + e * 0.10) * breathe, x: 0, y: (1 - e) * 64, r: 0 };
    case "driftDown":
      return { s: (1.12 + e * 0.10) * breathe, x: 0, y: -(1 - e) * 64, r: 0 };
    case "handheld":
      return {
        s: (1.10 + e * 0.08) * breathe,
        x: (noise2(p * 6.2, 3.1) - 0.5) * 26 * (0.4 + onset),
        y: (noise2(7.7, p * 5.4) - 0.5) * 26 * (0.4 + onset),
        r: (noise2(p * 4.4, 9.9) - 0.5) * 1.4,
      };
  }
};

/**
 * Sub-cut points are taken from the real beat grid, not from an even split: the shot is
 * re-framed on the beats that fall inside it, so a still plate is never held for a whole
 * bar. Three cuts per shot at most; short shots get one.
 */
const subCuts = (shot: Shot): number[] => {
  const inside = BEATS.filter((b) => b > shot.start + 0.45 && b < shot.end - 0.35);
  if (inside.length === 0) return [shot.start];
  const want = shot.end - shot.start > 5.4 ? 3 : shot.end - shot.start > 3.2 ? 2 : 1;
  const step = Math.max(1, Math.floor(inside.length / (want + 1)));
  const picked: number[] = [shot.start];
  for (let i = step; i < inside.length && picked.length <= want; i += step) picked.push(inside[i]);
  return picked;
};

/** Each sub-cut gets its own crop of the same plate: a re-frame, not a zoom. */
const framing = (k: number, seed: number): Cam => {
  const sx = rnd(k, seed) - 0.5;
  const sy = rnd(k, seed + 5) - 0.5;
  return {
    s: 1.02 + rnd(k, seed + 9) * 0.17,
    x: sx * 92,
    y: sy * 54,
    r: (rnd(k, seed + 13) - 0.5) * 1.7,
  };
};

const PlateLayer: React.FC<{ src: string; cam: Cam; focus: [number, number] }> = ({ src, cam, focus }) => (
  <AbsoluteFill style={{ transform: `translate(${focus[0]}px, ${focus[1]}px) scale(${cam.s}) translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg)` }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);

/**
 * Generated clips carry a burned-in watermark in the bottom-right corner. Rather than painting
 * over it (delogo leaves visible smears), the bottom band of the source is cropped away and the
 * remainder is scaled to cover the frame and centred, so the corner is simply not in frame.
 *
 * WMSHARE is the fraction of source height the watermark occupies - 60/768 for paba.tv's
 * 1344x768 output. Set INKCUT_WM_SHARE=0 if your footage has no watermark.
 */
const WMSHARE = Number(process.env.INKCUT_WM_SHARE ?? 60 / 768);

/** Crop-and-cover geometry for one source clip, computed from its real pixel size. */
const cropFor = (w: number, h: number, frameW: number, frameH: number) => {
  const keepH = h * (1 - WMSHARE);
  const scale = frameH / keepH;
  const contentW = w * scale;
  return {
    leftPct: (-((contentW - frameW) / 2 / frameW)) * 100,
    wPct: (contentW / frameW) * 100,
    hPct: ((h * scale) / frameH) * 100,
  };
};

const ClipLayer: React.FC<{ src: string; cam: Cam; startFrame: number; shotDur: number; clipDur: number; focus: [number, number]; w: number; h: number }> = ({
  src,
  cam,
  startFrame,
  shotDur,
  clipDur,
  focus,
  w,
  h,
}) => {
  // The Sequence rebases the video's clock on the cut, so the clip starts playing exactly on
  // the beat the shot begins. The rate is then nudged so the footage spans the cut instead
  // of leaving a frozen tail: never looped, never held still.
  const rate = clamp(clipDur / Math.max(0.001, shotDur), 0.85, 1.25);
  const { width, height } = useVideoConfig();
  const CROP = cropFor(w || width, h || height, width, height);
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translate(${focus[0]}px, ${focus[1]}px) scale(${cam.s}) translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg)` }}>
      <Sequence from={startFrame} layout="none">
        <OffthreadVideo
          src={staticFile(src)}
          muted
          playbackRate={rate}
          style={{ position: "absolute", left: `${CROP.leftPct}%`, top: 0, width: `${CROP.wPct}%`, height: `${CROP.hPct}%` }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

/** A slow ink shadow that creeps inside the frame: keeps parallax alive between cuts. */
const InkDepth: React.FC<{ t: number; amount: number }> = ({ t, amount }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 60% 70% at ${28 + Math.sin(t * 0.7) * 12}% ${58 + Math.cos(t * 0.5) * 8}%, rgba(6,9,13,0.55), rgba(6,9,13,0) 66%)`,
      opacity: amount,
      mixBlendMode: "multiply",
    }}
  />
);

export const ShotLayer: React.FC<{ shot: Shot; t: number }> = ({ shot, t }) => {
  const { fps } = useVideoConfig();
  const asset = SHOT_ASSETS[shot.id];
  const dur = shot.end - shot.start;
  const p = clamp01((t - shot.start) / Math.max(0.001, dur));
  const vocal = at(VOCAL, t);
  const onset = at(ONSET, t);
  const low = at(LOW, t);

  const seed = shot.id.charCodeAt(1) * 7 + 3;
  const cuts = subCuts(shot);
  let k = 0;
  for (let i = 0; i < cuts.length; i++) if (t >= cuts[i]) k = i;
  const kEnd = k + 1 < cuts.length ? cuts[k + 1] : shot.end;
  const localP = clamp01((t - cuts[k]) / Math.max(0.001, kEnd - cuts[k]));

  const base = camAt(shot.move, p, vocal, onset);
  const sub = framing(k, seed);
  // the sub-cut's own micro-move drifts in, so the re-frame is not a frozen crop
  const drift = 1 - Math.pow(1 - localP, 2);
  const cam: Cam = {
    s: base.s * lerp(sub.s, sub.s * 1.05, drift),
    x: base.x + sub.x * (1 - drift * 0.5),
    y: base.y + sub.y * (1 - drift * 0.5),
    r: base.r + sub.r,
  };

  const focus = shot.focus ?? [0, 0];
  const shakeAmt = shot.move === "handheld" ? onset * 5.5 : onset * 1.6;
  const warmth = shot.act === 2 ? 1 : shot.act === 1 ? 0.35 : 0;

  return (
    <AbsoluteFill style={{ background: C.ink, transform: shake(t, shakeAmt) }}>
      {asset.clip ? (
        <ClipLayer
          src={asset.clip}
          cam={cam}
          startFrame={Math.round(shot.start * fps)}
          shotDur={dur}
          clipDur={asset.clipDur}
          focus={focus}
          w={asset.w}
          h={asset.h}
        />
      ) : (
        <PlateLayer src={asset.plate} cam={cam} focus={focus} />
      )}
      <InkDepth t={t} amount={0.22 + low * 0.22} />
      {warmth > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 44% 46% at 62% 54%, rgba(217,154,78,${0.10 + warmth * 0.12}), rgba(217,154,78,0) 72%)`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <AbsoluteFill style={{ boxShadow: `inset 0 0 220px 70px rgba(4,7,13,${0.34 + low * 0.16})` }} />
    </AbsoluteFill>
  );
};
