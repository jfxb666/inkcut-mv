# inkcut-mv

Turn a song into a short narrative film: a measured beat grid, AI-generated performance shots
under one locked art style, word-accurate lyric sync, paper-tear transitions, rendered with
Remotion.

This is not a lyric-video template. It is one complete pipeline that was used to make a 57
second film, published with the shot table, the prompts, and every failure that cost time.

```
song.mp3 + song.srt + lyrics.txt
   → measure the beat grid and per-character lyric times
   → author a shot table and one prompt per shot
   → generate still plates, then performance footage
   → compose in Remotion, check by contact sheet
   → render
```

## Quick start

```bash
npm install
npm run doctor                     # toolchain, inputs, optional keys
cp input/lyrics.example.txt input/lyrics.txt   # edit to the real lyric text
# put your song at input/song.mp3 and its subtitles at input/song.srt
npm run analyze
npm run studio                     # preview at http://localhost:3000
```

At this point the film plays with the example shot table and no generated footage at all:
a shot falls back to its still plate, and a shot with no plate yet falls back to a procedural
ink backdrop. That is deliberate - you can see the timing, the lyric sync and the transitions
before spending a single generation.

Then, to replace the example with your own film:

```bash
# 1. author src/inkcut/shots.ts and work/prompts/<id>.txt + <id>.plate.txt
# 2. character reference plates in work/refs/ (one full body, already in style)
npm run plates     # still art per shot
npm run refs       # upload the character plates
npm run clips      # performance footage, 2 in flight, idempotent
npm run sync       # publish + measure
npm run render     # only when you actually want the file
```

The generators are optional. Without keys you can author, preview and render using plates
alone; `docs/PIPELINE.md` describes which stages need what.

## What makes it look like a film

- **Cuts land on measured beats.** `scripts/analyze.py` derives the tempo by comb filter, snaps
  every beat to a nearby onset, and picks the downbeat phase from the low-end envelope.
- **Every lyric character is stamped on its own onset**, measured inside the line's window - not
  an even fade across the line.
- **No shot holds still.** Each shot is re-framed on the beats that fall inside it, so a five
  second shot has two or three distinct framings even when its source is a still plate.
- **Transitions are paper tears and ink blooms.** Never a cross-fade; a fade reads as a slide
  change, not a cut.
- **One palette, nine values**, in `src/inkcut/theme.ts`. Every layer reads from it.

## The rule

**Measure, do not assume.** Tempo, beats, downbeats, character onsets, clip durations, source
resolutions, watermark size - all measured from real files. Every bug in this pipeline that
took more than ten minutes to find came from assuming a number. `docs/PITFALLS.md` is the list.

## Docs

| file | contents |
|---|---|
| `docs/PIPELINE.md` | the five stages, what each script does, what it writes |
| `docs/PROMPTS.md` | how to write prompts that hold a style across nine generations |
| `docs/NARRATIVE.md` | how to build a story spine instead of illustrating lyrics |
| `docs/QA.md` | contact sheets, motion checks, encode verification |
| `docs/PITFALLS.md` | the eight failures that cost real time |
| `docs/FONTS.md` | which faces, why they ship, and what is legal to publish |
| `example/dongmian/` | a finished film: shot table, design doc, nine prompts |
| `SKILL.md` | the same pipeline as an agent skill |

## Requirements

node 20.19+ / 22.13+ / 24+, ffmpeg + ffprobe on PATH, python 3 with numpy.
Optional: an Agnes key for still plates, a paba.tv session for performance footage.

## License

MIT for the code. The song, subtitles, generated images and fonts are not covered - see
`LICENSE` and `docs/FONTS.md`.
