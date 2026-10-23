# Checking the film

Do not check a film by watching it once. A 57 second timeline at 30 fps is 1722 frames, and
the defects that matter - a held frame, an empty frame, two lyrics stacked, a subject cropped
out - are all single instants that pass unnoticed at speed.

Check with a contact sheet, then zoom into what looks wrong.

## 1. Contact sheet

Render ~30 frames across the whole timeline at quarter scale, then tile them.

```bash
mkdir -p out\sheet
# pick frames that sample every shot, not every 30th frame
for f in 15 90 180 300 420 540 660 780 900 1020 1140 1260 1380 1500 1620 1721; do
  npx remotion still InkCut out/sheet/s$f.png --frame=$f --scale=0.25 --log=error
done
```

Tiling, without `-pattern_type glob` (not in the common Windows build):

```bash
# copy to sequential names first
ffmpeg -y -framerate 1 -i out/sheet/seq/%03d.png -vf "tile=6x5" -frames:v 1 out/sheet.png
```

Read the sheet for four things, in this order:

1. **Held frames** - two adjacent cells that are visually identical means the shot has no
   motion floor. Every shot must be re-framed on its internal beats.
2. **Empty frames** - a cell with no subject, no art, only texture. Usually a transition that
   over-covered the frame, or a subject pushed out by a `focus` offset.
3. **Stacked lyrics** - two lines on one baseline. Should be impossible; check anyway.
4. **Composition** - is the subject inside the frame, and clear of the bottom scrim?

## 2. Shot-level motion check

For each shot, render three frames inside it and compare. If all three are the same framing,
the camera path is not being applied.

```bash
npx remotion still InkCut out/check/m1.png --frame=300 --scale=0.5 --log=error
npx remotion still InkCut out/check/m2.png --frame=316 --scale=0.5 --log=error
npx remotion still InkCut out/check/m3.png --frame=332 --scale=0.5 --log=error
```

## 3. Transition check

A paper tear is 12-20 frames long, so render the boundary and two frames either side of it.
What you are looking for: a jagged edge advancing across the frame, with a paper-fibre highlight
on the leading edge. What you are *not* looking for: a dissolve, a diagonal triangle, or a new
shot that appears full-frame and then retreats.

## 4. Lyric sync check

Pick the frames where a line should begin and end, using the timings printed by
`npm run analyze`. At the line's start the first character should be at full opacity and the
rest should be faint pre-ghosts. If a whole line is already visible before its start time, the
character times are wrong - check that `input/lyrics.txt` matched the SRT line count.

## 5. Verify the rendered file, not the preview

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames         -show_entries format=duration,bit_rate -of default=nw=1 out/film.mp4
ffmpeg -v error -i out/film.mp4 -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
```

Check: frame count matches `DURATION_FRAMES`, duration matches the audio to within a frame,
and `max_volume` is below 0 dB (a positive `histogram_0db` count means the audio is clipping).

## 6. Sample frames out of the mp4

Rendering to stills proves the composition; sampling the mp4 proves the encode.

```bash
ffmpeg -y -v error -ss 10 -i out/film.mp4 -frames:v 1 out/mp4chk/t10.png
```

Look specifically at the bottom-right corner: that is where a generator watermark appears, and
it must be outside the crop.
