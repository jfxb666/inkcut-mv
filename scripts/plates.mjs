// Generate the still plate for each shot: the background art the composition falls back to
// while a clip is missing, and the layer the clip is composited over.
//
// Plates matter more than they look. A shot with no clip must still be watchable, because the
// batch is slow and you will preview the film dozens of times before the last clip lands.
//
//   node scripts/plates.mjs              # only missing plates
//   node scripts/plates.mjs --force      # regenerate everything
//
// Reads work/prompts/<id>.plate.txt and writes public/assets/plate_<id>.png via the Agnes CLI.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { C } from "./config.mjs";

const SKILL = process.env.AGNES_SKILL;
if (!SKILL || !existsSync(join(SKILL, "scripts", "agnes.mjs"))) {
  console.error("set AGNES_SKILL to the generating-images-with-agnes skill directory");
  process.exit(1);
}
const CLI = join(SKILL, "scripts", "agnes.mjs");
const force = process.argv.includes("--force");
mkdirSync(C.plates, { recursive: true });
mkdirSync(C.publicAssets, { recursive: true });

const prompts = (existsSync(C.prompts) ? readdirSync(C.prompts) : []).filter((f) => f.endsWith(".plate.txt")).sort();
if (!prompts.length) {
  console.error(`no *.plate.txt in ${C.prompts} - write one prompt per shot first`);
  process.exit(1);
}

// The image model snaps requests to its own supported sizes, so a "1920x1080" request comes
// back as something close but not equal. Plates are drawn with object-fit: cover, so a 3:2 or
// 16:9 plate both work. Override with PLATE_SIZE if you need a specific shape.
const size = process.env.PLATE_SIZE || (C.width / C.height > 1.5 ? "1536x1024" : "1024x1536");
for (const f of prompts) {
  const id = f.replace(".plate.txt", "");
  const dst = join(C.publicAssets, "plate_" + id + ".png");
  if (existsSync(dst) && !force) { console.log("have", id); continue; }
  const tmp = join(C.plates, id + ".png");
  try {
    // Run from the project root: the Agnes CLI resolves its key as $AGNES_KEY -> ./.agnes_key
    // -> ~/.agnes_key, so the working directory decides whether it finds the key.
    execFileSync("node", [CLI, "image", "--out", tmp, "--prompt-file", join(C.prompts, f), "--size", size],
      { cwd: C.ROOT, stdio: "inherit" });
    copyFileSync(tmp, dst);
    console.log("wrote", dst);
  } catch (e) {
    console.error("failed", id, String(e.message).slice(0, 200));
  }
}
console.log("done - run: npm run sync");
