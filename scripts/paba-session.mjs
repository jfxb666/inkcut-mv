// Both generator scripts need the paba.tv session inside ego-browser to be live, and the
// failure mode when it is not (a bare 401 deep in an API call) is unhelpful. Check once, up
// front, and print the exact two commands that fix it.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function requirePabaSession(skill) {
  const ego = join(skill, "scripts/ego.mjs");
  if (!existsSync(ego)) {
    console.error("this copy of the paba skill has no scripts/ego.mjs - it predates the ego-browser transport.");
    console.error("update the skill, or point PABA_SKILL at a newer one: " + skill);
    process.exit(1);
  }
  let out;
  try {
    out = execFileSync("node", [ego, "status"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  } catch (e) {
    console.error("cannot read the ego-browser session: " + String(e.message).split("\n")[0]);
    console.error("is ego lite installed? see " + join(skill, "SKILL.md"));
    process.exit(1);
  }
  const s = JSON.parse(out.slice(out.indexOf("{")));
  if (s.prices === 200) return s;
  console.error("paba.tv is not signed in inside ego-browser (space \"" + s.spaces?.[0]?.name + "\", prices=" + s.prices + ").");
  console.error("Sign in once, then re-run:");
  console.error("  node " + ego + " login      # opens paba.tv and hands the window to you");
  console.error("  node " + ego + " takeover   # after you have signed in");
  process.exit(1);
}
