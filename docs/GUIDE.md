# 使用指南

面向第一次用这个仓库的人。目标：**先看到画面，再换成自己的歌**。
每一步都写了「应该看到什么」，看到的不一样就是这一步没成，不要往下走。

---

## 1. 它产出什么

一支 16:9 的叙事型 MV：`<你的歌>.mp3` + `<你的歌>.srt` + 权威歌词文本进去，
出来一支有角色、有表演、逐字对拍、剪纸转场、Remotion 渲染的短片。

三个前提，先记住，后面每个坑都是它的变体：

1. **所有时间都来自测量**。BPM、拍点、强拍相位、每个字的开口时间、每段素材的真实时长，
   全部从真实文件里量出来。没有一处是「按 120 BPM 估算」。
2. **只有两个文件是你手写的**：`src/inkcut/shots.ts`（分镜表）和
   `work/prompts/<id>.txt` + `<id>.plate.txt`（每镜的提示词）。其余要么是量的，要么是生成的。
3. **没有 API key 也能跑完整条流程**。缺静帧就画程序化水墨山脊，缺素材就停在静帧上，
   时间轴、歌词同步、转场全都看得到。生成器只是最后一步的放大器。

---

## 2. 五分钟看到画面（不需要任何 key）

```bash
git clone https://github.com/jfxb666/inkcut-mv.git
cd inkcut-mv
npm install
npm run doctor
npm run studio        # 打开 http://localhost:3000，选 InkCut
```

`npm run doctor` 全绿（`ready`）就说明这台机器能跑。它检查 node / ffmpeg / ffprobe /
python+numpy / 输入文件 / 贴图 / 字体 / 生成器密钥，每一项都是「不检查就会在几分钟后才炸」的那种。

**此时你看到的**：仓库自带的示例数据 —— 一首 57 秒的歌、9 个分镜、19 行歌词，
但**没有任何一张生成图**。所以每镜显示的是程序化水墨背景（三层山脊 + 地平线 + 光晕），
上面跑着真实的节拍、真实的逐字歌词、真实的撕纸转场。

这一步的意义：在花掉第一个生成额度之前，你已经能判断节奏和排版对不对。

---

## 3. 一次性准备

| 需要 | 版本 | 干什么 | 缺了会怎样 |
|---|---|---|---|
| node | 20.19+ / 22.13+ / 24+ | 跑脚本和 Remotion | 装不上 |
| ffmpeg + ffprobe | 4+（本机实测 9.0.1） | 解码、量时长、拼联系表 | `analyze` 直接失败 |
| python 3 + numpy | 3.9+ | 音频分析 | `analyze` 失败，doctor 会告诉你缺哪个 |

python 找不到时用环境变量指定，脚本会优先用它：

```bash
# Windows PowerShell
$env:PYTHON = "C:\path\to\python.exe"
# macOS / Linux
export PYTHON=/usr/bin/python3
```

中文字体（可选但强烈建议，否则换台机器字形会变）：

```bash
npm run fonts     # 从系统字体目录复制三个 CJK 字面到 public/assets/
```

Remotion 首次渲染会自己下载一个 headless 浏览器；已经有 Chrome/Edge 的话可以省掉：

```bash
$env:REMOTION_BROWSER = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

---

## 4. 换成你自己的歌

### 4.1 放文件

```
input/song.mp3     你的音频
input/song.srt     字幕，一行歌词一条 cue
input/lyrics.txt   权威歌词文本（可选，但几乎必须）
```

文件名不同就改 `project.config.json`：

```json
{
  "title": "你的片名",
  "audio": "input/song.mp3",
  "srt": "input/song.srt",
  "fps": 30,
  "width": 1920,
  "height": 1080
}
```

### 4.2 写歌词（`input/lyrics.txt`）

**一行歌词对应一条 SRT cue，顺序按演唱顺序，行数必须完全相等。**

为什么要这个文件：SRT 通常是机器听写的，会错字（示例里「一双无形」被听成「一双无情」，
「以何种方式见面」被听成「就方式见面」），而**一个错字会在画面里停一整行**。
`lyrics.txt` 只替换文字，时间仍然用 SRT 的。

行数不符时 `analyze.py` 会直接退出：

```
input/lyrics.txt has 20 lines but the SRT has 19; they must correspond one-to-one
```

这是故意的：行数不符说明两个文件描述的是不同版本的歌，早炸比渲完再发现好。

从 `input/lyrics.example.txt` 复制一份开始改。

### 4.3 量歌

```bash
npm run analyze
```

应该看到：

```
python: /path/to/python
duration 57.391s  (2530944 samples)
bpm 67.00  period 0.8955s  beats 64  downbeat phase 3
lyric text from input/lyrics.txt (19 lines)
wrote 19 lyric lines, 1722 frames of drive data
    0.27-  2.33 n=11  好像一双无形抓不住的手
    ...
```

它做了四件事，产出的东西全在 `src/inkcut/`（**不要手改**）：

| 输出 | 是什么 | 用在哪 |
|---|---|---|
| `duration` | 实测时长，不读元数据 | `DURATION_SEC` / `DURATION_FRAMES` |
| `bpm` / `beats[]` | 56..186 BPM 梳状滤波，每个拍点吸附到邻近 onset | `BPM` / `BEAT` / `BEATS` |
| `downbeat_phase` | 每 4 拍里低频最重的那一拍 | `DOWNBEAT_PHASE` |
| `vocal/low/mid/high/full/onset` | 30fps 逐帧能量包络 | 推镜速度、雪密度、暗角、颗粒 |
| `lines[].charT` | 每个字的开口时间（行内 vocal onset 分配） | 逐字显现 |

顺便把音频复制到 `public/assets/song.mp3`，所以 `analyze` 之后 `studio` 就有声音了。

**读一遍打印出来的表再设计分镜**：行与行之间的空隙就是器乐段（示例里 26.5–28.13s），
那里可以让 Remotion 自己接管一镜；总拍数决定你能切几刀。

### 4.4 写分镜和提示词（唯一的手工活）

**A. `src/inkcut/shots.ts`** —— 分镜表。切点放在 `BEATS` 打印出来的拍上，不要放整数秒。

```ts
{ id: "s03", start: 9.6, end: 15.5, lyrics: [6, 7], move: "driftDown",
  plateShift: [0, 20], depth: 0.45, act: 2 }
```

- `move`：`pushIn` / `pushOut` / `panLeft` / `panRight` / `driftUp` / `driftDown` / `handheld`
- `depth`：纸层深度 0..1，影响视差幅度
- `act`：1..4，驱动色温和雪量
- `focus`：可选，屏幕空间位移 px。主体在源素材里偏低、会被底部歌词压暗时用
  （示例 s07/s08/s09 用了 `[0,-190]` / `[0,-150]` / `[0,-120]`）
- `INTERLUDE`：器乐段，两张 plate 当纸片横穿镜头；`start === end` 即关闭

**B. `work/prompts/<id>.txt` 和 `<id>.plate.txt`** —— 每镜两条提示词。

`plate.txt` 是背景美术（无人、无动作、偏广），`txt` 是表演镜头。
结构固定四段，顺序不能改（服务把整段当一个指令读，放在动作之后的风格句权重更低）：

```
<Picture 1> is the character and setting reference: <一句话说参考图是什么>.

Action: <身体怎么动，逐拍写。动词、重心、方向。>

Camera: <一个运镜，带一点限定词。>

Style: <锁死的风格句，每镜逐字相同。>
```

三条硬规则：

1. **风格句必须逐字相同**。九次独立生成能看起来像一部片，靠的就是这句不变。
2. **Action 写表演，不写情绪**。「他很悲伤地站在雪里」→ 模型画一个站着的人。
   「他低着头，手插口袋，肩膀耸起；风把长围巾横向吹开、抖动、回弹；大衣下摆随步伐摆动」→ 有动作。
   每镜至少要有一个**独立于镜头运动**的东西在动（围巾、下摆、头发、雪、手）。
3. **参考图必须已经是最终风格**。参考是照片，出来就是照片感，风格句压不住。

完整的写法、photographic-drift 失败的修复话术，见 `docs/PROMPTS.md`。

### 4.5 生成（需要 key，可选）

```bash
export AGNES_SKILL=/path/to/generating-images-with-agnes   # 静帧
export PABA_SKILL=/path/to/generating-video-with-paba-h3   # 表演镜头
```

Agnes 的 key 解析顺序是 `$AGNES_KEY` → `./.agnes_key` → `~/.agnes_key`，
按**当前目录**找，所以 `.agnes_key` 放在项目根，不要放在 skill 目录里。

```bash
npm run plates     # 每镜一张静帧 -> public/assets/plate_<id>.png
npm run refs       # 上传角色定妆图 -> work/refs.json
npm run clips      # 批量出表演镜头 -> work/clips/<id>.mp4
npm run sync       # 发布 + ffprobe 实测时长
```

- `plates`：**先出静帧**。批量出片很慢，你会在这之前预览几十次，没有静帧的镜头也必须能看。
- `refs`：`work/refs/` 里放人物定妆图（一人一张、全身、纯背景、已是最终风格），
  文件名去扩展名就是 key。`work/refs.json` 里记着上传后的 asset URL。
- `clips`：读 `work/shots.plan.json`（每镜时长 + 用哪张参考图）和 `work/prompts/<id>.txt`。
  时长是**整数秒 5..15**，不必等于 `shots.ts` 里的镜头长度，合成时会自动重定时。
  `DRY=1 npm run clips` 只打印计划不提交；`MAX_IN_FLIGHT=2` 控制并发。
- `sync`：ffprobe 实测每段素材的**真实时长和像素尺寸**，写进 `src/inkcut/shotAssets.ts`。

### 4.6 预览

```bash
npm run studio     # http://localhost:3000
npm run still      # 单帧，最快
```

### 4.7 自检（不要靠"看一遍"）

57 秒 = 1722 帧，会出问题的都是单个瞬间：一帧停住、一帧空、两行歌词叠在一起、主体被裁出画。

**用联系表查，不要用播放器查。**

```bash
mkdir out\sheet
foreach ($f in 15,90,180,300,420,540,660,780,900,1020,1140,1260,1380,1500,1620,1721) {
  npx remotion still InkCut "out/sheet/s$f.png" --frame=$f --scale=0.25 --log=error
}
```

拼图（Windows 版 ffmpeg 没有 `-pattern_type glob`，先改成顺序文件名）：

```bash
ffmpeg -y -framerate 1 -i out/sheet/seq/%03d.png -vf "tile=6x5" -frames:v 1 out/sheet.png
```

按这个顺序读：① 相邻两格一模一样 → 镜头没有运动底限；② 有一格只剩纹理 → 转场盖过头或
`focus` 把主体推出去了；③ 两行歌词同一基线；④ 主体是否在画内、是否被底部压暗吃掉。

详细清单见 `docs/QA.md`。

### 4.8 导出

```bash
npm run render     # -> out/film.mp4
```

**用户看过预览、明确说要文件之后再渲。** 渲染是几分钟 CPU，改一版就要重来。

---

## 5. 命令速查

| 命令 | 作用 | 需要 key |
|---|---|---|
| `npm run doctor` | 体检：工具链 / 输入 / 贴图 / 字体 / 密钥 | 否 |
| `npm run analyze` | 量歌，生成 `lyrics.ts` `drive.ts`，发布音频 | 否 |
| `npm run plates` | 每镜一张静帧 | Agnes |
| `npm run refs` | 上传角色定妆图 | paba.tv |
| `npm run clips` | 批量出表演镜头（幂等、并发 2） | paba.tv |
| `npm run sync` | 发布素材 + 实测时长，重写 `shotAssets.ts` | 否 |
| `npm run fonts` | 复制 CJK 字体 | 否 |
| `npm run studio` | 浏览器预览 | 否 |
| `npm run still` | 渲一帧 | 否 |
| `npm run render` | 渲整片 | 否 |
| `npm run typecheck` / `npm run lint` | 类型 / 风格 | 否 |

环境变量：

| 变量 | 默认 | 作用 |
|---|---|---|
| `PYTHON` | 自动探测 | 指定解释器（doctor 和 analyze 共用同一套探测） |
| `REMOTION_BROWSER` | 自下载 | 指定 Chrome/Edge 路径 |
| `AGNES_SKILL` / `PABA_SKILL` | 无 | 两个生成器 skill 的目录 |
| `AGNES_KEY` | `./.agnes_key` | 生图密钥 |
| `PLATE_SIZE` | `1536x1024` | 静帧尺寸（模型会吸附到自己的档位） |
| `MAX_IN_FLIGHT` | 2 | 同时在跑的生成任务数 |
| `DRY` | 空 | `DRY=1` 只打印计划不提交 |
| `INKCUT_WM_SHARE` | `60/768` | 素材底部水印占的高度比例，`0` 表示无水印 |
| `FONT_DIR` | 系统字体目录 | `npm run fonts` 的来源目录 |

---

## 6. 出问题先看这里

| 症状 | 原因 | 处理 |
|---|---|---|
| `set AGNES_SKILL to ...` | 没设环境变量 | 按 4.5 设 |
| `set PABA_SKILL to ...` | 同上 | 同上 |
| Agnes 报 `no Agnes API key` | `.agnes_key` 不在项目根 | 放项目根；脚本已用 `cwd: ROOT` 调它 |
| `input/lyrics.txt has N lines but the SRT has M` | 两个文件不是同一版歌 | 逐行对齐，或重新导 SRT |
| `no subtitle cues read from ...` | SRT 路径错或格式不对 | 检查 `project.config.json` 的 `srt` |
| `has no numpy` | 有 python 但没 numpy | `python -m pip install numpy` |
| `prompt collision: s02,s05` | 两条提示词开头一样，无法反查任务 | 改掉其中一条的第一句（见下） |
| `shot sXX references "man" which is not in work/refs.json` | `shots.plan.json` 的 ref 名和上传的 key 不一致 | 对齐两边名字 |
| 某镜只有静帧、没有表演 | 该镜没有 clip | 正常降级；跑 `npm run clips` 补 |
| 画面上有 512px 方块网格 | 贴图边缘不平 | 用 `scripts/mkseam.py` 生成镜像无缝贴图 |
| 右下角有平台水印 | 素材自带 | 调 `INKCUT_WM_SHARE`，默认裁掉底部 60/768 |
| 素材比镜头短，结尾卡住 | 假设了请求时长 = 实际时长 | `npm run sync` 重新量；播放速率会自动钳在 0.85..1.25 |
| 两行歌词叠在一起 | 过滤窗口太宽 | 已经修好：最多两行，各占一个基线（`bottom: 132 + slot*88`） |
| 转场出现大对角三角 | clip-path 顶点绕向错 | 已经修好：顶点沿边框闭合环走（见 `docs/PITFALLS.md` 第 5 条） |
| `-vsync` 报错 | ffmpeg 9 已移除 | 用 `-fps_mode passthrough` |
| `Pattern type 'glob' was not selected` | Windows 版没编 glob | 改成顺序编号 + `-start_number` |

**为什么任务匹配必须用整条提示词**：批量脚本原来用提示词前 60 字符匹配任务，
而这部片里 s02 和 s05 开头都是 "a young man in a long deep-indigo coat"，
结果一个任务同时匹配两镜，错误的素材被覆盖到正确的文件名上，**全程没有任何报错**。
现在改成归一化后整条全等匹配，命中多个直接抛错。

---

## 7. 素材与授权

- 代码 MIT。
- **歌曲、字幕、生成的图、字体不在 MIT 范围内。** `input/*`、`work/*`、`public/assets/*`
  都在 `.gitignore` 里，需要你自己准备。
- SimKai / SimHei / SimSun 是微软/方正字体，**不能**提交到公开仓库。Noto Sans SC 是
  Apache-2.0，可以；LXGW WenKai 是 OFL，是 SimKai 最合适的合法替代。见 `docs/FONTS.md`。

---

## 8. 想改哪里，看哪个文件

| 想改 | 改这里 |
|---|---|
| 配色 | `src/inkcut/theme.ts`（九个颜色，别在组件里加第十个） |
| 片名 / 片尾 / 署名 | `src/inkcut/credits.ts` |
| 分镜 / 切点 / 运镜 | `src/inkcut/shots.ts` |
| 每镜提示词 | `work/prompts/<id>.txt`、`<id>.plate.txt` |
| 每镜时长与参考图 | `work/shots.plan.json` |
| 歌词排版 | `src/inkcut/LyricLayer.tsx` |
| 转场 | `src/inkcut/Transitions.tsx`、`MV.tsx` 的 `TRANS` 表 |
| 调色 / 纸纹 / 颗粒 | `src/inkcut/Grade.tsx` |
| 雪 | `src/inkcut/Snow.tsx` |
| 运镜曲线 | `src/inkcut/Stage.tsx` 的 `camAt` |
| 器乐段 | `MV.tsx` 的 `Interlude` 与 `shots.ts` 的 `INTERLUDE` |

改完记得 `npm run typecheck`（`noUnusedLocals` 开着，没用的 import 会报 TS6133）。
