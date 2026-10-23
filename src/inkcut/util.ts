export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const clamp = (t: number, a: number, b: number) => Math.max(a, Math.min(b, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a || 1e-9));

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
export const easeOutBack = (t: number, s = 1.7) => {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/** Deterministic hash noise in [0,1). */
export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const rnd2 = (x: number, y: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Smooth 1D value noise in [0,1). */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i, seed), rnd(i + 1, seed), u);
};

/** Smooth 2D value noise in [0,1). */
export const noise2 = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = rnd2(ix, iy);
  const b = rnd2(ix + 1, iy);
  const c = rnd2(ix, iy + 1);
  const d = rnd2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** Sample a per-frame drive array at an arbitrary time (seconds). */
export const at = (arr: number[], t: number, fps = 30) => {
  if (!arr.length) return 0;
  const x = t * fps;
  const i = Math.floor(x);
  if (i < 0) return arr[0];
  if (i >= arr.length - 1) return arr[arr.length - 1];
  return lerp(arr[i], arr[i + 1], x - i);
};

/** Peak-hold envelope: reacts instantly, decays smoothly. Used for accent-driven motion. */
export const envAt = (arr: number[], t: number, decay = 0.18, fps = 30) => {
  const back = Math.round(decay * fps);
  const i = Math.round(t * fps);
  let m = 0;
  for (let k = 0; k <= back; k++) {
    const idx = i - k;
    if (idx < 0 || idx >= arr.length) continue;
    const w = 1 - k / (back + 1);
    m = Math.max(m, arr[idx] * w);
  }
  return m;
};

/** Exponential impulse decay since the most recent beat. */
export const beatPulse = (t: number, beats: number[], k = 7.0) => {
  let best = 0;
  for (let i = 0; i < beats.length; i++) {
    const d = t - beats[i];
    if (d < 0) break;
    if (d > 0.9) continue;
    const v = Math.exp(-d * k);
    if (v > best) best = v;
  }
  return best;
};

/** Index of the last beat at or before t. */
export const beatIndex = (t: number, beats: number[]) => {
  let lo = 0;
  let hi = beats.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid] <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
};

/** Phase within the current beat, 0..1. */
export const beatPhase = (t: number, beats: number[]) => {
  const i = beatIndex(t, beats);
  if (i < 0) return 0;
  const a = beats[i];
  const b = beats[i + 1] ?? a + 0.8955;
  return clamp01((t - a) / Math.max(1e-6, b - a));
};
