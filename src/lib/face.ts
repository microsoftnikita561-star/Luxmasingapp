import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

// MediaPipe Face Landmarker: 478 3D-точек лица + 52 мимических коэффициента (blendshapes).
// Модель и wasm лежат локально в /public — фото никуда не отправляются.
const BASE = import.meta.env.BASE_URL

let imageLm: Promise<FaceLandmarker> | null = null
let videoLm: Promise<FaceLandmarker> | null = null

async function create(mode: 'IMAGE' | 'VIDEO'): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`)
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate },
    runningMode: mode,
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  })
  try {
    return await FaceLandmarker.createFromOptions(fileset, opts('GPU'))
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, opts('CPU'))
  }
}

export function getImageLandmarker() {
  if (!imageLm) imageLm = create('IMAGE')
  return imageLm
}
export function getVideoLandmarker() {
  if (!videoLm) videoLm = create('VIDEO')
  return videoLm
}

export type { FaceLandmarkerResult }
export const TESSELATION = FaceLandmarker.FACE_LANDMARKS_TESSELATION

export function blendshapeMap(res: FaceLandmarkerResult): Record<string, number> {
  const out: Record<string, number> = {}
  const cats = res.faceBlendshapes?.[0]?.categories ?? []
  for (const c of cats) out[c.categoryName] = c.score
  return out
}

/** Углы поворота головы (градусы) из матрицы трансформации. */
export function headPose(res: FaceLandmarkerResult): { yaw: number; pitch: number; roll: number } | null {
  const m = res.facialTransformationMatrixes?.[0]?.data
  if (!m) return null
  // column-major 4x4
  const r00 = m[0], r10 = m[1], r20 = m[2]
  const r21 = m[6], r22 = m[10]
  const deg = 180 / Math.PI
  const pitch = Math.atan2(r21, r22) * deg
  const yaw = Math.atan2(-r20, Math.hypot(r21, r22)) * deg
  const roll = Math.atan2(r10, r00) * deg
  return { yaw, pitch, roll }
}
