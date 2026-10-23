# Fonts

The composition uses three CJK faces, all loaded at runtime through `FontGate`:

| role | family in the composition | file in `public/assets/` | used for |
|---|---|---|---|
| brush / display | `KaiLocal` | `simkai.ttf` | title card, end card |
| lyric body | `SongLocal` | `NotoSansSC-VF.ttf` | lyric lines at 62px |
| small caps | `HeiLocal` | `simhei.ttf` | credits, small labels |

`npm run fonts` copies them out of the OS font directory (or `FONT_DIR`) into
`public/assets/`, skipping anything already present.

## Why they ship with the project

A CJK lyric line set in a fallback font is a different film. The browser will substitute a
system face silently, and the substituted face has different stroke weight, different
character widths, and different vertical metrics - so line breaks, spacing and the bottom
scrim all shift. Ship the faces.

`FontGate` wraps the whole composition in a `delayRender`/`continueRender` pair, so no frame
is ever captured before the fonts resolve. If a file is missing it falls back to the system
font instead of hanging the render.

## Licensing - read this before publishing

**SimKai, SimHei and SimSun are Microsoft / Founder fonts. They are not redistributable.**
Do not commit them to a public repository, and do not ship them inside a rendered project's
assets.

Safe substitutes, all redistributable:

- **Noto Sans SC** - Apache-2.0. Use for the lyric body and for the small-caps role.
- **Noto Serif SC** - Apache-2.0. Closest legal stand-in for Kai in a serif direction.
- **LXGW WenKai (霞鹜文楷)** - SIL OFL. Actually a brush-flavoured kai face, and the best free
  substitute for SimKai specifically. This is what to use if you want the title card to keep
  its calligraphic feel on a public repo.

`.gitignore` already excludes `public/assets/*`, so a local run never commits them by accident.
