import { Composition } from "remotion";
import { InkCut } from "./inkcut/MV";
import { DURATION_FRAMES, FPS } from "./inkcut/drive";
import { WIDTH, HEIGHT } from "./inkcut/theme";

// Duration and frame rate come from the analysis pass, not from a literal: if you swap the
// song, everything re-times itself on the next `npm run analyze`.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="InkCut"
    component={InkCut}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
