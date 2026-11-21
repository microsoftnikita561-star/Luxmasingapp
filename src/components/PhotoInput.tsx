import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getImageLandmarker } from '../lib/face'
import { getCapture, setCapture, subscribeCapture, type Capture } from '../lib/session'
import { Icon } from './Icon'

export const useCapture = () => useSyncExternalStore(subscribeCapture, getCapture)

async function detect(source: CanvasImageSource, w: number, h: number): Promise<Capture | null> {
  const lm = await getImageLandmarker()
  const scale = Math.min(1, 1600 / Math.max(w, h))
  let img = document.createElement('canvas')
  img.width = Math.round(w * scale); img.height = Math.round(h * scale)
  img.getContext('2d')!.drawImage(source, 0, 0, img.width, img.height)
  let res = lm.detect(img)
  if (!res.faceLandmarks.length) return null
  // Лицо мелкое → вырезаем область вокруг лица и ищем точки повторно
  const l = res.faceLandmarks[0]
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const q of l) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
  if (y1 - y0 < 0.5) {
    const cx = ((x0 + x1) / 2) * img.width, cy = ((y0 + y1) / 2) * img.height
    const side = Math.min(Math.max(img.width, img.height), (y1 - y0) * img.height * 1.7)
    const sx = Math.max(0, cx - side / 2), sy = Math.max(0, cy - side / 2)
    const sw = Math.min(img.width - sx, side), sh = Math.min(img.height - sy, side)
    const k = Math.min(1280 / Math.max(sw, sh), 3)
    const crop = document.createElement('canvas')
    crop.width = Math.round(sw * k); crop.height = Math.round(sh * k)
    const c = crop.getContext('2d')!
    c.imageSmoothingQuality = 'high'
    c.drawImage(img, sx, sy, sw, sh, 0, 0, crop.width, crop.height)
    const r2 = lm.detect(crop)
    if (r2.faceLandmarks.length) { res = r2; img = crop }
  }
  return { img, res, at: Date.now() }
}

export function PhotoInput({ hint }: { hint: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cam, setCam] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => { getImageLandmarker().catch(() => {}); return () => stopCam() }, [])

  async function run(source: CanvasImageSource, w: number, h: number) {
    setError(null); setBusy('Ищу точки лица…')
    try {
      const cap = await detect(source, w, h)
      if (!cap) setError('Лицо не найдено. Нужна чёткая фотография анфас при хорошем освещении.')
      else setCapture(cap)
    } catch (e) { setError('Не удалось запустить модель: ' + (e as Error).message) }
    setBusy(null)
  }
  function onFile(f: File) {
    const url = URL.createObjectURL(f)
    const im = new Image()
    im.onload = () => { run(im, im.naturalWidth, im.naturalHeight).finally(() => URL.revokeObjectURL(url)) }
    im.onerror = () => setError('Не удалось открыть изображение')
    im.src = url
  }
  async function startCam() {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } })
      streamRef.current = s; setCam(true)
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play() } }, 0)
    } catch { setError('Нет доступа к камере. Разрешите доступ или загрузите фото.') }
  }
  function stopCam() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCam(false) }
  function snap() { const v = videoRef.current; if (!v) return; run(v, v.videoWidth, v.videoHeight); stopCam() }

  return (
    <div className="stack">
      {cam ? (
        <div className="stack">
          <div className="canvas-wrap" style={{ maxWidth: 560 }}><video ref={videoRef} playsInline muted style={{ transform: 'scaleX(-1)' }} /></div>
          <div className="row"><button className="btn primary" onClick={snap}><Icon name="camera" />Сделать снимок</button><button className="btn ghost" onClick={stopCam}>Отмена</button></div>
        </div>
      ) : (
        <div className="grid g2">
          <button className="drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}>
            <Icon name="upload" /><div><b>Загрузить фото</b></div><div className="small muted">{hint}</div>
          </button>
          <button className="drop" onClick={startCam}>
            <Icon name="camera" /><div><b>Снять с камеры</b></div><div className="small muted">Камера на уровне глаз, лицо прямо</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
        </div>
      )}
      {busy && <div className="muted">{busy}</div>}
      {error && <div className="warn"><b>Не получилось</b>{error}</div>}
    </div>
  )
}
