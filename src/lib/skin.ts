// Детектор воспалений кожи. Работает на устройстве:
// 1) по точкам лица строится маска кожи (без глаз, бровей, губ, ноздрей);
// 2) для каждого пикселя считается «краснота» (канал a* в CIELAB);
// 3) ищутся компактные пятна, которые заметно краснее окружающей кожи.
// Это оценка, а не диагноз: свет, родинки и румянец дают ошибки,
// поэтому пользователь может снять отметку с любой точки.

type NLm = { x: number; y: number }

export type Zone = 'forehead' | 'cheekL' | 'cheekR' | 'nose' | 'chin'
export const ZONE_NAMES: Record<Zone, string> = {
  forehead: 'Лоб', cheekL: 'Левая щека', cheekR: 'Правая щека', nose: 'Нос', chin: 'Подбородок',
}

export interface Spot {
  id: number
  x: number // в долях исходного изображения
  y: number
  r: number // радиус в долях ширины изображения
  strength: number // насколько краснее фона (ΔE по a*)
  kind: 'inflamed' | 'mark'
  zone: Zone
}

export interface SkinResult {
  spots: Spot[]
  redness: number // 0..100 общий индекс покраснения
  evenness: number // 0..100 ровность тона
  lighting: 'ok' | 'dark' | 'bright' | 'uneven'
  faceWidthPx: number
}

const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
const EYE_R = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
const EYE_L = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]
const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
const BROW_R = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
const BROW_L = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
const NOSE_BASE = [129, 98, 2, 327, 358, 4]

const W = 512 // рабочая ширина лица

function srgbToLab(r: number, g: number, b: number): [number, number, number] {
  const f = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const R = f(r), G = f(g), B = f(b)
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const g3 = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = g3(X), fy = g3(Y), fz = g3(Z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function analyzeSkin(src: HTMLCanvasElement, lms: NLm[]): SkinResult {
  // Область лица
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const i of OVAL) { const p = lms[i]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  const sx = x0 * src.width, sy = y0 * src.height
  const sw = (x1 - x0) * src.width, sh = (y1 - y0) * src.height
  const scale = W / sw
  const H = Math.round(sh * scale)
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, W, H)
  const img = ctx.getImageData(0, 0, W, H).data

  const P = (i: number) => ({ x: (lms[i].x * src.width - sx) * scale, y: (lms[i].y * src.height - sy) * scale })

  // Маска кожи
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H
  const m = mc.getContext('2d', { willReadFrequently: true })!
  const poly = (idx: number[]) => { m.beginPath(); idx.forEach((i, k) => { const p = P(i); if (k) m.lineTo(p.x, p.y); else m.moveTo(p.x, p.y) }); m.closePath() }
  m.fillStyle = '#fff'; poly(OVAL); m.fill()
  m.strokeStyle = '#000'; m.lineJoin = 'round'
  m.lineWidth = W * 0.07; poly(OVAL); m.stroke() // отступ от края лица (волосы, фон, уши)
  m.fillStyle = '#000'
  for (const [ring, pad] of [[EYE_R, 0.06], [EYE_L, 0.06], [LIPS, 0.035], [BROW_R, 0.04], [BROW_L, 0.04], [NOSE_BASE, 0.03]] as [number[], number][]) {
    poly(ring); m.fill(); m.lineWidth = W * pad; m.stroke()
  }
  const md = m.getImageData(0, 0, W, H).data
  const N = W * H
  const mask = new Uint8Array(N)
  const A = new Float32Array(N), Lm = new Float32Array(N)
  let nMask = 0, sumL = 0, sumA = 0
  for (let i = 0; i < N; i++) {
    if (md[i * 4] > 128) {
      const [L, a] = srgbToLab(img[i * 4], img[i * 4 + 1], img[i * 4 + 2])
      // блики и глубокие тени исключаем
      if (L > 18 && L < 96) { mask[i] = 1; A[i] = a; Lm[i] = L; nMask++; sumL += L; sumA += a }
    }
  }
  if (nMask < 2000) return { spots: [], redness: 0, evenness: 0, lighting: 'dark', faceWidthPx: sw }
  const meanL = sumL / nMask, meanA = sumA / nMask

  // Локальный фон: среднее a* и L в окне (интегральные изображения с учётом маски)
  const iw = W + 1
  const IA = new Float64Array(iw * (H + 1)), IL = new Float64Array(iw * (H + 1)), IM = new Float64Array(iw * (H + 1))
  for (let y = 0; y < H; y++) {
    let ra = 0, rl = 0, rm = 0
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (mask[i]) { ra += A[i]; rl += Lm[i]; rm++ }
      const j = (y + 1) * iw + x + 1
      IA[j] = IA[j - iw] + ra; IL[j] = IL[j - iw] + rl; IM[j] = IM[j - iw] + rm
    }
  }
  const R = Math.round(W * 0.055)
  const box = (I: Float64Array, x: number, y: number) => {
    const xa = Math.max(0, x - R), ya = Math.max(0, y - R), xb = Math.min(W, x + R + 1), yb = Math.min(H, y + R + 1)
    return I[yb * iw + xb] - I[ya * iw + xb] - I[yb * iw + xa] + I[ya * iw + xa]
  }
  const D = new Float32Array(N)
  let sd = 0, sdl = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!mask[i]) continue
    const cnt = box(IM, x, y)
    if (cnt < R * R * 0.6) { mask[i] = 0; nMask--; continue } // у края маски фон ненадёжен
    const da = A[i] - box(IA, x, y) / cnt
    const dl = Lm[i] - box(IL, x, y) / cnt
    D[i] = da
    sd += da * da; sdl += dl * dl
  }
  const sigma = Math.sqrt(sd / nMask)
  const sigmaL = Math.sqrt(sdl / nMask)
  const thr = Math.max(4.2, sigma * 2.4)

  // Связные области выше порога
  const lab = new Int32Array(N)
  const spots: Spot[] = []
  const stack: number[] = []
  const minArea = Math.round((W * 0.007) ** 2 * Math.PI)
  const maxArea = Math.round((W * 0.05) ** 2 * Math.PI)
  const browY = Math.min(P(105).y, P(334).y)
  const mouthY = P(17).y, noseL = P(129).x, noseR = P(358).x, noseTop = P(168).y, noseBot = P(2).y, midX = P(1).x
  let id = 0
  for (let s = 0; s < N; s++) {
    if (!mask[s] || lab[s] || D[s] < thr) continue
    id++
    let area = 0, cx = 0, cy = 0, peak = 0, sum = 0, bx0 = W, by0 = H, bx1 = 0, by1 = 0
    stack.push(s); lab[s] = id
    while (stack.length) {
      const i = stack.pop()!
      const x = i % W, y = (i / W) | 0
      area++; cx += x; cy += y; sum += D[i]; if (D[i] > peak) peak = D[i]
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= N || lab[j] || !mask[j] || D[j] < thr * 0.75) continue
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === W - 1)) continue
        lab[j] = id; stack.push(j)
      }
    }
    if (area < minArea || area > maxArea) continue
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1
    const aspect = Math.max(bw, bh) / Math.min(bw, bh)
    const fill = area / (bw * bh)
    if (aspect > 2.2 || fill < 0.42) continue // вытянутое — складка, сосуд, край тени
    cx /= area; cy /= area
    const strength = sum / area
    let zone: Zone
    if (cy < browY) zone = 'forehead'
    else if (cy > mouthY) zone = 'chin'
    else if (cx > noseL && cx < noseR && cy > noseTop && cy < noseBot + W * 0.02) zone = 'nose'
    else if (cy > mouthY - W * 0.04 && Math.abs(cx - midX) < W * 0.16) zone = 'chin'
    else zone = cx < midX ? 'cheekR' : 'cheekL'
    spots.push({
      id,
      x: (cx / scale + sx) / src.width,
      y: (cy / scale + sy) / src.height,
      r: (Math.sqrt(area / Math.PI) * 1.9) / scale / src.width,
      strength,
      kind: peak > thr * 1.7 && strength > thr * 1.15 ? 'inflamed' : 'mark',
      zone,
    })
  }
  spots.sort((a, b) => b.strength - a.strength)

  const redness = Math.max(0, Math.min(100, Math.round((meanA - 8) * 5.5)))
  const evenness = Math.max(0, Math.min(100, Math.round(100 - (sigma - 1.2) * 14 - (sigmaL - 3) * 4)))
  // освещение: сравниваем яркость левой и правой половины
  let lL = 0, nL = 0, lR = 0, nR = 0
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = y * W + x; if (!mask[i]) continue; if (x < midX) { lL += Lm[i]; nL++ } else { lR += Lm[i]; nR++ } }
  const side = Math.abs(lL / Math.max(1, nL) - lR / Math.max(1, nR))
  const lighting = meanL < 38 ? 'dark' : meanL > 86 ? 'bright' : side > 12 ? 'uneven' : 'ok'

  return { spots: spots.slice(0, 80), redness, evenness, lighting, faceWidthPx: sw }
}

export type Severity = 'clear' | 'mild' | 'moderate' | 'severe'

export function gradeAcne(spots: Spot[]): { severity: Severity; inflamed: number; marks: number; byZone: Record<Zone, number> } {
  const byZone: Record<Zone, number> = { forehead: 0, cheekL: 0, cheekR: 0, nose: 0, chin: 0 }
  let inflamed = 0, marks = 0
  for (const s of spots) { byZone[s.zone]++; if (s.kind === 'inflamed') inflamed++; else marks++ }
  const score = inflamed + marks * 0.4
  const severity: Severity = score < 3 ? 'clear' : score < 11 ? 'mild' : score < 26 ? 'moderate' : 'severe'
  return { severity, inflamed, marks, byZone }
}

export const SEVERITY_NAMES: Record<Severity, string> = {
  clear: 'Чистая кожа', mild: 'Лёгкая степень', moderate: 'Средняя степень', severe: 'Выраженные высыпания',
}
