import type { FaceLandmarkerResult } from './face'

// Последнее снятое фото живёт только в памяти вкладки и общее для «Анализа» и «Кожи».
export interface Capture { img: HTMLCanvasElement; res: FaceLandmarkerResult; at: number }
let current: Capture | null = null
const subs = new Set<() => void>()
export const getCapture = () => current
export function setCapture(c: Capture | null) { current = c; subs.forEach((f) => f()) }
export function subscribeCapture(f: () => void) { subs.add(f); return () => { subs.delete(f) } }
