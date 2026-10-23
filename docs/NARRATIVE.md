# Narrative

The hard requirement is that the video tells a story. The trap is that a lyric video is
naturally written line by line, which produces a slideshow that illustrates words instead of
carrying a film.

## Pick one spine, then let the lyrics comment on it

A lyric line is a fragment: an image, a feeling, a half-sentence. It does not contain a plot.
So write the plot first, from the whole song, and then decide which shot each line falls on.

Ours, in one sentence: *a man walks back through an old street in the snow to dig a memory out
of it, and finally lies down in the snow himself.*

Everything else is derived from that sentence. The lyrics are not the story; they are what the
man is thinking while the story happens.

## The device: one physical thing that changes state

Pick a single object or weather system and let it carry time. Ours is **snow**, and it changes
state four times:

| act | snow | what it means |
|---|---|---|
| 1 归途 (return) | falls down, wind-driven | present tense |
| 2 证物 (evidence) | outside the window only | shut out |
| 3 释放 (release) | falls upward | memory, time running backwards |
| 4 冬眠 (hibernation) | buries the frame | the end of the present |

A device like this is what lets the film be *about* something without a voice-over. It also
gives you free transitions: a change in the snow is a change in the act, and it can happen
mid-shot.

## Acts, not beats

Cut the song into 3-5 acts at the points the analysis actually shows a boundary (a gap in the
lyric list, a jump in the low-end envelope). Each act gets a place, a light, and a temperature:

- Act 1: exterior, cold, one amber point.
- Act 2: interior, warm, lamp-lit - the only warm act, and the only one with a tight frame.
- Act 3: exterior, vast, cold - the frame opens up, the figure shrinks.
- Act 4: exterior, white-out, no horizon.

Then the grade follows the act automatically: `warmth` in `MV.tsx` is a per-act constant, and
`Snow` density is driven by the vocal envelope plus an act term. You should not be hand-tuning
colour per shot.

## Where the human goes

If the song has one line that is the emotional centre, that line gets the only frontal shot of
the other person. Ours is act 3, the chorus: the woman appears once, in a summer dress, in
autumn leaves - out of season, which is the point. She is never seen again.

Everything before that is the man approaching evidence of her; everything after is the man
alone with the scale of it. The one shot of her is the film's only warm-coloured human figure,
and it lands on the chorus because that is where the song spends its feeling.

## Anti-patterns

- **Illustrating each line.** "秋末的落叶" gets leaves; "冬至的白雪" gets snow. The result is a
  stock-footage mood board with no causality.
- **A static figure with a slow zoom.** The single most common failure of AI-generated shots.
  Every shot needs something moving independently of the camera.
- **Naming the emotion.** Do not put the character in a pose labelled *grief*. Give the body a
  task - reaching for a door, opening a box, lying down - and let the pose be a by-product.
- **A clean ending.** Ours ends on white paper with the title stamped on it: the film stops
  rather than resolves. A resolved ending on a song about not resolving reads as a mistake.
