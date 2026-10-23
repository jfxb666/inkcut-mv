# Pitfalls

Each of these cost real time. They are ordered by how expensive they were.

## 1. Matching a generated job back to its shot by prompt prefix

The batch script originally matched jobs to shots using the first 60 characters of the prompt.
Two shots in this film legitimately opened with the same sentence ("a young man in a long
deep-indigo coat…"), so one job matched both shots, and the wrong clip was downloaded over the
right filename. **Nothing errored.** The film rendered, with the wrong footage in one shot.

Fix: normalise the whole prompt (collapse whitespace, trim) and require exact equality. On a
collision, throw. Also keep the newest job when several exist for one shot.

## 2. Assuming the generated clip has the duration you asked for

A `--dur 6` request returns 5.708s. A `--dur 15` request returns 15.0417s. The clip also
carries a burned-in watermark in the bottom-right corner.

Fix: `scripts/sync-assets.mjs` runs ffprobe on every clip and writes the measured duration and
pixel size into `shotAssets.ts`. The composition then sets `playbackRate` from the measured
ratio, clamped to 0.85..1.25 so the retime stays invisible, and rebases the clip's clock on the
cut with a `Sequence` so it starts on the beat rather than at composition frame 0.

That last part was its own bug: without the `Sequence`, `startFrom` alone does not rebase
anything, and every clip played its opening frames at whatever moment the shot happened to
begin - which looked exactly like a still frame in the shots where the action starts late.

## 3. Removing a watermark with delogo

`delogo` leaves a visible vertical smear, and on ink-wash art the smear reads as a smudge in
the drawing. Fix: crop the bottom band containing the watermark, scale the remainder up to
cover the frame, and centre it. `INKCUT_WM_SHARE` is the fraction of source height the
watermark occupies (60/768 for 1344x768 output); the corner is simply not in frame.

## 4. Two lyric lines stacked on the same baseline

The lyric layer filtered lines by `t >= start - 0.30 && t <= end + 0.62`, which is wide enough
that two lines are often active at once, and both were absolutely positioned at the same
`bottom`. The result was two lines printed on top of each other.

Fix: keep at most two, and give each a slot - `bottom: 132 + slot * 88` where slot 0 is the
current line and slot 1 the one leaving. The outgoing line is also dimmed, so the eye reads
depth rather than a mistake.

## 5. Clip-path polygons in the wrong winding order

The paper-tear transition builds a jagged edge and closes it with a polygon. Listing the jag
points in the wrong direction makes the implicit closing edge cut across the frame, which
produces a large diagonal triangle instead of a torn edge.

Fix: walk the polygon as a closed ring around the frame border. Vertical tears anchor at the
top and bottom edges (`"0% 0%", ...jag, "0% 100%"` for a left tear); horizontal tears run along
the top or bottom edge and the jag must be reversed when the edge advances the other way.

The second half of this bug: the tear's leading edge advanced from -9% to 109% regardless of
which side it came from, so a tear "from the right" started by covering the whole frame and
then retreated - which reads as the new shot *leaving*.

## 6. Tiling a 512px texture across a 1920px frame

Paper fibre and grain were 512x512 and tiled directly. Their edges do not match, so the frame
showed a hard grid of 512px squares - invisible in dark scenes, glaring in the white fog of the
final shot.

Fix: `scripts/mkseam.py` (or any mirror-tile) builds a 1024x1024 seamless tile by mirroring the
source into four quadrants: original, flipped horizontally, flipped vertically, rotated 180.
Mirrored edges match by construction.

## 7. Assuming the ASR route

Local Whisper via CTranslate2 crashed the interpreter with an access violation (0xC0000005) on
this machine, in every precision mode, including on a bare model construction. The pipeline
therefore does **not** depend on ASR: timings come from the SRT, text from
`input/lyrics.txt`, and character times from vocal onsets measured in the audio.

That is also the better design: a human supplies the authoritative text, and the machine only
supplies time.

## 8. ffmpeg 9 details

- `-vsync` is removed; use `-fps_mode passthrough`.
- `-pattern_type glob` is not compiled into the common Windows build; number the files and use
  `-start_number` instead.
- `select='eq(n,K)'` needs the comma escaped inside a filtergraph string.
