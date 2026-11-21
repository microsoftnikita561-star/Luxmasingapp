// Геометрический анализ лица по 478 точкам MediaPipe Face Mesh.
// Все величины — отношения, поэтому не зависят от размера фото.
// Важно: это геометрия на 2D-фото, а не «оценка красоты». Свет, ракурс,
// линза камеры и мимика заметно влияют на результат.

export type Sex = 'male' | 'female'
export type Pt = { x: number; y: number }
export type Modifiability = 'high' | 'medium' | 'low'

export interface Metric {
  id: string
  name: string
  value: number
  display: string
  ideal: [number, number]
  idealDisplay: string
  score: number // 0..100
  weight: number
  what: string
  verdict: string
  modifiable: Modifiability
  levers: string[]
  lines: [number, number][] // пары точек для визуализации
}

export interface FaceShape {
  id: 'oval' | 'round' | 'square' | 'oblong' | 'heart' | 'diamond'
  name: string
  hair: string[]
  beard: string[]
  glasses: string[]
}

export interface Analysis {
  date: number
  sex: Sex
  harmony: number
  symmetry: number
  metrics: Metric[]
  shape: FaceShape
  warnings: string[]
  pose: { yaw: number; pitch: number; roll: number } | null
}

// ——— Индексы ключевых точек ———
export const L = {
  top: 10,
  glabella: 9,
  nasion: 168,
  noseTip: 4,
  subnasale: 2,
  lipTop: 0,
  stomionU: 13,
  stomionL: 14,
  lipBottom: 17,
  menton: 152,
  irisR: 468,
  irisL: 473,
  eyeOuterR: 33,
  eyeInnerR: 133,
  eyeInnerL: 362,
  eyeOuterL: 263,
  lidTopR: 159,
  lidBotR: 145,
  lidTopL: 386,
  lidBotL: 374,
  browLowR: 52,
  browLowL: 282,
  zygR: 234,
  zygL: 454,
  gonR: 172,
  gonL: 397,
  alarR: 129,
  alarL: 358,
  mouthR: 61,
  mouthL: 291,
  templeR: 54,
  templeL: 284,
  chinR: 176,
  chinL: 400,
}

// Симметричные пары точек (правая сторона ↔ левая сторона)
const PAIRS: [number, number][] = [
  [33, 263], [133, 362], [159, 386], [145, 374], [61, 291], [234, 454], [172, 397],
  [105, 334], [70, 300], [52, 282], [46, 276], [55, 285], [107, 336], [66, 296],
  [64, 294], [129, 358], [98, 327], [48, 278], [58, 288], [127, 356], [93, 323],
  [132, 361], [136, 365], [149, 378], [176, 400], [148, 377], [117, 346], [118, 347],
  [101, 330], [205, 425], [207, 427], [50, 280], [162, 389], [21, 251], [54, 284],
  [103, 332], [67, 297], [109, 338], [40, 270], [37, 267], [39, 269], [84, 314],
  [91, 321], [181, 405], [146, 375],
]
const MIDLINE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 2, 164, 0, 13, 14, 17, 18, 200, 199, 175, 152]

const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Перевод нормализованных точек в пиксели + выравнивание по линии зрачков (убираем наклон головы). */
export function toAlignedPoints(lms: { x: number; y: number }[], w: number, h: number): Pt[] {
  const px = lms.map((p) => ({ x: p.x * w, y: p.y * h }))
  const a = px[L.irisR], b = px[L.irisL]
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const c = mid(a, b)
  const cos = Math.cos(-ang), sin = Math.sin(-ang)
  return px.map((p) => {
    const dx = p.x - c.x, dy = p.y - c.y
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
  })
}

function rangeScore(v: number, [lo, hi]: [number, number], tol?: number): number {
  if (v >= lo && v <= hi) return 100
  const t = tol ?? (hi - lo) * 1.5
  const dist = v < lo ? lo - v : v - hi
  return Math.max(0, Math.round(100 - (dist / t) * 60))
}

function symmetryScore(p: Pt[]): number {
  // Подгоняем вертикальную среднюю линию x = k*y + b по точкам центра лица
  const pts = MIDLINE.map((i) => p[i])
  const n = pts.length
  const my = pts.reduce((s, q) => s + q.y, 0) / n
  const mx = pts.reduce((s, q) => s + q.x, 0) / n
  let num = 0, den = 0
  for (const q of pts) { num += (q.y - my) * (q.x - mx); den += (q.y - my) ** 2 }
  const k = den ? num / den : 0
  const b = mx - k * my
  // нормаль к линии
  const norm = Math.hypot(1, k)
  const signedDist = (q: Pt) => (q.x - (k * q.y + b)) / norm
  const width = d(p[L.zygR], p[L.zygL])
  let err = 0
  for (const [r, l] of PAIRS) {
    const dr = signedDist(p[r]), dl = signedDist(p[l])
    // расстояния до средней линии должны быть равны по модулю, высоты — совпадать
    const horiz = Math.abs(Math.abs(dr) - Math.abs(dl))
    const vert = Math.abs(p[r].y - p[l].y)
    err += Math.hypot(horiz, vert) / width
  }
  err /= PAIRS.length
  // err ~0.01 — очень симметрично, ~0.05 — заметная асимметрия (или поворот головы)
  return Math.max(0, Math.min(100, Math.round(100 - (err - 0.008) * 1400)))
}

const f2 = (v: number) => v.toFixed(2)

export function analyze(
  lms: { x: number; y: number }[],
  w: number,
  h: number,
  sex: Sex,
  pose: { yaw: number; pitch: number; roll: number } | null,
): Analysis {
  const p = toAlignedPoints(lms, w, h)
  const P = (i: number) => p[i]
  const male = sex === 'male'

  const bizyg = d(P(L.zygR), P(L.zygL))
  const jaw = d(P(L.gonR), P(L.gonL))
  const ipd = d(P(L.irisR), P(L.irisL))
  const icd = d(P(L.eyeInnerR), P(L.eyeInnerL))
  const eyeWR = d(P(L.eyeOuterR), P(L.eyeInnerR))
  const eyeWL = d(P(L.eyeInnerL), P(L.eyeOuterL))
  const eyeW = (eyeWR + eyeWL) / 2
  const noseW = d(P(L.alarR), P(L.alarL))
  const mouthW = d(P(L.mouthR), P(L.mouthL))
  const pupilY = (P(L.irisR).y + P(L.irisL).y) / 2
  const lidTopY = (P(L.lidTopR).y + P(L.lidTopL).y) / 2
  const stomion = mid(P(L.stomionU), P(L.stomionL))

  // Кантальный наклон: внешний уголок выше внутреннего → положительный угол
  const canthalDeg = ((Math.atan2(P(L.eyeInnerR).y - P(L.eyeOuterR).y, Math.abs(P(L.eyeInnerR).x - P(L.eyeOuterR).x)) +
    Math.atan2(P(L.eyeInnerL).y - P(L.eyeOuterL).y, Math.abs(P(L.eyeOuterL).x - P(L.eyeInnerL).x))) / 2) * (180 / Math.PI)

  const fwhr = bizyg / (P(L.lipTop).y - lidTopY)
  const midface = ipd / (P(L.lipTop).y - pupilY)
  const esr = ipd / bizyg
  const middleThird = P(L.subnasale).y - P(L.glabella).y
  const lowerThird = P(L.menton).y - P(L.subnasale).y
  const thirds = lowerThird / middleThird
  const chinPhiltrum = (P(L.menton).y - stomion.y) / (stomion.y - P(L.subnasale).y)
  const jawCheek = jaw / bizyg
  const noseIcd = noseW / icd
  const mouthNose = mouthW / noseW
  const fifths = icd / eyeW
  const eyeOpen = ((d(P(L.lidTopR), P(L.lidBotR)) / eyeWR) + (d(P(L.lidTopL), P(L.lidBotL)) / eyeWL)) / 2
  const lipRatio = (P(L.lipBottom).y - P(L.stomionL).y) / Math.max(1, P(L.stomionU).y - P(L.lipTop).y)
  const browEye = (((P(L.lidTopR).y - P(L.browLowR).y) + (P(L.lidTopL).y - P(L.browLowL).y)) / 2) / eyeW
  const faceLen = (P(L.menton).y - P(L.top).y) / bizyg
  const foreheadW = d(P(L.templeR), P(L.templeL)) / bizyg

  const sym = symmetryScore(p)

  const M = (m: Omit<Metric, 'score' | 'idealDisplay'> & { tol?: number; fmt?: (v: number) => string }): Metric => {
    const fmt = m.fmt ?? f2
    return {
      ...m,
      score: rangeScore(m.value, m.ideal, m.tol),
      idealDisplay: `${fmt(m.ideal[0])}–${fmt(m.ideal[1])}`,
    }
  }
  const lowHigh = (v: number, r: [number, number], low: string, high: string, ok: string) =>
    v < r[0] ? low : v > r[1] ? high : ok

  const metrics: Metric[] = []

  {
    const ideal: [number, number] = [4, 8]
    metrics.push(M({
      id: 'canthal', name: 'Кантальный наклон', value: canthalDeg, display: `${canthalDeg.toFixed(1)}°`, ideal, weight: 1.2, tol: 6,
      fmt: (v) => `${v}°`,
      what: 'Угол линии от внутреннего к внешнему уголку глаза. Положительный (внешний уголок выше) считается «привлекательным» и бодрым.',
      verdict: lowHigh(canthalDeg, ideal, 'Наклон нейтральный или отрицательный — взгляд может читаться уставшим/грустным.', 'Сильно положительный наклон — выразительный «кошачий» разрез.', 'Позитивный наклон в гармоничном диапазоне.'),
      modifiable: 'low',
      levers: ['Форма и высота бровей (хвостик брови чуть выше головки) визуально поднимает внешний уголок', 'Сон 7–9 ч и меньше соли вечером — меньше отёков век', 'Для девушек: стрелки и растушёвка теней вверх-наружу', 'Не верьте «упражнениям для подъёма уголков» — костную основу они не меняют'],
      lines: [[L.eyeInnerR, L.eyeOuterR], [L.eyeInnerL, L.eyeOuterL]],
    }))
  }
  {
    const ideal: [number, number] = male ? [1.9, 2.15] : [1.8, 2.0]
    metrics.push(M({
      id: 'fwhr', name: 'FWHR (ширина/высота лица)', value: fwhr, display: f2(fwhr), ideal, weight: 1,
      what: 'Ширина по скулам, делённая на высоту от век до верхней губы. Высокий FWHR воспринимается как более «доминантный», компактное лицо.',
      verdict: lowHigh(fwhr, ideal, 'Лицо вытянутое по средней зоне относительно ширины.', 'Очень широкое лицо относительно высоты средней зоны.', 'Пропорция в хорошем диапазоне.'),
      modifiable: 'medium',
      levers: ['Снижение процента жира подчёркивает скулы (ширину по кости)', 'Объём причёски по бокам визуально расширяет, по верху — вытягивает', 'Борода/щетина по линии челюсти меняет восприятие нижней части'],
      lines: [[L.zygR, L.zygL]],
    }))
  }
  {
    const ideal: [number, number] = [0.95, 1.08]
    metrics.push(M({
      id: 'midface', name: 'Средняя зона (midface ratio)', value: midface, display: f2(midface), ideal, weight: 1,
      what: 'Межзрачковое расстояние к расстоянию от зрачков до верхней губы. ≈1.0 — «компактная» средняя зона, которая считается молодой и гармоничной.',
      verdict: lowHigh(midface, ideal, 'Средняя зона длинновата относительно ширины глаз.', 'Очень компактная средняя зона.', 'Средняя зона компактная и гармоничная.'),
      modifiable: 'low',
      levers: ['Усы/щетина над губой визуально укорачивают среднюю зону', 'Чёлка или текстурный верх уменьшают общий вертикальный акцент', 'Фото: камера на уровне глаз или чуть выше, не снизу'],
      lines: [[L.irisR, L.irisL]],
    }))
  }
  {
    const ideal: [number, number] = [0.44, 0.48]
    metrics.push(M({
      id: 'esr', name: 'Посадка глаз (ESR)', value: esr, display: f2(esr), ideal, weight: 0.8, tol: 0.04,
      what: 'Межзрачковое расстояние, делённое на ширину лица по скулам. Около 0.46 — сбалансированная посадка.',
      verdict: lowHigh(esr, ideal, 'Глаза посажены относительно близко к центру лица.', 'Глаза посажены относительно широко.', 'Посадка глаз сбалансирована.'),
      modifiable: 'low',
      levers: ['Близко посаженные: осветлять внутренний уголок, брови не сводить к переносице', 'Широко посаженные: акцент на внутренней трети брови, оправы с тёмной перемычкой'],
      lines: [[L.irisR, L.irisL], [L.zygR, L.zygL]],
    }))
  }
  {
    const ideal: [number, number] = male ? [1.0, 1.15] : [0.95, 1.08]
    metrics.push(M({
      id: 'thirds', name: 'Нижняя / средняя треть', value: thirds, display: f2(thirds), ideal, weight: 1,
      what: 'Классическое правило третей: средняя (брови→основание носа) и нижняя (нос→подбородок) трети примерно равны. У мужчин чуть длиннее нижняя.',
      verdict: lowHigh(thirds, ideal, 'Нижняя треть коротковата — подбородок может казаться слабым.', 'Нижняя треть длинная относительно средней.', 'Трети лица сбалансированы.'),
      modifiable: 'medium',
      levers: ['Короткая нижняя треть: борода с удлинением на подбородке, правильная осанка языка/головы на фото', 'Длинная нижняя треть: борода по бокам, а не вниз; объём причёски по бокам', 'Ортодонт/челюстно-лицевой хирург — если есть проблемы с прикусом'],
      lines: [[L.glabella, L.subnasale], [L.subnasale, L.menton]],
    }))
  }
  {
    const ideal: [number, number] = [1.9, 2.4]
    metrics.push(M({
      id: 'chin', name: 'Подбородок / фильтрум', value: chinPhiltrum, display: f2(chinPhiltrum), ideal, weight: 0.9,
      what: 'Высота от линии смыкания губ до подбородка, делённая на высоту от носа до губ. ~2:1 — гармоничная нижняя треть.',
      verdict: lowHigh(chinPhiltrum, ideal, 'Подбородок коротковат или фильтрум длинный.', 'Подбородок высокий относительно верхней губы.', 'Пропорция подбородка гармонична.'),
      modifiable: 'medium',
      levers: ['Борода, удлиняющая подбородок (при коротком)', 'Осанка: голова не выдвинута вперёд — подбородок визуально сильнее', 'Снижение жира под подбородком'],
      lines: [[L.subnasale, L.stomionU], [L.stomionL, L.menton]],
    }))
  }
  {
    const ideal: [number, number] = male ? [0.78, 0.9] : [0.7, 0.82]
    metrics.push(M({
      id: 'jaw', name: 'Челюсть / скулы', value: jawCheek, display: f2(jawCheek), ideal, weight: 1.1, tol: 0.08,
      what: 'Ширина нижней челюсти к ширине по скулам. У мужчин ценится более широкая и угловатая челюсть, у женщин — более мягкое сужение к подбородку.',
      verdict: lowHigh(jawCheek, ideal, 'Челюсть узкая относительно скул.', 'Челюсть широкая относительно скул.', 'Соотношение челюсти и скул в хорошем диапазоне.'),
      modifiable: 'high',
      levers: ['Процент жира: у мужчин ~10–15%, у женщин ~18–24% — линия челюсти проявляется', 'Меньше соли и алкоголя → меньше отёков', 'Щетина/борода по линии челюсти (мужчинам)', 'Осанка головы: шея прямая, подбородок не опущен', 'Контуринг (девушкам)'],
      lines: [[L.gonR, L.gonL], [L.zygR, L.zygL]],
    }))
  }
  {
    const ideal: [number, number] = [0.9, 1.12]
    metrics.push(M({
      id: 'nose', name: 'Ширина носа / межглазье', value: noseIcd, display: f2(noseIcd), ideal, weight: 0.8,
      what: 'Ширина крыльев носа к расстоянию между внутренними уголками глаз. В гармоничном лице примерно равны.',
      verdict: lowHigh(noseIcd, ideal, 'Нос узкий относительно межглазья.', 'Нос широковат относительно межглазья.', 'Ширина носа гармонична.'),
      modifiable: 'low',
      levers: ['Контуринг боковых стенок носа (макияж)', 'Хирургия — только по серьёзному поводу и у сертифицированного специалиста'],
      lines: [[L.alarR, L.alarL], [L.eyeInnerR, L.eyeInnerL]],
    }))
  }
  {
    const ideal: [number, number] = [1.45, 1.7]
    metrics.push(M({
      id: 'mouth', name: 'Ширина рта / носа', value: mouthNose, display: f2(mouthNose), ideal, weight: 0.7,
      what: 'Ширина рта относительно ширины носа. Около 1.6 («золотое сечение») — гармонично.',
      verdict: lowHigh(mouthNose, ideal, 'Рот узковат относительно носа.', 'Рот широкий относительно носа.', 'Пропорция рта и носа гармонична.'),
      modifiable: 'low',
      levers: ['Увлажнение и SPF для губ', 'Тренировка искренней улыбки (раздел «Тренажёр»)'],
      lines: [[L.mouthR, L.mouthL], [L.alarR, L.alarL]],
    }))
  }
  {
    const ideal: [number, number] = [0.9, 1.1]
    metrics.push(M({
      id: 'fifths', name: 'Межглазье / ширина глаза', value: fifths, display: f2(fifths), ideal, weight: 0.7,
      what: 'Правило пятых: расстояние между глазами ≈ ширине одного глаза.',
      verdict: lowHigh(fifths, ideal, 'Межглазье меньше ширины глаза.', 'Межглазье больше ширины глаза.', 'Правило пятых соблюдено.'),
      modifiable: 'low',
      levers: ['Коррекция формы бровей и их начала', 'Подбор оправы с правильной шириной перемычки'],
      lines: [[L.eyeInnerR, L.eyeInnerL], [L.eyeOuterR, L.eyeInnerR]],
    }))
  }
  {
    const ideal: [number, number] = male ? [0.24, 0.33] : [0.28, 0.4]
    metrics.push(M({
      id: 'eyeopen', name: 'Раскрытие глаз', value: eyeOpen, display: f2(eyeOpen), ideal, weight: 0.7,
      what: 'Высота глазной щели к её ширине. У мужчин ценится чуть более узкий «hunter eyes» разрез, у женщин — более открытый.',
      verdict: lowHigh(eyeOpen, ideal, 'Глаза сильно прищурены на фото.', 'Глаза широко раскрыты — взгляд может казаться испуганным/удивлённым.', 'Раскрытие глаз в гармоничном диапазоне.'),
      modifiable: 'medium',
      levers: ['Техника «squinch» — лёгкий подъём нижнего века (раздел «Тренажёр»)', 'Сон и уход за зоной вокруг глаз (кофеин, SPF, ретинол для век — аккуратно)', 'Расслабленный лоб: не поднимать брови на фото'],
      lines: [[L.lidTopR, L.lidBotR], [L.lidTopL, L.lidBotL]],
    }))
  }
  {
    const ideal: [number, number] = [1.3, 2.0]
    metrics.push(M({
      id: 'lips', name: 'Нижняя / верхняя губа', value: lipRatio, display: f2(lipRatio), ideal, weight: 0.5, tol: 0.6,
      what: 'Высота нижней губы к верхней. Нижняя обычно в 1.3–2 раза полнее.',
      verdict: lowHigh(lipRatio, ideal, 'Верхняя губа относительно полная.', 'Верхняя губа тонкая относительно нижней.', 'Пропорция губ гармонична.'),
      modifiable: 'medium',
      levers: ['Бальзам с SPF, отказ от привычки облизывать губы', 'Скраб/увлажнение', 'Филлеры — только у врача, без «переборщить»'],
      lines: [[L.lipTop, L.stomionU], [L.stomionL, L.lipBottom]],
    }))
  }
  {
    const ideal: [number, number] = male ? [0.3, 0.6] : [0.5, 0.85]
    metrics.push(M({
      id: 'brow', name: 'Брови → глаза', value: browEye, display: f2(browEye), ideal, weight: 0.6,
      what: 'Расстояние от нижнего края брови до века, в ширинах глаза. Низко посаженные брови — «мужественный» взгляд, высокие — мягкий и открытый.',
      verdict: lowHigh(browEye, ideal, 'Брови посажены очень низко — возможна нависшая складка.', 'Брови высоко — взгляд может читаться удивлённым.', 'Положение бровей гармонично.'),
      modifiable: 'high',
      levers: ['Не поднимать брови на фото (тренажёр «Расслабленный лоб»)', 'Коррекция формы: убрать волоски снизу/сверху у профессионала', 'Девушкам: ламинирование и укладка бровей'],
      lines: [[L.browLowR, L.lidTopR], [L.browLowL, L.lidTopL]],
    }))
  }

  const symMetric: Metric = {
    id: 'symmetry', name: 'Симметрия', value: sym, display: `${sym}/100`, ideal: [85, 100], idealDisplay: '85–100',
    score: Math.min(100, Math.round(sym * 1.05)), weight: 1.3,
    what: 'Насколько совпадают левая и правая половины лица относительно средней линии (45 пар точек). Идеальной симметрии не бывает ни у кого.',
    verdict: sym >= 85 ? 'Высокая симметрия.' : sym >= 70 ? 'Обычная лёгкая асимметрия — как у большинства людей.' : 'Заметная асимметрия — часто это поворот головы или неравномерный свет; переснимите строго анфас.',
    modifiable: 'medium',
    levers: ['Жуйте на обе стороны, спите не только на одном боку', 'Осанка: шея и плечи ровно', 'Ухоженные симметричные брови и стрижка', 'При выраженной асимметрии прикуса — ортодонт'],
    lines: [[L.top, L.menton]],
  }
  metrics.unshift(symMetric)

  const totalW = metrics.reduce((s, m) => s + m.weight, 0)
  const harmony = Math.round(metrics.reduce((s, m) => s + m.score * m.weight, 0) / totalW)

  const warnings: string[] = []
  if (pose) {
    if (Math.abs(pose.yaw) > 8) warnings.push(`Голова повёрнута на ${Math.abs(pose.yaw).toFixed(0)}° — для точного анализа смотрите прямо в камеру.`)
    if (Math.abs(pose.pitch) > 12) warnings.push(`Голова наклонена вверх/вниз на ${Math.abs(pose.pitch).toFixed(0)}° — держите камеру на уровне глаз.`)
  }
  if (eyeOpen < 0.15) warnings.push('Глаза почти закрыты — метрики глаз неточны.')
  if (d(P(L.stomionU), P(L.stomionL)) / mouthW > 0.12) warnings.push('Рот приоткрыт — метрики нижней трети неточны. Сомкните губы.')

  return { date: Date.now(), sex, harmony, symmetry: sym, metrics, shape: faceShape(faceLen, jawCheek, foreheadW, d(P(L.chinR), P(L.chinL)) / bizyg), warnings, pose }
}

export const SHAPES: Record<FaceShape['id'], FaceShape> = {
  oval: {
    id: 'oval', name: 'Овальное',
    hair: ['Подходит почти всё: от короткого кроппа до длинных волос', 'Квифф, помпадур, текстурный верх', 'Девушкам: любые длины, каре, многослойные стрижки'],
    beard: ['Короткая щетина или аккуратная короткая борода', 'Главное — чёткая линия шеи и щёк'],
    glasses: ['Почти любые; хорошо — квадратные и вайфареры'],
  },
  round: {
    id: 'round', name: 'Круглое',
    hair: ['Объём сверху, короче по бокам (фейд, андеркат) — вытягивает лицо', 'Избегать объёма на уровне скул и прямой густой чёлки', 'Девушкам: асимметрия, удлинённые пряди ниже подбородка'],
    beard: ['Борода длиннее на подбородке, короче по бокам — удлиняет овал', 'Эспаньолка/якорь'],
    glasses: ['Угловатые, прямоугольные оправы', 'Избегать круглых'],
  },
  square: {
    id: 'square', name: 'Квадратное',
    hair: ['Мужчинам: короткие стрижки (кроп, бокс, слегка текстурный верх) подчёркивают сильную челюсть', 'Девушкам: мягкие волны, слои, удлинённое каре — смягчают углы'],
    beard: ['Щетина или короткая борода по линии челюсти — подчеркнуть, не скрыть'],
    glasses: ['Круглые и овальные оправы смягчают черты'],
  },
  oblong: {
    id: 'oblong', name: 'Вытянутое',
    hair: ['Не делать высокий объём сверху', 'Чёлка, бахрома, объём по бокам', 'Девушкам: волны, длина до подбородка/плеч'],
    beard: ['Борода полнее по бокам, короче на подбородке — расширяет лицо'],
    glasses: ['Высокие, массивные оправы; авиаторы'],
  },
  heart: {
    id: 'heart', name: 'Сердцевидное',
    hair: ['Средняя длина, объём в нижней части', 'Боковой пробор, чёлка набок', 'Избегать сильного объёма на висках'],
    beard: ['Полная борода добавляет массу в нижнюю треть'],
    glasses: ['Лёгкие, с нижним акцентом, кошачий глаз (девушкам)', 'Безободковые'],
  },
  diamond: {
    id: 'diamond', name: 'Ромбовидное',
    hair: ['Объём на уровне лба и подбородка, не на скулах', 'Текстурная чёлка, удлинённый верх'],
    beard: ['Борода средней длины, наполняющая подбородок'],
    glasses: ['Овальные, с ярко выраженной верхней линией (браулайн)'],
  },
}

function faceShape(len: number, jaw: number, forehead: number, chin: number): FaceShape {
  // len — от верхней точки сетки (середина лба) до подбородка / ширина скул
  if (len > 1.32) return SHAPES.oblong
  if (forehead > 0.86 && jaw < 0.76 && chin < 0.32) return SHAPES.heart
  if (forehead < 0.8 && jaw < 0.78) return SHAPES.diamond
  if (len < 1.12) return jaw > 0.84 ? SHAPES.square : SHAPES.round
  if (jaw > 0.88) return SHAPES.square
  return SHAPES.oval
}
