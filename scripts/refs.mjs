// Upload reference images to paba.tv and record the asset URLs.
//
// Reference images are what hold a character together across shots. Two rules, both learned
// the hard way:
//   1. One reference = one figure, full body, plain background. A turnaround sheet (several
//      views on one canvas) makes the model draw several people into the shot.
//   2. The reference must already be in your final art style. If it is a photograph, the
//      generated clips will be photographic no matter what the prompt says.
//
//   node scripts/refs.mjs                 # upload every PNG in work/refs/
//   node scripts/refs.mjs hero=x.png foe=y.png
//
// Writes work/refs.json: { projectId, title, <key>: { file, url, id, w, h } }
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { C } from "./config.mjs";
import { requirePabaSession } from "./paba-session.mjs";

const SKILL = process.env.PABA_SKILL;
if (!SKILL || !existsSync(join(SKILL, "scripts/setup-refs.mjs"))) {
  console.error("set PABA_SKILL to the generating-video-with-paba-h3 skill directory");
  process.exit(1);
}
requirePabaSession(SKILL);

const args = process.argv.slice(2);
const refsDir = join(C.work, "refs");
const pairs = args.length
  ? args
  : (existsSync(refsDir) ? readdirSync(refsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)) : [])
      .map((f) => f.replace(/\.[a-z]+$/i, "") + "=" + join(refsDir, f));
if (!pairs.length) {
  console.error("no reference images: put PNGs in work/refs/ or pass key=path pairs");
  process.exit(1);
}

const title = JSON.parse(readFileSync(join(C.ROOT, "project.config.json"), "utf8")).title || "inkcut";
mkdirSync(C.work, { recursive: true });
const out = join(C.work, "refs.json");
execFileSync("node", [join(SKILL, "scripts/setup-refs.mjs"), title, out, ...pairs], { stdio: "inherit" });
console.log("wrote " + out);
