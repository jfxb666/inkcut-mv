// THE ONE FILE YOU AUTHOR BY HAND.
//
// Everything else in this project is measured or generated. This table is the directing
// decision: how many shots, where each one starts and ends, which lyrics it carries, how the
// camera moves, and how deep the paper planes sit.
//
// Timing is not free-form: put cuts on the beat grid printed by `npm run analyze`. A cut that
// lands 120ms off a beat is felt as a stumble even when nobody can name it.
//
// The values below are the worked example (a 57s ballad in four acts) - replace them.

export type MoveKind =
  | "pushIn"
  | "pushOut"
  | "panLeft"
  | "panRight"
  | "driftUp"
  | "driftDown"
  | "handheld";

export type Shot = {
  id: string;
  start: number;
  end: number;
  /** Indices into LYRICS carried by this shot. */
  lyrics: number[];
  move: MoveKind;
  /** Extra parallax drift for the plate layer, in px over the shot. */
  plateShift: [number, number];
  /** Depth of the paper-cut planes, 0..1. */
  depth: number;
  /** Which act this shot belongs to; drives warmth and snow density. */
  act: 1 | 2 | 3 | 4;
  /** Screen-space lift in px, used when the subject sits low in the source footage and would
   *  otherwise be buried under the lyric scrim. */
  focus?: [number, number];
};

export const SHOTS: Shot[] = [
  { id: "s01", start: 0.0,   end: 5.9,   lyrics: [0, 1],   move: "pushIn",    plateShift: [0, -26],  depth: 0.55, act: 1 },
  { id: "s02", start: 5.9,   end: 9.6,   lyrics: [2, 3],   move: "handheld",  plateShift: [-18, 0],  depth: 0.7,  act: 1 },
  { id: "s03", start: 9.6,   end: 15.5,  lyrics: [6, 7],   move: "driftDown", plateShift: [0, 20],   depth: 0.45, act: 2 },
  { id: "s04", start: 15.5,  end: 22.2,  lyrics: [8, 9],   move: "panRight",  plateShift: [34, 0],   depth: 0.35, act: 2 },
  { id: "s05", start: 22.2,  end: 26.5,  lyrics: [10, 11], move: "pushIn",    plateShift: [0, 0],    depth: 0.6,  act: 2 },
  { id: "s06", start: 28.13, end: 35.3,  lyrics: [12, 13], move: "pushOut",   plateShift: [0, -14],  depth: 0.8,  act: 3 },
  { id: "s07", start: 35.3,  end: 42.8,  lyrics: [14, 15], move: "panLeft",   plateShift: [-40, 0],  depth: 0.9,  act: 3, focus: [0, -190] },
  { id: "s08", start: 42.8,  end: 50.4,  lyrics: [16, 17], move: "driftUp",   plateShift: [0, -22],  depth: 0.65, act: 3, focus: [0, -150] },
  { id: "s09", start: 50.4,  end: 57.391, lyrics: [18],    move: "driftUp",   plateShift: [0, -34],  depth: 0.5,  act: 4, focus: [0, -120] },
];

/** An instrumental stretch Remotion owns end to end, with no AI footage: plates fly through
 *  as physical sheets. Leave start === end to disable it. */
export const INTERLUDE = { start: 26.5, end: 28.13 };

/** Act names used by the title card. Keep them short; they are set vertically. */
export const ACT_TITLES: Record<number, string> = {
  1: "归途",
  2: "证物",
  3: "释放",
  4: "冬眠",
};
