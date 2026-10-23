// Resolve every path from one config file, so no script carries a hard-coded machine path.
// Run all scripts from the project root.
import { readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "project.config.json"), "utf8"));

export const C = {
  ROOT,
  title: cfg.title ?? "inkcut",
  fps: cfg.fps ?? 30,
  width: cfg.width ?? 1920,
  height: cfg.height ?? 1080,
  audio: join(ROOT, cfg.audio),
  srt: join(ROOT, cfg.srt),
  work: join(ROOT, cfg.work),
  publicAssets: join(ROOT, cfg.publicAssets),
  composeSrc: join(ROOT, cfg.composeSrc),
  clips: join(ROOT, cfg.work, "clips"),
  prompts: join(ROOT, cfg.work, "prompts"),
  plates: join(ROOT, cfg.work, "plates"),
  mono: join(ROOT, cfg.work, "mono.f32"),
  analysis: join(ROOT, cfg.work, "analysis.json"),
};

/**
 * Path as Remotion's staticFile() expects it: relative to public/.
 * Files published into publicAssets get an "assets/" prefix; anything else is taken as
 * already relative to public/.
 */
export const assetPath = (abs) => {
  const rel = abs.startsWith(C.publicAssets + sep)
    ? "assets/" + abs.slice(C.publicAssets.length + 1)
    : abs.slice(join(ROOT, "public").length + 1);
  return rel.split(sep).join("/");
};
