import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LYRICS } from "./lyrics";
import { C, FONT_SONG, FONT_KAI } from "./theme";
import { clamp01, easeOut, at } from "./util";
import { DURATION_SEC, VOCAL } from "./drive";
import { CREDITS, END_TITLE, TITLE, TITLE_IN, TITLE_OUT } from "./credits";

const CHAR_IN = 0.13;
const OUT_DUR = 0.42;

/**
 * Lyrics are revealed character by character on the *measured* onset of each syllable,
 * not on an even split of the line. Each character arrives with a paper-cut stamp:
 * it drops in slightly oversized, the ink is still wet (blur), then it settles.
 * The line leaves by rising and dissolving into the scrim, never by a plain fade.
 */
export const Lyrics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // At most two lines are ever on screen: the one being sung and the one leaving.
  // They are stacked on separate baselines so they can never overlap.
  const visible = LYRICS.filter((l) => t >= l.start - 0.30 && t <= l.end + 0.62).slice(-2);
  if (!visible.length) return null;
  const topIndex = visible.length - 1;

  const vocal = at(VOCAL, t);
  const lift = 1 + vocal * 0.035;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* bottom scrim: a paper shadow, not a flat gradient */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(6,9,13,0.92) 0%, rgba(6,9,13,0.72) 14%, rgba(6,9,13,0.34) 28%, rgba(6,9,13,0) 46%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 132,
          transform: `scale(${lift})`,
          transformOrigin: "50% 88%",
        }}
      >
        {visible.map((l, vi) => {
          const slot = topIndex - vi; // 0 = newest line, 1 = the one above it
          const exitP = clamp01((t - (l.end + 0.10)) / OUT_DUR);
          const rise = easeOut(exitP) * -34;
          const exitOp = 1 - exitP;
          const chars = Array.from(l.text);
          return (
            <div
              key={l.i}
              style={{
                position: "absolute",
                bottom: 132 + slot * 88,
                transform: `translateY(${rise}px)`,
                opacity: exitOp * (slot === 0 ? 1 : 0.55),
                fontFamily: FONT_SONG,
                fontSize: 62,
                fontWeight: 500,
                letterSpacing: 5,
                color: C.snow,
                textShadow: "0 3px 18px rgba(0,0,0,0.85), 0 0 46px rgba(30,45,71,0.9)",
                whiteSpace: "nowrap",
                display: "flex",
              }}
            >
              {chars.map((ch, i) => {
                const ct = l.charT[i] ?? l.start + (i / Math.max(1, chars.length)) * (l.end - l.start);
                const p = clamp01((t - ct) / CHAR_IN);
                if (p <= 0) {
                  // not yet sung: hold a faint ghost so the line has a shape before it is spoken
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        opacity: 0.13,
                        transform: "translateY(6px)",
                      }}
                    >
                      {ch}
                    </span>
                  );
                }
                const e = easeOut(p);
                const overshoot = 1 + (1 - e) * 0.22;
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      opacity: e,
                      transform: `translateY(${(1 - e) * 16}px) scale(${overshoot})`,
                      filter: `blur(${(1 - e) * 5}px)`,
                      textShadow:
                        p < 1
                          ? "0 0 26px rgba(242,240,234,0.55), 0 3px 18px rgba(0,0,0,0.9)"
                          : "0 3px 18px rgba(0,0,0,0.85)",
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Vertical title card, appears only in the first and last seconds. */
export const TitleCard: React.FC<{ t: number }> = ({ t }) => {
  const p = clamp01((t - TITLE_IN) / 1.4) * clamp01((TITLE_OUT - t) / 0.9);
  if (p <= 0) return null;
  const e = easeOut(p);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: e }}>
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 118,
          writingMode: "vertical-rl",
          fontFamily: FONT_KAI,
          fontSize: 76,
          letterSpacing: 20,
          color: C.snow,
          textShadow: "0 4px 26px rgba(0,0,0,0.9)",
          transform: `translateY(${(1 - e) * -26}px)`,
        }}
      >
        {TITLE}
      </div>
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 420,
          width: 54,
          height: 54,
          background: C.cinnabar,
          opacity: 0.92,
          transform: `rotate(${(1 - e) * -14}deg) scale(${0.6 + e * 0.4})`,
          boxShadow: "0 0 22px rgba(168,52,42,0.55)",
        }}
      />
    </AbsoluteFill>
  );
};

/** End card: the last line settles, then everything is buried in white. */
export const EndCard: React.FC<{ t: number }> = ({ t }) => {
  // snow keeps falling into the lens until the frame is simply white paper; the title is
  // printed on that paper and stays printed - it does not fade with it.
  const white = clamp01((t - (DURATION_SEC - 1.84)) / 1.15);
  const e = easeOut(clamp01((t - (DURATION_SEC - 0.97)) / 0.62));
  if (white <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: C.snow, opacity: Math.pow(white, 1.35) }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: e }}>
        <div
          style={{
            fontFamily: FONT_KAI,
            fontSize: 52,
            letterSpacing: 30,
            color: C.ink2,
            transform: `translateY(${(1 - e) * 14}px)`,
          }}
        >
          {END_TITLE}
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONT_SONG,
            fontSize: 19,
            letterSpacing: 7,
            color: "#4a565f",
            opacity: 0.85,
          }}
        >
          {CREDITS}
        </div>
        <div
          style={{
            marginTop: 46,
            width: 44,
            height: 44,
            background: C.cinnabar,
            opacity: 0.9,
            transform: `rotate(${(1 - e) * -12}deg) scale(${0.7 + e * 0.3})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
