---
name: inkcut-mv
description: Produce a narrative, character-driven music video from a song file and its lyrics using Remotion plus generative shots. Use when the user asks for an animated MV, lyric video, 音乐视频, MV 制作, 歌词同步视频, or wants a song turned into a short film with a measured beat grid, AI-generated performance shots, word-accurate lyric sync, and paper-tear transitions. 也用于 Remotion 音乐 MV / 逐字歌词 / 节拍同步 / 水墨剪纸风格短片。
---

# inkcut-mv

Turn a song into a short narrative film. This skill encodes one working pipeline, end to
end, including the failure modes that cost the most time.

`docs/GUIDE.md` is the human-facing walkthrough (Chinese): clone, preview with no keys, then
swap in your own song. Read it when the user is driving; read the rest of this file when you are.

## What this produces

A 16:9 music video where:
- the story is authored, not a line-by-line illustration of the lyric;
- every cut lands on a **measured** beat, not an assumed BPM;
- every lyric character appears on the syllable that is actually sung;
- shots are AI-generated performance footage, composited under a single locked art style;
- transitions are paper tears and ink wipes, never cross-fades;
- no shot is ever held still - each one is re-framed on the beats inside it.

## The one rule

**Measure, do not assume.** Tempo, beats, downbeats, lyric onsets, clip durations, and source
resolutions are all measured from real files. Every bug in this pipeline that took more than
ten minutes to find came from assuming a number.

## Pipeline

```
song.mp3 + song.srt
   |
   |  npm run analyze      -> tempo, beat grid, per-frame envelopes, per-char lyric times
   v
src/inkcut/{drive.ts, lyrics.ts}      (generated; never hand-edited)
   |
   |  author src/inkcut/shots.ts + work/prompts/*.txt   (the only hand-authored steps)
   v
   |  npm run plates       -> still plate per shot (Agnes), so the film previews immediately
   |  npm run refs         -> upload character reference plates to the video service
   |  npm run clips        -> generate performance footage, 2 in flight, idempotent
   v
   |  npm run sync         -> publish footage + ffprobe-measured durations
   v
   npm run studio          -> preview in the browser
   npm run render          -> out/film.mp4
```

## Step 1 - measure the song

```bash
npm run doctor          # toolchain + inputs + optional keys
cp input/lyrics.example.txt input/lyrics.txt   # then edit to the authoritative lyric text
npm run analyze
```

`scripts/analyze.py` prints the tempo candidates, the beat count, the downbeat phase and every
lyric line with its window. Read that output before designing anything: the act boundaries and
the shot count come from it.

Why the SRT is not enough: machine transcripts get characters wrong, and a wrong character sits
in frame for a whole line. `input/lyrics.txt` overrides the text while keeping the SRT timings.
The script **refuses to run** if the two disagree on line count - that mismatch means the files
describe different cuts of the song.

## Step 2 - author the film

Two hand-written things, and only two:

1. **`src/inkcut/shots.ts`** - the shot table. Put cuts on printed beats. Each shot declares its
   lyric range, camera move, plate parallax, paper depth, act, and optionally a `focus` lift for
   subjects that sit low in the source and would be buried under the lyric scrim.
2. **`work/prompts/<id>.txt` and `<id>.plate.txt`** - one prompt per shot. See
   `docs/PROMPTS.md` for the structure that holds a style together across nine separate
   generations, and `example/dongmian/` for a complete worked set.

Narrative guidance is in `docs/NARRATIVE.md`. The short version: pick one physical object or
weather system to carry time, and let it change state across the acts. Do not translate lines.

## Step 3 - generate footage

```bash
npm run plates     # stills first: the film is previewable before any clip exists
npm run refs       # character reference plates -> asset URLs in work/refs.json
npm run clips      # batch, idempotent, 2 concurrent
npm run sync
```

`scripts/gen-clips.mjs` treats the generation service as the source of truth: every round it
re-reads the recent job list and matches jobs back to shots by their **full normalised prompt**.
Consequences worth knowing:
- it can be killed and restarted at any time without double-spending quota;
- a prompt that is a prefix of another shot's prompt will be rejected loudly (see
  `docs/PITFALLS.md` - this exact bug silently copied the wrong clip over the right filename);
- `DRY=1` prints the plan and submits nothing.

## Step 4 - compose and check

```bash
npm run studio     # http://localhost:3000
npm run still      # one frame, fast
```

Check a film by contact sheet, not by watching: render ~30 frames across the timeline at
`--scale=0.25`, tile them, and look for held frames, empty frames, and stacked lyrics. Then
zoom into the frames that look wrong. `docs/QA.md` has the exact commands.

## Step 5 - render

```bash
npm run render
```

**Do not render until the user has actually seen a preview and asked for the file.** Rendering
is minutes of CPU and, if you are iterating, wasted. Preview, get a decision, then render.

## Art direction that survived contact

- **Ink-wash x paper-cut**: hard scissor-cut silhouettes, flat ink-wash interiors, a paper fibre
  base. Nine values in `src/inkcut/theme.ts`; nothing else.
- **Transitions**: paper tears (a jagged clip-path advancing across the frame) and ink blooms
  (a 24-frame mask sequence). Never a cross-fade - a fade reads as a slide change, not a cut.
- **Motion floor**: no shot holds still. Each is re-framed on the beats inside it, so a five
  second shot has two or three distinct framings.
- **Lyrics**: one line at a time, characters stamped on measured onsets, the previous line
  rising out of frame. Two lines maximum, on separate baselines.

## Requirements

node 20.19+ / 22.13+ / 24+, ffmpeg + ffprobe on PATH, python 3 with numpy.
Optional: an Agnes key for still plates, a paba.tv session for performance footage. Without
them you can still author, preview and render - a shot falls back to its still plate, and a
shot with no plate yet falls back to procedural ink art, so a fresh clone previews immediately.

## Layout

```
scripts/        analyze.py + analyze.mjs, gen-clips.mjs, sync-assets.mjs, plates.mjs,
                refs.mjs, fetch-fonts.mjs, mkseam.py, doctor.mjs, config.mjs, python.mjs
src/inkcut/     the composition (MV, Stage, Transitions, LyricLayer, Grade, Snow)
public/tex/     ink masks + seamless paper and grain tiles (shipped)
public/assets/  your song, fonts, plates, clips (gitignored)
work/           prompts, refs, clips, analysis output (gitignored)
example/dongmian/  a finished film: shot table, nine prompts, design doc, analysis
docs/           GUIDE, PIPELINE, PROMPTS, NARRATIVE, QA, PITFALLS, FONTS
```

## Generator setup

`plates` and `clips` shell out to two other skills; point the environment at them:

```bash
export AGNES_SKILL=/path/to/generating-images-with-agnes   # still plates
export PABA_SKILL=/path/to/generating-video-with-paba-h3   # performance footage
```

The Agnes CLI resolves its key from the **current directory** (`$AGNES_KEY` → `./.agnes_key` →
`~/.agnes_key`), so `scripts/plates.mjs` always invokes it with `cwd` set to the project root.
Put `.agnes_key` there, not next to the skill.
