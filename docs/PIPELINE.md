# Pipeline

Five stages. Each one is a script; only stage 2 involves judgement.

```
input/song.mp3 + input/song.srt + input/lyrics.txt
   │ npm run analyze
   ▼
src/inkcut/{drive.ts, lyrics.ts}          generated - never hand-edited
   │ you author shots.ts + work/prompts/*.txt
   ▼
   │ npm run plates   → public/assets/plate_<id>.png     (fallback art)
   │ npm run refs     → work/refs.json                   (character anchors)
   │ npm run clips    → work/clips/<id>.mp4              (performance footage)
   │ npm run sync     → public/assets/clip_<id>.mp4 + shotAssets.ts
   ▼
   │ npm run studio / npm run still
   ▼
   │ npm run render   → out/film.mp4
```

## 0. doctor

```bash
npm run doctor
```

Checks node, ffmpeg, ffprobe, python + numpy, the input files, the shipped textures, the fonts,
and whether the optional generator keys are present. Every check here is one that otherwise
surfaces minutes into a render or a paid batch.

## 1. analyze

```bash
npm run analyze
```

`scripts/analyze.py` decodes the song to mono float32 through ffmpeg, runs a 2048/441 STFT
(100 frames per second), and derives:

| output | what it is | where it goes |
|---|---|---|
| `duration` | measured, not read from metadata | `DURATION_SEC`, `DURATION_FRAMES` |
| `bpm`, `period` | comb-filtered over 56..186 BPM in 0.5 steps | `BPM`, `BEAT` |
| `beats[]` | grid, each beat snapped to a nearby onset peak | `BEATS` |
| `downbeat_phase` | which of every 4 beats has the most low-end | `DOWNBEAT_PHASE` |
| `vocal/low/mid/high/full/onset` | per-frame envelopes at 30 fps | `VOCAL` … `ONSET` |
| `lyrics[]` | line windows + per-character onset times | `lyrics.ts` |

**Lyric text.** The SRT supplies the timings. The text comes from `input/lyrics.txt` if it
exists, one line per cue, in sung order. The script exits with an error if the line counts
differ - that mismatch means the two files describe different cuts of the song, and you want
to know that before rendering, not after.

**Character times.** Inside a line, each character is placed on a vocal onset detected within
that line's window, then spread evenly across any gap that has no onset. This is what makes the
lyrics land on syllables instead of on an even per-line fade.

Read the printed table before designing anything. The tempo candidates tell you the half-time
feel (a 67 BPM ballad is heard as 134); the gaps in the line list tell you where the
instrumental break is, and that gap is where the composition can own a shot outright.

## 2. author

Two hand-written artifacts, and only two.

**`src/inkcut/shots.ts`** - the shot table. Every field is documented in the file itself.
The rule that matters: put cuts on printed beats, not on round numbers.

**`work/prompts/`** - two prompts per shot:
- `<id>.plate.txt` - the background art, generated once, always present;
- `<id>.txt` - the performance footage prompt (see `docs/PROMPTS.md`).

Plus `work/refs/` with one full-body character plate per figure, already in the final art
style, and `work/shots.plan.json` mapping shot → duration and reference key.

## 3. generate

```bash
npm run plates      # stills first - the film is previewable before any clip exists
npm run refs        # upload the character plates, get asset URLs
npm run clips       # batch the footage
npm run sync        # publish + ffprobe-measure
```

`plates` is not optional housekeeping. A shot with no clip must still be watchable, because the
footage batch is slow and you will preview the film dozens of times before the last clip lands.
Every shot therefore has a plate the composition falls back to automatically. Before the first
plate exists the composition draws a procedural ink backdrop for that shot instead - abstract
ridges and a horizon - so the timing and lyric sync are reviewable on a fresh clone with no
generated art at all.

`clips` is **idempotent by construction**: it re-reads the service's recent job list each round
and matches jobs back to shots by their full normalised prompt, so it can be killed at any
point and restarted without double-spending quota. See `docs/PITFALLS.md` for why the match
must be on the whole prompt.

`sync` runs ffprobe on every clip and writes the **measured** duration and pixel size into
`src/inkcut/shotAssets.ts`. Never assume the service returned the duration you asked for - it
does not.

## 4. compose

```bash
npm run studio      # http://localhost:3000, scrub the timeline
npm run still       # one frame, ~15s
```

The composition is described in `src/inkcut/MV.tsx`; the layers in order are plate stack →
interlude → snow → cut fibre → grade → lyrics → low-end darkening.

## 5. render

```bash
npm run render
```

```bash
npx remotion render InkCut out/film.mp4 --codec=h264 --crf=18 --concurrency=4
```

**Do not run this until the user has seen a preview and asked for the file.**

Set `REMOTION_BROWSER` to an existing Chrome/Edge binary to skip Remotion's own headless
download.
