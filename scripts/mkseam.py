#!/usr/bin/env python3
"""Turn a square texture into a seamless tile by mirroring it into four quadrants.

A 512x512 grain or paper texture tiled directly across a 1920x1080 frame shows a hard grid of
squares wherever its edges do not match. Mirroring the source into (original, flipped-x,
flipped-y, rotated-180) makes every shared edge identical by construction, so the tile repeats
without a seam at any size.

    python scripts/mkseam.py public/tex/paper.png public/tex/paper_seam.png
    python scripts/mkseam.py public/grain.png public/grain_seam.png --size 1024

The output is 2x the source, so a 512 texture becomes a 1024 seamless tile - and the layer that
consumes it must set background-size to that output size, or the browser scales the tile and
reintroduces the seam.
"""
import sys
from PIL import Image


def seam(path_in: str, path_out: str, size: int | None = None) -> None:
    src = Image.open(path_in).convert("RGBA")
    if size:
        src = src.resize((size, size), Image.LANCZOS)
    w, h = src.size
    out = Image.new("RGBA", (w * 2, h * 2))
    out.paste(src, (0, 0))
    out.paste(src.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    out.paste(src.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    out.paste(src.transpose(Image.ROTATE_180), (w, h))
    out.save(path_out)
    print(f"{path_in} {w}x{h} -> {path_out} {w * 2}x{h * 2}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        sys.exit(1)
    size = None
    for a in sys.argv[1:]:
        if a.startswith("--size="):
            size = int(a.split("=", 1)[1])
    seam(args[0], args[1], size)
