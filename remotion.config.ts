// See all configuration options: https://remotion.dev/docs/config
// Each option is also available as a CLI flag: https://remotion.dev/docs/cli

import { Config } from "@remotion/cli/config";

// Point REMOTION_BROWSER at a Chrome/Edge binary to skip Remotion's own download, e.g.
//   Windows: set REMOTION_BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
// Leaving it unset is fine: Remotion fetches a headless shell on first render.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
