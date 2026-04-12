// Decode Golf Intelligence slope image pixel colors to infer slope %.
//
// Color scale (GI documentation):
//   Blue   0–2 %     hue 200–265°
//   Green  2–3.5 %   hue 100–200°
//   Yellow 3.5–5 %   hue 50–100°
//   Orange 3.5–5 %   hue 20–50°
//   Red    5–6 %     hue 0–20° or 345–360°
//   Pink   6 %+      hue 280–345°
//
// Clock position is set by the user tapping the uphill direction on the
// elevation image overlay (see GreenSlopePanel).  nearestClockKey is
// exported so GreenSlopePanel can compute the key from tap coordinates.

const IMG_W = 900;
const IMG_H = 1620;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else                 h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/** Returns an interpolated slope % based on the pixel's hue position within
 *  each GI colour band, using GI's documented boundaries exactly.
 *
 *  As hue decreases from 265° (blue) → 0° (red), slope increases 0 → 6 %.
 *  Pink (280–345°) wraps back and represents > 6 %.
 *
 *  Saturation threshold is intentionally low because GI blends the slope
 *  colour over a satellite base map. */
function classifyPixel(r: number, g: number, b: number, a: number): number | null {
  if (a < 50) return null;
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.08 || l < 0.08 || l > 0.94) return null;

  // Blue   200–265°  →  0–2 %   (higher hue = flatter)
  if (h >= 200 && h <= 265) return 2 * (265 - h) / 65;

  // Green  100–200°  →  2–3.5 %
  if (h > 100 && h < 200) return 2 + 1.5 * (200 - h) / 100;

  // Yellow  50–100°  →  3.5–5 %
  if (h >= 50 && h <= 100) return 3.5 + 1.5 * (100 - h) / 50;

  // Orange  20–50°   →  3.5–5 %
  if (h >= 20 && h < 50) return 3.5 + 1.5 * (50 - h) / 30;

  // Red  0–20° or 345–360°  →  5–6 %
  if (h < 20)   return 5 + (20 - h) / 20;
  if (h >= 345) return 5 + (360 - h) / 15;

  // Pink  280–345°   →  6 %+
  if (h >= 280 && h < 345) return 6.5;

  return null;
}

// Route through the Vite /cf-img proxy in the browser so canvas.getImageData()
// doesn't throw a tainted-canvas CORS error. The native Capacitor build uses
// the direct URL (no CORS restriction in the native layer).
export function toCanvasUrl(imageUrl: string): string {
  const isCapacitor = !!(window as unknown as Record<string, unknown>).Capacitor;
  if (isCapacitor) return imageUrl;
  try {
    const u = new URL(imageUrl);
    if (u.hostname.includes('cloudfront.net')) {
      return '/cf-img' + u.pathname + u.search;
    }
  } catch { /* */ }
  return imageUrl;
}

function toProxyUrl(imageUrl: string): string {
  try {
    const u = new URL(imageUrl);
    return u.hostname.includes('cloudfront.net')
      ? '/cf-img' + u.pathname + u.search
      : imageUrl;
  } catch { return imageUrl; }
}

// ── Clock key lookup ──────────────────────────────────────────────────────────
// Clock position = where the ball sits relative to the hole on the fall line:
//   12 = ball directly uphill   → downhill putt
//    6 = ball directly downhill → uphill putt
//    3 = ball right of fall line (break left)
//    9 = ball left of fall line (break right)
//
// The user taps the uphill direction on the elevation image overlay; the angle
// between that tap and the ball tap determines the clock key.

const CLOCK_ENTRIES: { key: string; theta: number }[] = [
  { key: '12',   theta: 0 },
  { key: '1',    theta: Math.PI / 6 },
  { key: '1.5',  theta: Math.PI / 4 },
  { key: '2',    theta: Math.PI / 3 },
  { key: '3',    theta: Math.PI / 2 },
  { key: '4',    theta: 2 * Math.PI / 3 },
  { key: '4.5',  theta: 3 * Math.PI / 4 },
  { key: '5',    theta: 5 * Math.PI / 6 },
  { key: '6',    theta: Math.PI },
  { key: '7',    theta: 7 * Math.PI / 6 },
  { key: '7.5',  theta: 5 * Math.PI / 4 },
  { key: '8',    theta: 4 * Math.PI / 3 },
  { key: '9',    theta: 3 * Math.PI / 2 },
  { key: '10',   theta: 5 * Math.PI / 3 },
  { key: '10.5', theta: 7 * Math.PI / 4 },
  { key: '11',   theta: 11 * Math.PI / 6 },
];

/** Snaps a radian angle to the nearest clock key string.
 *  theta=0 → '12', theta=π/2 → '3', theta=π → '6', theta=3π/2 → '9'.
 *  Exported so GreenSlopePanel can compute the key from user tap angles. */
export function nearestClockKey(theta: number): string {
  const t = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let best = CLOCK_ENTRIES[0].key;
  let bestDiff = Infinity;
  for (const { key, theta: ct } of CLOCK_ENTRIES) {
    let diff = Math.abs(t - ct);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < bestDiff) { bestDiff = diff; best = key; }
  }
  return best;
}

interface NormPoint { x: number; y: number; }

export interface PuttInference {
  slope: number | null; // %, rounded to nearest 0.1
}

// ── Canvas loader ─────────────────────────────────────────────────────────────

function loadCanvasCtx(url: string): Promise<CanvasRenderingContext2D | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = IMG_W; canvas.height = IMG_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
      resolve(ctx);
    };
    img.src = toProxyUrl(url);
  });
}

/**
 * Replaces non-green-surface pixels with the app's dark green (#013c36)
 * so the slope image blends into the app's colour scheme.
 *
 * Keeps:
 *   • Pixels whose hue falls within any GI slope colour band (with a slightly
 *     looser saturation threshold to catch the flattest blues near boundaries)
 *   • Bright pixels (l > 0.78) — white/near-white label text and hole markers
 *
 * Everything else (satellite rough, compass, bunkers, sky) is painted #013c36.
 *
 * Returns a JPEG data-URL of the processed image, or null on failure.
 */
export function processImageForDisplay(imageUrl: string): Promise<string | null> {
  return loadCanvasCtx(imageUrl).then(ctx => {
    if (!ctx) return null;
    const { width, height } = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 50) continue;
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);

      const isSlopeColour =
        s >= 0.06 && l >= 0.07 && l <= 0.97 && (
          (h >= 200 && h <= 265) ||  // blue   0–2 %
          (h >  100 && h <  200) ||  // green  2–3.5 %
          (h >=  50 && h <= 100) ||  // yellow 3.5–5 %
          (h >=  20 && h <   50) ||  // orange 3.5–5 %
          (h <   20)             ||  // red    5–6 %
          (h >= 345)             ||  // red (wrap)
          (h >= 280 && h <  345)     // pink   6 %+
        );

      const isBright = l > 0.78; // white labels, hole markers, contour text

      if (!isSlopeColour && !isBright) {
        d[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return ctx.canvas.toDataURL('image/png');
  }).catch(() => null);
}

/**
 * Infers slope % from a GI slope image.
 *
 * Loads the image through the /cf-img same-origin proxy so
 * canvas.getImageData() works without CORS errors.
 *
 * Slope sampling: physics-weighted along the putt line (t = 0.05 → 0.85).
 * Each sample is weighted by 1/√(T_END − t + ε) — approximating the time a
 * decelerating ball spends near each point (slower near the hole = higher
 * weight).  A 33rd-percentile of the weighted distribution corrects for GI's
 * saturation bias (steep colours are more vivid than flat blues).  A 0.79
 * scale factor corrects residual over-estimation from colour/satellite
 * blending (empirically calibrated on course).
 *
 * Clock position is NOT computed here — it is set by the user tapping the
 * uphill direction on the elevation image overlay in GreenSlopePanel.
 */
export function inferPuttFromImage(
  imageUrl: string,
  ballNorm: NormPoint,
  holeNorm: NormPoint,
): Promise<PuttInference> {
  return loadCanvasCtx(imageUrl).then(slopeCtx => {
    if (!slopeCtx) return { slope: null };
    const sc = slopeCtx;

    function slopeAt(nx: number, ny: number): number | null {
      const px = Math.round(Math.max(0, Math.min(IMG_W - 1, nx * IMG_W)));
      const py = Math.round(Math.max(0, Math.min(IMG_H - 1, ny * IMG_H)));
      const d = sc.getImageData(px, py, 1, 1).data;
      return classifyPixel(d[0], d[1], d[2], d[3]);
    }

    const T_START = 0.05;
    const T_END   = 0.85;
    const N_SLOPE = 20;
    const slopePts = Array.from({ length: N_SLOPE }, (_, i) => {
      const t = T_START + (i / (N_SLOPE - 1)) * (T_END - T_START);
      const w = 1 / Math.sqrt(T_END - t + 0.05);
      return {
        x: ballNorm.x + t * (holeNorm.x - ballNorm.x),
        y: ballNorm.y + t * (holeNorm.y - ballNorm.y),
        w,
      };
    });

    const weightedVals: number[] = [];
    for (const p of slopePts) {
      const v = slopeAt(p.x, p.y);
      if (v !== null) {
        const copies = Math.max(1, Math.round(p.w * 10));
        for (let k = 0; k < copies; k++) weightedVals.push(v);
      }
    }
    weightedVals.sort((a, b) => a - b);
    const slope = weightedVals.length
      ? Math.round(weightedVals[Math.floor(weightedVals.length * 0.33)] * 0.79 * 10) / 10
      : null;

    return { slope };
  }).catch(() => ({ slope: null }));
}
