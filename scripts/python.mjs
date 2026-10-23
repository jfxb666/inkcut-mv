// Find a python interpreter that can run analyze.py.
//
// "python" is not on PATH on many Windows installs (the Store alias, conda, and the
// python.org installer all behave differently), so the pipeline probes candidates in order
// and lets PYTHON override everything. Both doctor and the analyze wrapper resolve through
// here, so a machine that passes doctor will also pass analyze.
import { execFileSync } from "node:child_process";

const CANDIDATES = [
  process.env.PYTHON,
  "python",
  "python3",
  "py",
].filter(Boolean);

const probe = (cmd) => {
  try {
    execFileSync(cmd, ["-c", "import numpy"], { stdio: "ignore" });
    return cmd;
  } catch {
    return null;
  }
};

/** First candidate with numpy importable, or null. */
export const resolvePython = () => {
  for (const cmd of CANDIDATES) {
    const hit = probe(cmd);
    if (hit) return hit;
  }
  return null;
};

/** A python that exists but lacks numpy is a different fix from no python at all. */
export const anyPython = () => {
  for (const cmd of CANDIDATES) {
    try {
      execFileSync(cmd, ["-V"], { stdio: "ignore" });
      return cmd;
    } catch {
      /* keep looking */
    }
  }
  return null;
};
