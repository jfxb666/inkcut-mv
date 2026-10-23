// Run the analysis pass with whichever python actually has numpy.
//
//   node scripts/analyze.mjs            (or: npm run analyze)
//
// Kept as a wrapper rather than "python scripts/analyze.py" in package.json because a bare
// "python" is missing or wrong on a surprising number of machines - see scripts/python.mjs.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { C } from "./config.mjs";
import { anyPython, resolvePython } from "./python.mjs";

const py = resolvePython();
if (!py) {
  const fallback = anyPython();
  console.error(fallback
    ? `${fallback} exists but cannot import numpy - run: ${fallback} -m pip install numpy`
    : "no python found. Install python 3 with numpy, or set PYTHON to its path.");
  process.exit(1);
}
console.log("python:", py);
execFileSync(py, [join(C.ROOT, "scripts", "analyze.py")], { cwd: C.ROOT, stdio: "inherit" });
