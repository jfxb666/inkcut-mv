// Check that this machine can actually run the pipeline, and say what to install when it
// cannot. Run this first: every failure below is one that otherwise surfaces minutes into a
// render or a paid generation batch.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { C } from "./config.mjs";
import { anyPython, resolvePython } from "./python.mjs";

let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const warn = (m) => console.log("  warn " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return null; }
};

console.log("toolchain");
const node = run("node", ["-v"]);
node ? ok(`node ${node}`) : fail("node not found (need 20.19+ / 22.13+ / 24+)");
const ff = run("ffmpeg", ["-version"]);
ff ? ok("ffmpeg " + ff.split("\n")[0].split(" ")[2]) : fail("ffmpeg not on PATH (decode + contact sheets + probe)");
run("ffprobe", ["-version"]) ? ok("ffprobe") : fail("ffprobe not on PATH");
const py = resolvePython();
if (py) {
  ok("python " + run(py, ["-V"]) + " (numpy " + run(py, ["-c", "import numpy;print(numpy.__version__)"]) + ")");
} else {
  const any = anyPython();
  fail(any
    ? `${any} cannot import numpy - run: ${any} -m pip install numpy`
    : "no python found (scripts/analyze.py needs python 3 + numpy); set PYTHON to its path");
}

console.log("\ninputs");
existsSync(C.audio) ? ok("audio " + C.audio) : fail(`audio missing: ${C.audio} (set "audio" in project.config.json)`);
existsSync(C.srt) ? ok("srt " + C.srt) : fail(`srt missing: ${C.srt} (set "srt" in project.config.json) - one cue per sung line is what supplies every timing`);
existsSync(join(C.ROOT, "input/lyrics.txt"))
  ? ok("authoritative lyrics input/lyrics.txt")
  : warn("no input/lyrics.txt - SRT text is used verbatim, which for machine transcripts is usually wrong");

console.log("\nremotion project");
existsSync(join(C.ROOT, "node_modules"))
  ? ok("node_modules present")
  : fail("run: npm install");
for (const f of ["ink_a_00.png", "ink_b_00.png", "ink_c_00.png"]) {
  existsSync(join(C.ROOT, "public/tex", f)) ? ok("ink mask " + f)
    : fail(`public/tex/${f} missing - the ink-wipe transition has no frames to show`);
}
existsSync(join(C.ROOT, "public/tex/paper_seam.png")) ? ok("paper_seam.png") : warn("public/tex/paper_seam.png missing - paper grain will show tile seams");
existsSync(join(C.ROOT, "public/grain_seam.png")) ? ok("grain_seam.png") : warn("public/grain_seam.png missing");
for (const f of ["simkai.ttf", "NotoSansSC-VF.ttf", "simhei.ttf"]) {
  existsSync(join(C.publicAssets, f)) ? ok("font " + f)
    : warn(`font ${f} missing from ${C.publicAssets} - CJK text falls back to a system font; run: npm run fonts`);
}
// These two are committed so a fresh clone type-checks and previews. They hold the EXAMPLE
// song's measurements, so they are only correct for your song after analyze has rewritten them.
for (const f of ["lyrics.ts", "drive.ts"]) {
  existsSync(join(C.composeSrc, f))
    ? ok(`${f} present (example data until you run analyze on your own song)`)
    : warn(`${f} not generated yet - run: npm run analyze`);
}
existsSync(join(C.publicAssets, "song" + extname(C.audio)))
  ? ok("published audio " + "song" + extname(C.audio))
  : warn(`audio not published into ${C.publicAssets} yet - run: npm run analyze`);

console.log("\noptional generators");
const agnes = process.env.AGNES_KEY || existsSync(join(C.ROOT, ".agnes_key")) || existsSync(join(process.env.USERPROFILE || process.env.HOME || "", ".agnes_key"));
agnes ? ok("agnes key found (still plates)") : warn("no .agnes_key - you must supply your own stills in " + C.publicAssets);
existsSync(join(C.work, "refs.json")) ? ok("work/refs.json (uploaded reference images)")
  : warn("no work/refs.json - run scripts/refs.mjs before generating clips");

console.log(bad ? `\n${bad} blocking problem(s)` : "\nready");
process.exit(bad ? 1 : 0);
