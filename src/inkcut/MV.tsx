import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SHOTS, INTERLUDE } from "./shots";
import { AUDIO_SRC, SHOT_ASSETS } from "./shotAssets";
import { ShotLayer } from "./Stage";
import { TearMask, CutFlash } from "./Transitions";
import { Snow } from "./Snow";
import { Grade, SnowBurst } from "./Grade";
import { Lyrics, TitleCard, EndCard } from "./LyricLayer";
import { FontGate } from "./FontGate";
import { C } from "./theme";
import { at, clamp01, rnd } from "./util";
import { VOCAL, LOW, HIGH } from "./drive";

/** Every shot is entered through a paper tear, never a fade. Durations are short and
 *  deliberately uneven so the cuts land on different beats. */
const TRANS: Record<string, { dur: number; kind: "tearH" | "tearV"; from: "top" | "bottom" | "left" | "right"; seed: number }> = {
  s02: { dur: 0.46, kind: "tearH", from: "bottom", seed: 11 },
  s03: { dur: 0.52, kind: "tearV", from: "left", seed: 23 },
  s04: { dur: 0.38, kind: "tearH", from: "top", seed: 37 },
  s05: { dur: 0.44, kind: "tearV", from: "right", seed: 41 },
  s06: { dur: 0.60, kind: "tearH", from: "top", seed: 53 },
  s07: { dur: 0.48, kind: "tearV", from: "left", seed: 67 },
  s08: { dur: 0.42, kind: "tearH", from: "bottom", seed: 71 },
  s09: { dur: 0.66, kind: "tearV", from: "right", seed: 83 },
};

const shotAt = (t: number) => {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return i;
  return 0;
};

/**
 * The instrumental break. The four acts have run the same wound four ways; here the film
 * itself is torn apart - all nine plates hurtle past the lens, each rotated and thrown
 * off-frame, flipping faster and faster until the last one is flung aside and the third
 * act begins. No plate is ever held, so there is no still frame in the gap.
 */
const Interlude: React.FC<{ t: number }> = ({ t }) => {
  const span = INTERLUDE.end - INTERLUDE.start;
  const p = clamp01((t - INTERLUDE.start) / span);
  // Only shots that actually have art can be flung past the lens; before the first plate
  // is generated this list is empty and the break plays as the lens closing down.
  const plates = SHOTS.map((s) => SHOT_ASSETS[s.id].plate).filter((p): p is string => p !== null);
  const n = plates.length;
  // Cards overlap deliberately: at any instant three or four sheets are in flight, so the
  // frame is never empty and never repeats a position. Each one crosses the lens once,
  // rotates as it goes, and is gone before it can read as a held still.
  const BORN_SPAN = 0.84;
  const LIFE = 0.44;
  const cards = [] as React.ReactNode[];
  for (let k = 0; k < n; k++) {
    const born = (n > 1 ? k / (n - 1) : 0) * BORN_SPAN - 0.12; // the first sheet is already mid-air
    const q = (p - born) / LIFE;
    if (q < 0 || q > 1) continue;
    const e = q * q * (3 - 2 * q);
    const dir = k % 2 === 0 ? 1 : -1;
    const tilt = (rnd(k, 13) - 0.5) * 26;
    const scale = 0.92 + rnd(k, 29) * 0.34 + Math.sin(q * Math.PI) * 0.22;
    const drop = (rnd(k, 41) - 0.5) * 30 + (e - 0.5) * 24;
    cards.push(
      <AbsoluteFill
        key={k}
        style={{
          transform: `translate(${dir * 150 * (1 - 2 * e)}%, ${drop}%) rotate(${tilt + e * dir * 42}deg) scale(${scale})`,
          opacity: clamp01(q / 0.1) * clamp01((1 - q) / 0.14),
          clipPath: `polygon(0% ${1 + (k % 3) * 4}%, 100% 0%, 100% ${92 - (k % 4) * 5}%, 0% 100%)`,
          boxShadow: "0 34px 96px rgba(3,5,9,0.85)",
        }}
      >
        <Img src={staticFile(plates[k])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "linear-gradient(120deg, rgba(242,240,234,0.12), rgba(3,5,9,0.55))" }} />
        {/* a cream paper margin, so each card reads as a physical sheet */}
        <AbsoluteFill style={{ border: "12px solid rgba(242,240,234,0.9)" }} />
      </AbsoluteFill>,
    );
  }
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      {cards}
      {/* the lens closes down as the break ends, then the third act tears in */}
      <AbsoluteFill style={{ background: "#04070c", opacity: Math.pow(clamp01((p - 0.72) / 0.28), 1.6) * 0.92 }} />
    </AbsoluteFill>
  );
};

const Inner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const idx = shotAt(t);
  const shot = SHOTS[idx];
  const prev = idx > 0 ? SHOTS[idx - 1] : null;

  const vocal = at(VOCAL, t);
  const low = at(LOW, t);
  const high = at(HIGH, t);

  const tr = TRANS[shot.id];
  const trP = tr ? clamp01((t - shot.start) / tr.dur) : 1;

  // the interlude is Remotion's own: shards, a hard whiteout, and the snow turning upward
  const inInterlude = t >= INTERLUDE.start - 0.10 && t <= INTERLUDE.end + 0.12;
  const burstT = t - INTERLUDE.start;
  const reverse = inInterlude ? 1 : 0;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(AUDIO_SRC)} />

      {/* ---- plate stack ---- */}
      <AbsoluteFill>
        {prev && trP < 1 ? <ShotLayer shot={prev} t={t} /> : null}
        {tr && trP < 1 ? (
          <TearMask p={trP} kind={tr.kind} from={tr.from} seed={tr.seed}>
            <ShotLayer shot={shot} t={t} />
          </TearMask>
        ) : (
          <ShotLayer shot={shot} t={t} />
        )}
      </AbsoluteFill>

      {/* ---- interlude: the photo storm ----
          Remotion owns this 1.63s outright. Rather than letting the last plate sit
          frozen while the instrumental turns, every plate in the film is flipped past
          the lens on the beat, each one torn and thrown, and the burst rides on top. */}
      {inInterlude ? <Interlude t={t} /> : null}
      {inInterlude ? <SnowBurst t={burstT} origin={[960, 520]} /> : null}

      {/* ---- weather ---- */}
      <Snow
        density={0.18 + vocal * 0.72 + (shot.act === 4 ? 0.22 : 0)}
        wind={-0.55 - high * 0.5}
        reverse={reverse}
      />

      {/* ---- cut fibre ---- */}
      {tr && trP < 1 ? <CutFlash t={t - shot.start} kind={tr.kind} seed={tr.seed} /> : null}

      {/* ---- grade ---- */}
      <Grade warmth={shot.act === 2 ? 1 : shot.act === 1 ? 0.4 : 0} />

      {/* ---- typography ---- */}
      <Lyrics />
      <TitleCard t={t} />
      <EndCard t={t} />

      {/* low-end rumble on the bass: a barely-there edge darkening, felt not seen */}
      <AbsoluteFill style={{ background: "#000", opacity: low * 0.06 }} />
    </AbsoluteFill>
  );
};

export const InkCut: React.FC = () => (
  <FontGate>
    <Inner />
  </FontGate>
);
