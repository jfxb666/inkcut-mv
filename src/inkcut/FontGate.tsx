import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FACES: { family: string; file: string }[] = [
  { family: "KaiLocal", file: "assets/simkai.ttf" },
  { family: "SongLocal", file: "assets/NotoSansSC-VF.ttf" },
  { family: "HeiLocal", file: "assets/simhei.ttf" },
];

export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("Loading CJK fonts"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all(
      FACES.map(async (f) => {
        try {
          const face = new FontFace(f.family, `url(${staticFile(f.file)})`);
          const loaded = await face.load();
          document.fonts.add(loaded);
        } catch {
          /* fall back to system font */
        }
      }),
    ).then(() => {
      if (!alive) return;
      setReady(true);
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [handle]);

  if (!ready) return null;
  return <>{children}</>;
};
