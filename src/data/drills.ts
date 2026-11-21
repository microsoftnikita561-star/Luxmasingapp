// Тренажёр мимики: оценка в реальном времени по 52 blendshapes MediaPipe.
export type BS = Record<string, number>
export interface DrillEval { score: number; ok: boolean; hints: string[] }
export interface Drill {
  id: string
  name: string
  icon: string
  video?: string
  goal: string
  how: string[]
  holdSec: number
  reps: number
  evaluate: (b: BS, ctx: { yaw: number; roll: number; chinRatio: number; baseChin: number | null }) => DrillEval
}

const avg = (a: number, b: number) => (a + b) / 2
const clamp = (v: number) => Math.max(0, Math.min(1, v))

export const DRILLS: Drill[] = [
  {
    id: 'squinch', video: 'squinch', name: 'Squinch («hunter eyes»)', icon: 'eye', holdSec: 3, reps: 5,
    goal: 'Уверенный, спокойный взгляд за счёт лёгкого подъёма нижнего века — без поднятых бровей и без сильного прищура.',
    how: ['Смотрите прямо в камеру', 'Слегка поднимите нижние веки, как от лёгкого солнца', 'Лоб и брови расслаблены', 'Не закрывайте глаза'],
    evaluate: (b) => {
      const sq = avg(b.eyeSquintLeft ?? 0, b.eyeSquintRight ?? 0)
      const blink = avg(b.eyeBlinkLeft ?? 0, b.eyeBlinkRight ?? 0)
      const wide = avg(b.eyeWideLeft ?? 0, b.eyeWideRight ?? 0)
      const brow = b.browInnerUp ?? 0
      const hints: string[] = []
      if (sq < 0.25) hints.push('Чуть сильнее подними нижние веки')
      if (blink > 0.55) hints.push('Слишком сильно прищурился — приоткрой глаза')
      if (wide > 0.15) hints.push('Глаза слишком широко раскрыты')
      if (brow > 0.2) hints.push('Расслабь брови — не поднимай их')
      const score = clamp(sq / 0.35) * (blink > 0.55 ? 0.4 : 1) * (brow > 0.2 ? 0.6 : 1) * (wide > 0.15 ? 0.6 : 1)
      return { score, ok: hints.length === 0, hints }
    },
  },
  {
    id: 'duchenne', video: 'duchenne', name: 'Улыбка Дюшенна', icon: 'smile', holdSec: 3, reps: 5,
    goal: 'Искренняя улыбка, в которой участвуют глаза (круговая мышца глаза), а не только рот. Её воспринимают как тёплую и настоящую.',
    how: ['Вспомните что-то по-настоящему смешное', 'Улыбнитесь так, чтобы приподнялись щёки', 'Пусть появятся «лучики» у глаз', 'Обе стороны рта поднимаются одинаково'],
    evaluate: (b) => {
      const smile = avg(b.mouthSmileLeft ?? 0, b.mouthSmileRight ?? 0)
      const cheek = avg(b.cheekSquintLeft ?? 0, b.cheekSquintRight ?? 0)
      const eye = avg(b.eyeSquintLeft ?? 0, b.eyeSquintRight ?? 0)
      const asym = Math.abs((b.mouthSmileLeft ?? 0) - (b.mouthSmileRight ?? 0))
      const hints: string[] = []
      if (smile < 0.5) hints.push('Улыбнись шире')
      if (cheek < 0.2 && eye < 0.3) hints.push('Подключи глаза — подними щёки')
      if (asym > 0.18) hints.push('Улыбка асимметрична — выровняй уголки')
      const score = clamp(smile / 0.6) * clamp(Math.max(cheek / 0.25, eye / 0.35)) * (asym > 0.18 ? 0.7 : 1)
      return { score, ok: hints.length === 0, hints }
    },
  },
  {
    id: 'calm', video: 'relaxed-face', name: 'Расслабленный лоб', icon: 'face', holdSec: 8, reps: 3,
    goal: 'Нейтральное уверенное лицо: брови не подняты (удивление/тревога) и не нахмурены (злость). Базовое выражение для фото и общения.',
    how: ['Выдохните и отпустите лоб', 'Губы сомкнуты, челюсть не сжата', 'Язык мягко у нёба', 'Взгляд спокойный, лёгкий squinch'],
    evaluate: (b) => {
      const up = Math.max(b.browInnerUp ?? 0, avg(b.browOuterUpLeft ?? 0, b.browOuterUpRight ?? 0))
      const down = avg(b.browDownLeft ?? 0, b.browDownRight ?? 0)
      const jaw = b.jawOpen ?? 0
      const press = avg(b.mouthPressLeft ?? 0, b.mouthPressRight ?? 0)
      const hints: string[] = []
      if (up > 0.12) hints.push('Брови приподняты — опусти и расслабь лоб')
      if (down > 0.35) hints.push('Ты хмуришься — разгладь межбровье')
      if (jaw > 0.12) hints.push('Сомкни губы')
      if (press > 0.45) hints.push('Не поджимай губы')
      const score = clamp(1 - up * 3) * clamp(1 - Math.max(0, down - 0.2) * 2) * (jaw > 0.12 ? 0.6 : 1)
      return { score, ok: hints.length === 0, hints }
    },
  },
  {
    id: 'symsmile', name: 'Симметричная полуулыбка', icon: 'smile', holdSec: 4, reps: 4,
    goal: 'Лёгкая закрытая улыбка с одинаково поднятыми уголками — идеальна для портретов и первого впечатления.',
    how: ['Губы сомкнуты', 'Слегка поднимите оба уголка рта', 'Не обнажайте зубы', 'Добавьте лёгкий squinch'],
    evaluate: (b) => {
      const l = b.mouthSmileLeft ?? 0, r = b.mouthSmileRight ?? 0
      const smile = avg(l, r)
      const asym = Math.abs(l - r)
      const jaw = b.jawOpen ?? 0
      const hints: string[] = []
      if (smile < 0.2) hints.push('Чуть приподними уголки губ')
      if (smile > 0.65) hints.push('Слишком широкая улыбка — сделай мягче')
      if (asym > 0.12) hints.push(l > r ? 'Подними второй уголок рта' : 'Подними второй уголок рта')
      if (jaw > 0.15) hints.push('Сомкни губы')
      const score = clamp(smile / 0.3) * clamp(1 - Math.max(0, smile - 0.65) * 3) * clamp(1 - asym * 4)
      return { score, ok: hints.length === 0, hints }
    },
  },
  {
    id: 'chin', video: 'jawline-photo', name: 'Ракурс: подбородок вперёд-вниз', icon: 'photo', holdSec: 3, reps: 4,
    goal: 'Самый фотогеничный ракурс: голова прямо, шея вытянута вперёд, подбородок слегка опущен — челюсть чёткая, нет второго подбородка.',
    how: ['Первую секунду смотрите прямо — запомню базу', 'Голова не повёрнута, не наклонена набок', 'Немного вытяните лицо вперёд к камере', 'Чуть опустите подбородок'],
    evaluate: (_b, c) => {
      const hints: string[] = []
      if (Math.abs(c.yaw) > 7) hints.push('Поверни лицо прямо к камере')
      if (Math.abs(c.roll) > 5) hints.push('Голова наклонена набок — выпрями')
      let s = 0.3
      if (c.baseChin) {
        const rel = c.chinRatio / c.baseChin - 1
        if (rel < 0.04) hints.push('Чуть опусти подбородок')
        if (rel > 0.2) hints.push('Слишком низко — подними подбородок немного')
        s = rel >= 0.04 && rel <= 0.2 ? 1 : clamp(rel / 0.04) * 0.7
      }
      const score = s * (Math.abs(c.yaw) > 7 ? 0.5 : 1) * (Math.abs(c.roll) > 5 ? 0.6 : 1)
      return { score, ok: hints.length === 0 && !!c.baseChin, hints }
    },
  },
]
