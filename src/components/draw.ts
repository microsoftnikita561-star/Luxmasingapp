import { TESSELATION } from '../lib/face'

type NLm = { x: number; y: number }

export function drawMesh(ctx: CanvasRenderingContext2D, lms: NLm[], w: number, h: number, opts: { alpha?: number; color?: string; mirror?: boolean } = {}) {
  const X = (p: NLm) => (opts.mirror ? 1 - p.x : p.x) * w
  ctx.save()
  ctx.strokeStyle = opts.color ?? `rgba(230, 194, 122, ${opts.alpha ?? 0.22})`
  ctx.lineWidth = Math.max(0.5, w / 1400)
  ctx.beginPath()
  for (const c of TESSELATION) {
    const a = lms[c.start], b = lms[c.end]
    if (!a || !b) continue
    ctx.moveTo(X(a), a.y * h)
    ctx.lineTo(X(b), b.y * h)
  }
  ctx.stroke()
  ctx.restore()
}

export function drawLines(ctx: CanvasRenderingContext2D, lms: NLm[], w: number, h: number, pairs: [number, number][], color = '#8f7bff') {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2, w / 350)
  ctx.shadowColor = 'rgba(0,0,0,.6)'
  ctx.shadowBlur = 4
  for (const [i, j] of pairs) {
    const a = lms[i], b = lms[j]
    ctx.beginPath()
    ctx.moveTo(a.x * w, a.y * h)
    ctx.lineTo(b.x * w, b.y * h)
    ctx.stroke()
    for (const p of [a, b]) {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, Math.max(3, w / 220), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

export function drawPoints(ctx: CanvasRenderingContext2D, lms: NLm[], w: number, h: number, idx: number[], color = '#ffffff') {
  ctx.save()
  ctx.fillStyle = color
  const r = Math.max(1.5, w / 450)
  for (const i of idx) {
    const p = lms[i]
    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Квадратная миниатюра лица для истории прогресса */
export function faceThumb(src: CanvasImageSource, lms: NLm[], w: number, h: number, size = 240): string {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const p of lms) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  const cx = ((x0 + x1) / 2) * w, cy = ((y0 + y1) / 2) * h
  const s = Math.max((x1 - x0) * w, (y1 - y0) * h) * 1.35
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, cx - s / 2, cy - s / 2, s, s, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.72)
}
