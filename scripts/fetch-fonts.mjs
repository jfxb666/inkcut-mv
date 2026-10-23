// Copy CJK fonts into public/assets/ so the composition renders identically everywhere.
//
// The three faces are used as: Kai for titles and the end card (brush feel), Song for lyric
// lines (even strokes read better at 62px), Hei for small credits. If a file is missing the
// browser falls back to a system font and the layout still works, but the film will not look
// the same on another machine - which is the whole point of shipping the fonts.
//
//   node scripts/fetch-fonts.mjs                 # copy from the OS font directory
//   FONT_DIR=/path/to/fonts node scripts/fetch-fonts.mjs
//
// Licensing: SimSun/SimHei/SimKai are Microsoft/Founder fonts and must NOT be committed to a
// public repo. Noto Sans SC is Apache-2.0 and is the safe substitute - see docs/FONTS.md.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { C } from "./config.mjs";

const dir = process.env.FONT_DIR || (process.platform === "win32"
  ? join(process.env.WINDIR || "C:\\Windows", "Fonts")
  : "/usr/share/fonts/truetype");

// family name in the composition -> candidate files, first hit wins
const WANT = [
  ["simkai.ttf", ["simkai.ttf", "STKAITI.TTF", "NotoSerifSC-Regular.otf"]],
  ["NotoSansSC-VF.ttf", ["NotoSansSC-VF.ttf", "NotoSansSC-Regular.otf", "NotoSansCJKsc-Regular.otf"]],
  ["simhei.ttf", ["simhei.ttf", "NotoSansSC-Bold.otf", "NotoSansCJKsc-Bold.otf"]],
];

mkdirSync(C.publicAssets, { recursive: true });
let missing = 0;
for (const [target, candidates] of WANT) {
  const dst = join(C.publicAssets, target);
  if (existsSync(dst)) { console.log("have", target); continue; }
  const hit = candidates.map((c) => join(dir, c)).find(existsSync);
  if (!hit) { console.log("MISS", target, "- looked for", candidates.join(", "), "in", dir); missing++; continue; }
  copyFileSync(hit, dst);
  console.log("copied", hit, "->", target);
}
if (missing) {
  console.log(`\n${missing} face(s) missing. The film still renders with a system fallback. `);
  process.exitCode = 0;
}
