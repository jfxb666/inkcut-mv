#!/usr/bin/env python3
"""
Step 1 of the pipeline: measure the song, then emit the data layer the composition reads.

Everything downstream is driven by numbers produced here, not by guesses:
  - tempo / beat grid / downbeat phase   -> cuts, pulses, accent motion
  - per-frame energy envelopes           -> push-in speed, snow density, vignette, grain
  - per-line lyric windows + per-char onsets -> word-by-word reveal that matches the vocal

Outputs (all machine-written, never hand-edited):
  work/analysis.json
  <composeSrc>/lyrics.ts
  <composeSrc>/drive.ts

Usage:  python scripts/analyze.py
"""
import json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "project.config.json"), encoding="utf-8"))
AUDIO = os.path.join(ROOT, CFG["audio"])
SRT = os.path.join(ROOT, CFG["srt"])
WORK = os.path.join(ROOT, CFG["work"])
COMPOSE = os.path.join(ROOT, CFG["composeSrc"])
FPS = CFG.get("fps", 30)
os.makedirs(WORK, exist_ok=True)

# ---------------------------------------------------------------- decode to mono f32
def ffprobe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)

SR = 44100
MONO = os.path.join(WORK, "mono.f32")
if not os.path.exists(MONO):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", AUDIO,
                    "-ac", "1", "-ar", str(SR), "-f", "f32le", MONO], check=True)

x = np.fromfile(MONO, dtype=np.float32)
N = len(x)
DUR = N / SR
print(f"duration {DUR:.3f}s  ({N} samples)")

# ---------------------------------------------------------------- STFT
win, hop = 2048, 441          # hop 441 @44.1k -> exactly 100 analysis frames/s
nfr = 1 + (N - win) // hop
idx = np.arange(win)[None, :] + hop * np.arange(nfr)[:, None]
S = np.abs(np.fft.rfft(x[idx] * np.hanning(win), axis=1))
freqs = np.fft.rfftfreq(win, 1 / SR)
t = (np.arange(nfr) * hop + win / 2) / SR
afps = SR / hop

def band(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return S[:, m].mean(1)

vocal = band(250, 4000)
low   = band(30, 160)
mid   = band(160, 1200)
high  = band(3000, 10000)
full  = band(40, 12000)

def sm(a, k):
    k = int(k)
    return np.convolve(a, np.ones(k) / k, mode="same")

def onset_env(a):
    L = np.log1p(a * 80.0)
    return np.maximum(np.diff(L, prepend=L[0]), 0)

oe_v = sm(onset_env(vocal), 3)
oe_a = sm(onset_env(full), 3)

# ---------------------------------------------------------------- tempo: comb filter
# Autocorrelation alone is ambiguous on slow songs (half/double time), so score a full
# BPM grid with a comb filter and weight the range a listener would tap.
def comb_score(env, bpm):
    p = 60.0 / bpm * afps
    best = (0.0, 0)
    for ph in range(int(round(p))):
        s, w, k = 0.0, 0, ph
        while k < len(env) - 1:
            s += env[int(k)]
            w += 1
            k += p
        if s > best[0]:
            best = (s, ph)
    return best[0] / max(w, 1), best[1]

grid = np.arange(56, 186, 0.5)
sc = np.array([comb_score(oe_a, b)[0] for b in grid])
w = 1.0 + 0.25 * np.exp(-((grid - 105) / 45.0) ** 2)
order = np.argsort(sc * w)[::-1]
cands = []
for i in order[:40]:
    b = float(grid[i])
    if all(abs(b - c[0]) / c[0] > 0.06 for c in cands):
        cands.append((b, float(sc[i])))
    if len(cands) >= 6:
        break
BPM = cands[0][0]
_, phase = comb_score(oe_a, BPM)
period = 60.0 / BPM * afps

beats = []
k = phase
while k < nfr:
    beats.append(round(float(t[int(k)]), 3))
    k += period
# snap each beat to the nearest local onset maximum, so the grid lands on transients
ref = []
for b in beats:
    i0 = int(round(b * afps))
    lo, hi = max(0, i0 - int(period * 0.22)), min(nfr, i0 + int(period * 0.22))
    ref.append(round(float(t[lo + int(np.argmax(oe_a[lo:hi]))]), 3))
beats = ref

# downbeat = the phase of 4 whose beats carry the most low-end (kick)
lowat = [float(low[min(nfr - 1, int(b * afps))]) for b in beats]
best_ph, best_s = 0, -1.0
for ph in range(4):
    s = sum(lowat[i] for i in range(ph, len(lowat), 4))
    if s > best_s:
        best_s, best_ph = s, ph

print(f"bpm {BPM:.2f}  period {60/BPM:.4f}s  beats {len(beats)}  downbeat phase {best_ph}")

# ---------------------------------------------------------------- lyric lines
def ts(s):
    h, m, rest = s.split(":")
    sec, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000.0

lines = []
if os.path.exists(SRT):
    raw = open(SRT, encoding="utf-8-sig").read()
    for block in re.split(r"\n\s*\n", raw.strip()):
        L = [l for l in block.strip().splitlines() if l.strip()]
        if len(L) < 3:
            continue
        m = re.match(r"(\d+:\d+:\d+,\d+)\s*-->\s*(\d+:\d+:\d+,\d+)", L[1])
        if not m:
            continue
        lines.append({"s": ts(m.group(1)), "e": ts(m.group(2)), "text": "".join(L[2:]).strip()})
lines.sort(key=lambda z: z["s"])

# The SRT is machine-transcribed and gets words wrong. An authoritative text file wins:
# one lyric line per row, in sung order. Blank/comment rows are ignored.
override = os.path.join(ROOT, "input", "lyrics.txt")
if os.path.exists(override):
    txt = [l.strip() for l in open(override, encoding="utf-8").read().splitlines()
           if l.strip() and not l.strip().startswith("#")]
    if len(txt) != len(lines):
        sys.exit(f"input/lyrics.txt has {len(txt)} lines but the SRT has {len(lines)}; "
                 "they must correspond one-to-one")
    for l, s in zip(lines, txt):
        l["text"] = s
    print(f"lyric text from input/lyrics.txt ({len(txt)} lines)")

# ---------------------------------------------------------------- per-character timing
# A line's characters are spread over the vocal onsets detected *inside* that line, so the
# reveal follows the actual syllables instead of a constant rate.
def char_times(l):
    n = len(l["text"])
    s, e = l["s"], l["e"]
    i0, i1 = int(s * afps), int(e * afps)
    env = oe_v[i0:i1].copy()
    if len(env) < 8:
        step = (e - s) / max(1, n)
        return [round(s + step * i, 3) for i in range(n)]
    pk, k = [], 1
    while k < len(env) - 1:
        if env[k] >= env[k - 1] and env[k] >= env[k + 1] and env[k] > env.max() * 0.18:
            pk.append(k)
            k += 3
        else:
            k += 1
    pk_t = [t[i0 + p] for p in pk]
    if len(pk_t) >= n:
        sel = [min(pk_t, key=lambda z, i=i: abs(z - (s + (e - s) * (i + 0.5) / n)))
               for i in range(n)]
    else:
        sel = [s + (e - s) * (i + 0.5) / n for i in range(n)]
    sel.sort()
    out = []
    for v in sel:
        v = max(s + 0.01, min(e - 0.01, v))
        if out and v <= out[-1] + 0.03:
            v = out[-1] + 0.045
        out.append(v)
    return [round(float(v), 3) for v in out]

for l in lines:
    l["charT"] = char_times(l)
    i0, i1 = int(l["s"] * afps), int(l["e"] * afps)
    l["vocal_mean"] = round(float(vocal[i0:i1].mean()), 1)

# ---------------------------------------------------------------- 30fps driver arrays
NF = int(np.ceil(DUR * FPS))

def resample(a, n):
    return np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(a)), a)

def norm(a, lo=5, hi=95):
    a = np.asarray(a, float)
    p1, p2 = np.percentile(a, lo), np.percentile(a, hi)
    return np.clip((a - p1) / max(1e-9, p2 - p1), 0, 1)

drive = {k: [round(float(v), 3) for v in resample(norm(sm(arr, 5)), NF)]
         for k, arr in [("vocal", vocal), ("low", low), ("mid", mid), ("high", high), ("full", full)]}
drive["onset"] = [round(float(v), 3) for v in resample(norm(sm(oe_a, 3)), NF)]

out = {
    "duration": round(float(DUR), 3),
    "bpm": round(BPM, 2),
    "tempo_candidates": [(round(b, 2), round(float(s), 4)) for b, s in cands],
    "beat_period": round(60.0 / BPM, 4),
    "beats": beats,
    "downbeat_phase": best_ph,
    "downbeats": [b for i, b in enumerate(beats) if i % 4 == best_ph],
    "lines": [{"i": i, "start": l["s"], "end": l["e"], "text": l["text"],
               "charT": l["charT"], "vocal_mean": l["vocal_mean"]} for i, l in enumerate(lines)],
    "drive": drive,
}
json.dump(out, open(os.path.join(WORK, "analysis.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- emit TS data layer
def q(s):
    return json.dumps(s, ensure_ascii=False)

L = ["// AUTO-GENERATED by scripts/analyze.py - do not edit by hand.",
     "export type Lyric = { i: number; start: number; end: number; text: string; charT: number[] };",
     "", "export const LYRICS: Lyric[] = ["]
for l in out["lines"]:
    ct = ", ".join(f"{v:.3f}" for v in l["charT"])
    L.append(f'  {{ i: {l["i"]}, start: {l["start"]:.3f}, end: {l["end"]:.3f}, '
             f'text: {q(l["text"])}, charT: [{ct}] }},')
L += ["];", ""]
open(os.path.join(COMPOSE, "lyrics.ts"), "w", encoding="utf-8").write("\n".join(L))

D = ["// AUTO-GENERATED by scripts/analyze.py - do not edit by hand.",
     f"export const FPS = {FPS};",
     f"export const DURATION_SEC = {out['duration']};",
     f"export const DURATION_FRAMES = {round(out['duration'] * FPS)};",
     f"export const BPM = {out['bpm']};",
     f"export const BEAT = {out['beat_period']};",
     f"export const BEATS: number[] = [{','.join(f'{b:.3f}' for b in out['beats'])}];",
     f"export const DOWNBEAT_PHASE = {out['downbeat_phase']};", ""]
for k in ["vocal", "low", "mid", "high", "full", "onset"]:
    D.append(f"export const {k.upper()}: number[] = [{','.join(f'{v:.3f}' for v in drive[k])}];")
D.append("")
open(os.path.join(COMPOSE, "drive.ts"), "w", encoding="utf-8").write("\n".join(D))

print(f"wrote {len(out['lines'])} lyric lines, {NF} frames of drive data")
for l in out["lines"]:
    print(f'  {l["start"]:6.2f}-{l["end"]:6.2f} n={len(l["text"]):2d}  {l["text"]}')
