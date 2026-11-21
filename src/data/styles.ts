// Каталог существующих причёсок и стилей одежды, которые носят подростки.
// Собрано в ноябре 2026 по обзорам трендов (барбершопы, модные медиа, разборы подростковых покупок).
// Тренды живут 1–2 года: «trend» — насколько вещь сейчас на слуху (1–5), а не оценка качества.
import type { FaceShape, Sex } from '../lib/metrics'

export type HairType = 'straight' | 'wavy' | 'curly' | 'coily'
export const HAIR_TYPES: Record<HairType, string> = { straight: 'Прямые', wavy: 'Волнистые', curly: 'Кудрявые', coily: 'Мелкие кудри' }
export type Len = 'short' | 'medium' | 'long'
export const LEN_NAMES: Record<Len, string> = { short: 'Короткие (до 5 см)', medium: 'Средние (5–15 см)', long: 'Длинные (от 15 см)' }

export interface Haircut {
  id: string
  name: string
  en: string
  sex: Sex
  trend: number
  what: string
  needs: Len // какая длина нужна сверху, чтобы сделать стрижку сейчас
  hair: Partial<Record<HairType, number>> // −9 = не получится, 0 = нормально, +3 = идеально
  face: Partial<Record<FaceShape['id'], number>>
  styleMin: number // минут на укладку утром
  everyWeeks: number // как часто обновлять
  school: boolean // пройдёт строгий школьный дресс-код
  barber: string // что сказать мастеру
  styling: string[]
  note?: string
  prompt: string // описание для генерации примерки (англ.)
}

const H = (h: Haircut) => h

export const HAIRCUTS: Haircut[] = [
  H({
    id: 'textured-crop', name: 'Текстурный кроп с фейдом', en: 'textured crop', sex: 'male', trend: 5, needs: 'short',
    what: 'Короткий текстурный верх с чёлкой вперёд и плавным переходом на висках. Самая ходовая стрижка у подростков: выглядит аккуратно и почти не требует укладки.',
    hair: { straight: 2, wavy: 3, curly: 1, coily: 0 }, face: { oval: 2, round: 1, square: 2, oblong: 3, heart: 1, diamond: 1 },
    styleMin: 2, everyWeeks: 4, school: true,
    barber: 'Текстурный кроп. Сверху 4–6 см, профилировать для текстуры, чёлка вперёд чуть выше бровей. Бока — низкий или средний фейд от 1,5 мм.',
    styling: ['Подсушить феном, направляя волосы вперёд', 'Горошину матовой глины растереть в ладонях', 'Смять пряди пальцами — не расчёсывать'],
    prompt: 'a textured crop: short messy textured top brushed forward with a short fringe, low skin fade on the sides',
  }),
  H({
    id: 'blowout-taper', name: 'Блоуаут с тейпером', en: 'blowout taper', sex: 'male', trend: 5, needs: 'medium',
    what: 'Объёмный верх, высушенный феном вверх и назад, и аккуратный тейпер только у висков и на шее. Главная вирусная стрижка года.',
    hair: { straight: 2, wavy: 3, curly: 2, coily: 1 }, face: { oval: 2, round: 3, square: 2, oblong: -2, heart: 1, diamond: 1 },
    styleMin: 7, everyWeeks: 3, school: true,
    barber: 'Блоуаут тейпер. Сверху оставить 8–10 см, слои для объёма. Низкий тейпер на висках и окантовка на шее, бока не выбривать.',
    styling: ['На влажные волосы — спрей с морской солью', 'Сушить феном снизу вверх, поднимая корни круглой щёткой или пальцами', 'Зафиксировать лёгкой пастой или пудрой для объёма'],
    note: 'Без фена не работает — это стрижка под ежедневную укладку.',
    prompt: 'a blowout taper haircut: voluminous blow-dried hair swept up and back on top, low taper fade at the temples and neckline',
  }),
  H({
    id: 'low-taper-fringe', name: 'Лоу тейпер с пушистой чёлкой', en: 'low taper fade, fluffy fringe', sex: 'male', trend: 5, needs: 'medium',
    what: 'Пушистый удлинённый верх, падающий на лоб, и едва заметный тейпер. Мягче кропа, хорошо скрывает высокий лоб.',
    hair: { straight: 1, wavy: 3, curly: 3, coily: 0 }, face: { oval: 2, round: 0, square: 2, oblong: 3, heart: 2, diamond: 2 },
    styleMin: 5, everyWeeks: 4, school: true,
    barber: 'Низкий тейпер фейд, сверху 8–12 см с текстурой, чёлку оставить до бровей, не филировать слишком сильно.',
    styling: ['Спрей с морской солью на влажные волосы', 'Сушить феном с диффузором или мять руками', 'Немного пудры для объёма у корней'],
    prompt: 'a low taper fade with a long fluffy messy fringe falling over the forehead',
  }),
  H({
    id: 'broccoli', name: '«Брокколи» — кудрявый верх', en: 'fluffy curly top (broccoli cut)', sex: 'male', trend: 4, needs: 'medium',
    what: 'Шапка кудрей сверху и короткие бока. Если волосы вьются от природы — это самый простой вариант, если прямые — нужна химическая завивка.',
    hair: { straight: -3, wavy: 2, curly: 3, coily: 2 }, face: { oval: 2, round: 2, square: 2, oblong: -1, heart: 1, diamond: 1 },
    styleMin: 4, everyWeeks: 5, school: true,
    barber: 'Кудрявый верх 7–10 см, стричь по завитку на сухих волосах, бока — средний фейд.',
    styling: ['Не расчёсывать сухими', 'Крем для кудрей на мокрые волосы', 'Сушить диффузором или дать высохнуть самим'],
    note: 'С прямыми волосами нужна завивка в салоне: держится 2–3 месяца и сушит волосы.',
    prompt: 'a broccoli haircut: fluffy curly hair on top with a mid fade on the sides',
  }),
  H({
    id: 'two-block', name: 'Корейский ту-блок', en: 'Korean two-block', sex: 'male', trend: 4, needs: 'medium',
    what: 'Длинный объёмный верх накрывает коротко снятые бока. Стиль K-pop: сейчас его носят более пушистым и лёгким.',
    hair: { straight: 3, wavy: 2, curly: -2, coily: -9 }, face: { oval: 2, round: 1, square: 1, oblong: 2, heart: 2, diamond: 3 },
    styleMin: 6, everyWeeks: 5, school: true,
    barber: 'Ту-блок. Бока и затылок коротко под насадку 6–9 мм без фейда, верх 10–12 см, чтобы закрывал виски, чёлка до бровей с пробором.',
    styling: ['Сушить феном, приподнимая корни', 'Чёлку слегка подкрутить щёткой внутрь', 'Лёгкий воск на кончики'],
    prompt: 'a Korean two-block haircut: longer voluminous top with a soft parted fringe covering short undercut sides',
  }),
  H({
    id: 'curtains', name: 'Шторки — средний пробор', en: 'curtain bangs / middle part', sex: 'male', trend: 3, needs: 'medium',
    what: 'Волосы средней длины с пробором по центру, пряди обрамляют лицо. Классика, которая не выходит из оборота.',
    hair: { straight: 3, wavy: 3, curly: 0, coily: -9 }, face: { oval: 3, round: -1, square: 2, oblong: 0, heart: 3, diamond: 2 },
    styleMin: 5, everyWeeks: 7, school: true,
    barber: 'Средний пробор, чёлка до скул, сверху 12–15 см, бока ножницами — закрывают верх уха, без машинки.',
    styling: ['Сушить феном от пробора в стороны', 'Концы чёлки подкрутить назад', 'Капля лёгкого крема'],
    prompt: 'a middle part curtain hairstyle: medium-length hair parted in the centre with strands framing the face',
  }),
  H({
    id: 'wolf-m', name: 'Вулф-кат / шегги', en: 'wolf cut', sex: 'male', trend: 4, needs: 'long',
    what: 'Рваные слои: объём на макушке, удлинённый затылок, пряди на лице. Небрежный вид «только что проснулся» — сейчас на подъёме.',
    hair: { straight: 1, wavy: 3, curly: 3, coily: 0 }, face: { oval: 3, round: 1, square: 2, oblong: 1, heart: 2, diamond: 2 },
    styleMin: 5, everyWeeks: 8, school: false,
    barber: 'Вулф-кат. Короткие рваные слои на макушке, удлинённый затылок до воротника, рваная чёлка-шторка. Стричь ножницами и бритвой.',
    styling: ['Спрей с морской солью', 'Сушить, сминая пряди руками', 'Не расчёсывать после сушки'],
    prompt: 'a shaggy wolf cut: choppy layers with volume at the crown, longer at the nape, wispy curtain fringe',
  }),
  H({
    id: 'burst-mullet', name: 'Маллет с бёрст-фейдом', en: 'burst fade mullet', sex: 'male', trend: 4, needs: 'medium',
    what: 'Текстурный верх, полукруглый фейд вокруг уха и удлинённый затылок. Смело, спортивно, заметно.',
    hair: { straight: 1, wavy: 3, curly: 3, coily: 2 }, face: { oval: 2, round: 2, square: 3, oblong: 0, heart: 0, diamond: 1 },
    styleMin: 3, everyWeeks: 3, school: false,
    barber: 'Современный маллет. Бёрст-фейд вокруг уха, верх 6–8 см с текстурой, затылок оставить длиной 8–10 см.',
    styling: ['Матовая паста на верх', 'Затылок оставить естественным'],
    note: 'Школы со строгим дресс-кодом такую стрижку часто не пропускают.',
    prompt: 'a modern mullet with a burst fade around the ears, textured top and longer hair at the back',
  }),
  H({
    id: 'buzz', name: 'Баз-кат', en: 'buzz cut', sex: 'male', trend: 3, needs: 'short',
    what: 'Очень коротко под одну насадку. Ноль ухода. Идёт тем, у кого ровная форма головы и выраженные черты лица.',
    hair: { straight: 2, wavy: 2, curly: 2, coily: 3 }, face: { oval: 3, round: -2, square: 3, oblong: 0, heart: 0, diamond: 2 },
    styleMin: 0, everyWeeks: 2, school: true,
    barber: 'Баз-кат: насадка 6 мм сверху, бока 3 мм с плавным переходом, ровная окантовка.',
    styling: ['Ничего не нужно. Не забывайте SPF на кожу головы летом'],
    note: 'Открывает лицо полностью: кожа и форма ушей будут на виду.',
    prompt: 'a short buzz cut, about 6 mm, with slightly shorter faded sides',
  }),
  H({
    id: 'flow', name: 'Флоу — зачёс назад', en: 'flow / bro flow', sex: 'male', trend: 3, needs: 'long',
    what: 'Волосы до шеи, зачёсанные от лица назад и за уши. Расслабленный «сёрферский» вид.',
    hair: { straight: 2, wavy: 3, curly: 1, coily: -9 }, face: { oval: 3, round: -1, square: 3, oblong: -1, heart: 1, diamond: 2 },
    styleMin: 3, everyWeeks: 10, school: false,
    barber: 'Отращиваю флоу: только подровнять концы и убрать объём у шеи, длину сверху не трогать.',
    styling: ['Сушить феном назад', 'Крем или лёгкое масло на концы', 'Заправить за уши'],
    prompt: 'a medium-long flow hairstyle swept back away from the face and tucked behind the ears',
  }),
  // ——— девушки ———
  H({
    id: 'long-layers', name: 'Длинные слои с чёлкой-шторкой', en: 'long layers, curtain bangs', sex: 'female', trend: 5, needs: 'long',
    what: 'Длина сохраняется, слои у лица дают движение, чёлка-шторка расходится на две стороны. Самый универсальный вариант.',
    hair: { straight: 3, wavy: 3, curly: 1, coily: 0 }, face: { oval: 3, round: 3, square: 3, oblong: 1, heart: 3, diamond: 2 },
    styleMin: 8, everyWeeks: 10, school: true,
    barber: 'Длинные слои, начиная от подбородка, обрамление лица, чёлка-шторка до скул. Длину только освежить.',
    styling: ['Чёлку сушить круглой щёткой от лица', 'Термозащита, затем концы подкрутить', 'Лёгкий спрей для блеска'],
    prompt: 'long layered hair with face-framing layers and curtain bangs',
  }),
  H({
    id: 'butterfly', name: 'Баттерфляй', en: 'butterfly cut', sex: 'female', trend: 4, needs: 'long',
    what: 'Короткие слои сверху и длинные снизу: выглядит как объёмная укладка в стиле 90-х.',
    hair: { straight: 2, wavy: 3, curly: 0, coily: -9 }, face: { oval: 3, round: 2, square: 3, oblong: 2, heart: 2, diamond: 2 },
    styleMin: 12, everyWeeks: 10, school: true,
    barber: 'Баттерфляй: короткие слои от скул, длинные до лопаток, много движения у лица.',
    styling: ['Сушить крупным брашингом или на бигуди-липучки', 'Спрей для объёма у корней'],
    note: 'Без укладки феном эффект почти пропадает.',
    prompt: 'a butterfly haircut: voluminous bouncy layers, shorter layers around the face and long layers below',
  }),
  H({
    id: 'airy-bob', name: 'Воздушный боб', en: 'airy bob', sex: 'female', trend: 5, needs: 'medium',
    what: 'Боб до подбородка или чуть ниже с лёгкими, не тяжёлыми концами. Самая популярная короткая стрижка сейчас.',
    hair: { straight: 3, wavy: 3, curly: 1, coily: 0 }, face: { oval: 3, round: -1, square: 0, oblong: 3, heart: 3, diamond: 3 },
    styleMin: 6, everyWeeks: 7, school: true,
    barber: 'Боб чуть ниже подбородка, концы облегчить, без жёсткой линии, можно лёгкую градуировку сзади.',
    styling: ['Сушить, подкручивая концы внутрь или наружу', 'Текстурирующий спрей'],
    prompt: 'an airy chin-length bob with soft light ends',
  }),
  H({
    id: 'wolf-f', name: 'Вулф-кат', en: 'wolf cut', sex: 'female', trend: 4, needs: 'medium',
    what: 'Рваные слои, объём сверху, тонкие пряди внизу и чёлка. Дерзкий небрежный образ.',
    hair: { straight: 1, wavy: 3, curly: 3, coily: 0 }, face: { oval: 3, round: 2, square: 2, oblong: 1, heart: 2, diamond: 2 },
    styleMin: 6, everyWeeks: 8, school: true,
    barber: 'Вулф-кат: короткие слои на макушке, филированные концы, рваная чёлка-шторка.',
    styling: ['Мусс на влажные волосы', 'Сушить диффузором, сминая пряди'],
    prompt: 'a shaggy wolf cut with choppy layers, volume at the crown and wispy bangs',
  }),
  H({
    id: 'soft-bangs', name: 'Мягкая чёлка и прямой срез', en: 'soft bangs', sex: 'female', trend: 4, needs: 'medium',
    what: 'Лёгкая прореженная чёлка до бровей и ровная длина. Образ «soft girl», подчёркивает глаза.',
    hair: { straight: 3, wavy: 2, curly: -2, coily: -9 }, face: { oval: 3, round: 0, square: 1, oblong: 3, heart: 2, diamond: 2 },
    styleMin: 5, everyWeeks: 5, school: true,
    barber: 'Тонкая прореженная чёлка до бровей, по бокам плавно переходит в длину, срез ровный.',
    styling: ['Чёлку сушить первой, щёткой вниз', 'Мыть чёлку можно отдельно — она жирнится быстрее'],
    prompt: 'soft wispy see-through bangs with straight medium-length hair',
  }),
  H({
    id: 'pixie-bixie', name: 'Пикси / бикси', en: 'pixie, bixie', sex: 'female', trend: 3, needs: 'short',
    what: 'Короткая стрижка с текстурой: бикси — что-то среднее между пикси и бобом. Открывает лицо и шею.',
    hair: { straight: 2, wavy: 3, curly: 2, coily: 2 }, face: { oval: 3, round: -2, square: 0, oblong: 1, heart: 3, diamond: 3 },
    styleMin: 3, everyWeeks: 5, school: true,
    barber: 'Бикси: затылок и бока коротко ножницами, сверху 7–9 см с текстурой, удлинённая чёлка набок.',
    styling: ['Немного пасты, смять пряди пальцами'],
    prompt: 'a short textured bixie haircut (between a pixie and a bob) with a side-swept fringe',
  }),
  H({
    id: 'curly-shape', name: 'Кудри с формой', en: 'shaped curls', sex: 'female', trend: 4, needs: 'medium',
    what: 'Стрижка по завитку: округлая форма, объём на макушке, чёлка из кудрей по желанию. Кудри в моде — их больше не выпрямляют.',
    hair: { straight: -9, wavy: 1, curly: 3, coily: 3 }, face: { oval: 3, round: 1, square: 3, oblong: 3, heart: 2, diamond: 2 },
    styleMin: 8, everyWeeks: 12, school: true,
    barber: 'Стрижка кудрей на сухих волосах по завитку, округлая форма, слои для объёма у макушки.',
    styling: ['Не расчёсывать сухими', 'Крем и гель для кудрей на мокрые волосы', 'Сушить диффузором', 'Спать на шёлковой наволочке'],
    prompt: 'well-defined natural curls cut into a rounded shape with volume at the crown',
  }),
]

export interface HairInput { sex: Sex; shape: FaceShape['id'] | null; type: HairType; len: Len; minutes: number; strict: boolean }
export interface Ranked<T> { item: T; score: number; pros: string[]; cons: string[] }
const LEN_ORDER: Len[] = ['short', 'medium', 'long']
const SHAPE_RU: Record<FaceShape['id'], string> = { oval: 'овальному', round: 'круглому', square: 'квадратному', oblong: 'вытянутому', heart: 'сердцевидному', diamond: 'ромбовидному' }

export function pickHaircuts(inp: HairInput): Ranked<Haircut>[] {
  const out: Ranked<Haircut>[] = []
  for (const h of HAIRCUTS) {
    if (h.sex !== inp.sex) continue
    const hf = h.hair[inp.type] ?? 0
    if (hf <= -9) continue
    const pros: string[] = [], cons: string[] = []
    let score = h.trend * 1.2
    score += hf * 1.5
    if (hf >= 3) pros.push(`${HAIR_TYPES[inp.type]} волосы — идеальная основа`)
    else if (hf < 0) cons.push(inp.type === 'straight' ? 'На прямых волосах потребуется завивка' : 'С вашим типом волос будет сложно уложить')
    if (inp.shape) {
      const ff = h.face[inp.shape] ?? 0
      score += ff * 1.6
      if (ff >= 3) pros.push(`Очень подходит ${SHAPE_RU[inp.shape]} лицу`)
      else if (ff >= 2) pros.push(`Подходит ${SHAPE_RU[inp.shape]} лицу`)
      else if (ff < 0) cons.push(`Для ${SHAPE_RU[inp.shape].replace(/ому$/, 'ого')} лица не лучший выбор`)
    }
    if (h.styleMin > inp.minutes) { score -= 2 + (h.styleMin - inp.minutes) * 0.3; cons.push(`Укладка ~${h.styleMin} мин каждое утро`) }
    else if (h.styleMin <= 3) pros.push('Почти не требует укладки')
    if (inp.strict && !h.school) { score -= 5; cons.push('Может не пройти школьный дресс-код') }
    const gap = LEN_ORDER.indexOf(h.needs) - LEN_ORDER.indexOf(inp.len)
    if (gap > 0) { score -= gap * 2; cons.push(gap === 1 ? 'Нужно отрастить волосы: 2–4 месяца' : 'Нужно отращивать около полугода') }
    else pros.push('Можно сделать уже сейчас')
    if (h.trend >= 5) pros.push('Сейчас на пике')
    out.push({ item: h, score, pros, cons })
  }
  return out.sort((a, b) => b.score - a.score)
}

// ——————————————————— одежда ———————————————————
export type Vibe = 'calm' | 'bold' | 'sport' | 'dark' | 'classic'
export const VIBES: Record<Vibe, string> = { calm: 'Спокойно, не выделяться', bold: 'Ярко, чтобы заметили', sport: 'Спортивно и удобно', dark: 'Тёмное и дерзкое', classic: 'Аккуратно и дорого' }
export type Budget = 'low' | 'mid' | 'high'
export const BUDGETS: Record<Budget, string> = { low: 'Минимальный', mid: 'Средний', high: 'Не ограничен' }

export interface Outfit {
  id: string
  name: string
  en: string
  sex: Sex | 'any'
  trend: number
  vibes: Vibe[]
  what: string
  items: string[] // капсула: с чего собрать образ
  shoes: string
  colors: string
  cheap: string // как собрать дёшево
  mistakes: string[]
  school: boolean
  budget: Budget // минимальный бюджет, при котором образ выглядит хорошо
  prompt: string
}
const O = (o: Outfit) => o

export const OUTFITS: Outfit[] = [
  O({
    id: 'baggy-street', name: 'Бэгги-стритвир', en: 'baggy streetwear', sex: 'any', trend: 5, vibes: ['calm', 'bold', 'sport'], school: true, budget: 'low',
    what: 'Широкие джинсы, оверсайз-верх, массивные кроссовки. Базовая форма подростковой одежды прямо сейчас: узкое и обтягивающее ушло.',
    items: ['Широкие джинсы (baggy или wide-leg), светлые или графитовые', 'Оверсайз-футболка плотного хлопка без крупного принта', 'Худи на размер больше или зип-худи', 'Бомбер или рабочая куртка', 'Шапка-бини или кепка'],
    shoes: 'Массивные кеды или ретро-кроссовки: Adidas Campus, Samba, New Balance 530/9060 и аналоги',
    colors: 'Серый, чёрный, белый, выцветший синий плюс один акцент',
    cheap: 'Секонд-хенд и ресейл: джинсы и худи там лучше и дешевле новых. Футболки — плотная база из масс-маркета.',
    mistakes: ['Всё оверсайз сразу при невысоком росте — пропорции тонут; широкий низ уравновесьте верхом по размеру', 'Джинсы, которые волочатся по земле и рвутся на пятке', 'Тонкие растянутые футболки'],
    prompt: 'baggy wide-leg light-wash jeans, oversized heavyweight white t-shirt, grey zip hoodie, chunky retro sneakers, beanie',
  }),
  O({
    id: 'y2k', name: 'Y2K', en: 'Y2K revival', sex: 'any', trend: 5, vibes: ['bold'], school: false, budget: 'low',
    what: 'Мода конца 90-х и начала 2000-х: заниженная талия, клёш, бэби-ти, яркие аксессуары. Главный референс года — но в более носибельном виде.',
    items: ['Джинсы клёш или с заниженной талией', 'Короткая приталенная футболка (baby tee) или футболка с графикой', 'Зип-худи или велюровый костюм', 'Джинсовая юбка или карго', 'Аксессуары: тонкие очки, бисер, массивные кольца, серебро'],
    shoes: 'Массивные кроссовки, кеды на платформе, Mary Jane',
    colors: 'Деним, розовый, голубой, серебро, белый',
    cheap: 'Это стиль секонд-хенда: вещи 2000-х там стоят копейки. Украшения из бисера — своими руками.',
    mistakes: ['Весь образ из одной эпохи выглядит как костюм — берите 1–2 вещи и смешивайте с базой', 'Слишком много аксессуаров сразу'],
    prompt: 'Y2K outfit: low-rise flared jeans, cropped graphic baby tee, zip-up hoodie, platform sneakers, beaded jewellery, small tinted sunglasses',
  }),
  O({
    id: 'preppy', name: 'Преппи / old money', en: 'preppy, old money', sex: 'any', trend: 4, vibes: ['classic', 'calm'], school: true, budget: 'mid',
    what: 'Аккуратная «дорогая» классика: поло, рубашки, трикотаж, лоферы. Хорошо смотрится на всех, нравится взрослым и проходит любой дресс-код.',
    items: ['Рубашка оксфорд или поло', 'Вязаный джемпер или жилет, кардиган', 'Прямые брюки или чиносы; для девушек — юбка в складку или клетку', 'Прямые тёмные джинсы без потёртостей', 'Пальто или стёганая куртка'],
    shoes: 'Лоферы, чистые белые кеды, Mary Jane',
    colors: 'Тёмно-синий, бежевый, белый, бордовый, тёмно-зелёный',
    cheap: 'Важна посадка, а не бренд: недорогая рубашка, подогнанная по фигуре, выглядит лучше дорогой мешковатой.',
    mistakes: ['Мятые вещи убивают весь эффект', 'Крупные логотипы — это уже не «тихая роскошь»', 'Рубашка не по размеру в плечах'],
    prompt: 'preppy old money outfit: navy knit sweater over a white oxford shirt, beige straight trousers, loafers, wool coat',
  }),
  O({
    id: 'gorpcore', name: 'Горпкор', en: 'gorpcore', sex: 'any', trend: 4, vibes: ['sport', 'calm'], school: true, budget: 'mid',
    what: 'Туристическая и трекинговая одежда в городе: мембранные куртки, флис, карго, трейловые кроссовки. Практично и модно одновременно.',
    items: ['Мембранная куртка-ветровка или шелл', 'Флисовая кофта', 'Карго или нейлоновые брюки на резинке', 'Плотная футболка или лонгслив', 'Кепка, сумка через плечо'],
    shoes: 'Трейловые кроссовки: Salomon XT-6, Hoka и похожие',
    colors: 'Хаки, чёрный, серый, песочный, один яркий акцент',
    cheap: 'Спортивные магазины и секонд-хенд: походные вещи без модной наценки стоят в разы дешевле.',
    mistakes: ['Слишком много карманов и ремешков сразу', 'Вещи для экспедиции в +20'],
    prompt: 'gorpcore outfit: olive shell rain jacket, grey fleece, black cargo trousers, trail running sneakers, cap, crossbody bag',
  }),
  O({
    id: 'blokecore', name: 'Блоккор — футбольные джерси', en: 'blokecore', sex: 'any', trend: 4, vibes: ['sport', 'bold'], school: false, budget: 'low',
    what: 'Ретро-футболка клуба или сборной как главная вещь образа, с джинсами или шортами и кедами.',
    items: ['Футбольная джерси, лучше ретро', 'Широкие джинсы или джорты (джинсовые шорты ниже колена)', 'Олимпийка или ветровка', 'Высокие белые носки'],
    shoes: 'Adidas Samba, Gazelle, Spezial и аналоги',
    colors: 'Цвета клуба плюс деним и белый',
    cheap: 'Ретро-джерси на ресейле; подделку от оригинала в образе не отличить — берите ту, что нравится.',
    mistakes: ['Джерси на размер меньше — должна сидеть свободно', 'Спортивные штаны с джерси — выглядит как форма'],
    prompt: 'blokecore outfit: retro football jersey, baggy jeans, track jacket, adidas samba style sneakers, white socks',
  }),
  O({
    id: 'clean-athleisure', name: 'Clean girl / атлейжер', en: 'clean girl, athleisure', sex: 'female', trend: 5, vibes: ['sport', 'calm', 'classic'], school: true, budget: 'mid',
    what: 'Спортивная одежда как повседневная: леггинсы или широкие спортивные брюки, зип-кофта, гладкий пучок, минимум украшений. Ежедневная форма многих девушек.',
    items: ['Леггинсы или флэр-леггинсы, широкие спортивные брюки', 'Приталенная зип-кофта или кроп-худи', 'Базовая белая майка или лонгслив', 'Объёмный свитшот', 'Золотые серьги-кольца, заколка-краб'],
    shoes: 'Чистые белые кроссовки, зимой угги',
    colors: 'Белый, бежевый, серый, чёрный, пастель',
    cheap: 'Спортивный масс-маркет. Главное — чтобы вещи были чистые и без катышков.',
    mistakes: ['Просвечивающие леггинсы', 'Растянутые вещи: стиль держится на опрятности'],
    prompt: 'clean girl athleisure outfit: black flared leggings, cropped white zip-up jacket, white sneakers, gold hoop earrings, claw clip',
  }),
  O({
    id: 'literary', name: 'Книжный шик', en: 'literary chic', sex: 'any', trend: 4, vibes: ['classic', 'calm'], school: true, budget: 'low',
    what: 'Образ «человека, который читает»: твид, вельвет, кардиганы, очки, сумка-тоут. Набрал популярность в этом году.',
    items: ['Кардиган или вязаный жилет', 'Рубашка с воротником', 'Вельветовые или шерстяные брюки, юбка миди', 'Пиджак в клетку или тренч', 'Сумка-тоут, шарф'],
    shoes: 'Лоферы, дерби, грубые ботинки',
    colors: 'Коричневый, бутылочный зелёный, горчичный, бордовый, кремовый',
    cheap: 'Идеальный стиль для секонд-хенда и бабушкиного шкафа: шерсть и вельвет там отличного качества.',
    mistakes: ['Слишком много слоёв в тёплую погоду', 'Вещи с запахом секонда — стирайте и отпаривайте'],
    prompt: 'literary chic outfit: brown corduroy trousers, cream knit cardigan over a collared shirt, plaid blazer, loafers, canvas tote bag',
  }),
  O({
    id: 'dark', name: 'Тёмный авангард', en: 'opium / dark streetwear', sex: 'any', trend: 3, vibes: ['dark', 'bold'], school: false, budget: 'mid',
    what: 'Всё чёрное: узкий или очень широкий силуэт, кожа, грубые ботинки, серебро. Стиль рэп- и рок-сцены.',
    items: ['Чёрные расклешённые или широкие джинсы', 'Чёрная облегающая или рваная футболка, лонгслив', 'Кожаная куртка или чёрная зип-худи', 'Ремень с заклёпками, серебряные цепи и кольца'],
    shoes: 'Грубые ботинки на платформе или чёрные массивные кеды',
    colors: 'Чёрный, графит, серебро',
    cheap: 'Чёрное легко собрать из масс-маркета и секонда; вложитесь только в обувь.',
    mistakes: ['Разные оттенки выстиранного чёрного в одном образе', 'Слишком много цепей для школы'],
    prompt: 'dark avant-garde streetwear outfit: all black, flared black jeans, fitted black long sleeve, leather jacket, chunky platform boots, silver chains',
  }),
  O({
    id: 'coquette', name: 'Кокетт / soft girl', en: 'coquette, soft girl', sex: 'female', trend: 4, vibes: ['bold', 'classic'], school: true, budget: 'low',
    what: 'Нежная женственность: кружево, банты, топы с запахом, силуэт бэби-долл, балетки.',
    items: ['Топ с кружевом или запахом, блуза бэби-долл', 'Мини-юбка или юбка-шорты', 'Тонкий кардиган', 'Ленты и банты в волосы', 'Широкие джинсы для баланса'],
    shoes: 'Балетки, Mary Jane, кеды',
    colors: 'Белый, молочный, розовый, голубой',
    cheap: 'Ленты и банты стоят копейки и делают половину образа.',
    mistakes: ['Всё розовое и в рюшах сразу — добавьте одну грубую вещь: джинсы или кожаную куртку'],
    prompt: 'coquette soft girl outfit: white lace-trim top, light cardigan, pleated mini skirt, ballet flats, hair bow',
  }),
  O({
    id: 'minimal', name: 'Чистая база', en: 'minimal basics', sex: 'any', trend: 3, vibes: ['calm', 'classic'], school: true, budget: 'low',
    what: 'Однотонные вещи хорошей посадки без логотипов. Не устаревает и подходит, если не хочется разбираться в трендах.',
    items: ['3 плотные футболки: белая, чёрная, серая', 'Прямые или слегка широкие джинсы', 'Однотонное худи и свитшот', 'Рубашка оверсайз', 'Куртка-бомбер или пуховик без надписей'],
    shoes: 'Белые кожаные кеды, одни тёмные кроссовки',
    colors: 'Чёрный, белый, серый, тёмно-синий, бежевый',
    cheap: 'Самый дешёвый стиль: всё есть в базовых линейках масс-маркета.',
    mistakes: ['Скучно без единого акцента — добавьте часы, цепочку или шапку', 'Вещи не по размеру'],
    prompt: 'minimal basics outfit: plain white heavyweight t-shirt, straight dark jeans, grey crewneck sweatshirt, white leather sneakers',
  }),
]

export interface OutfitInput { sex: Sex; vibe: Vibe; budget: Budget; strict: boolean }
const B_ORDER: Budget[] = ['low', 'mid', 'high']

export function pickOutfits(inp: OutfitInput): Ranked<Outfit>[] {
  const out: Ranked<Outfit>[] = []
  for (const o of OUTFITS) {
    if (o.sex !== 'any' && o.sex !== inp.sex) continue
    const pros: string[] = [], cons: string[] = []
    let score = o.trend * 1.2
    const vi = o.vibes.indexOf(inp.vibe)
    if (vi === 0) { score += 6; pros.push('Точно в ваше настроение') }
    else if (vi > 0) { score += 3; pros.push('Близко к вашему настроению') }
    else score -= 3
    if (B_ORDER.indexOf(o.budget) > B_ORDER.indexOf(inp.budget)) { score -= 3; cons.push('Чтобы выглядело хорошо, нужен бюджет побольше') }
    else if (o.budget === 'low') pros.push('Собирается недорого')
    if (inp.strict && !o.school) { score -= 4; cons.push('В школу со строгим дресс-кодом не подойдёт') }
    else if (o.school) pros.push('Можно носить в школу')
    if (o.trend >= 5) pros.push('Сейчас на пике')
    out.push({ item: o, score, pros, cons })
  }
  return out.sort((a, b) => b.score - a.score)
}

export const STYLE_SOURCES = [
  { title: 'Lenta.ru: самая модная одежда у зумеров и альфа (сентябрь 2026)', url: 'https://lenta.ru/news/2026/09/08/perechislena-samaya-modnaya-odezhda-u-zumerov-i-alfa/' },
  { title: 'Dept. of Trend: The State of Teen Fashion, BTS 2026', url: 'https://deptoftrend.substack.com/p/the-state-of-teen-fashion-bts-2026' },
  { title: 'Москвичка: как одеваются зумеры и поколение альфа', url: 'https://moskvichka.ru/article/trends/modnye-gody-kak-odevayutsya-zumery-i-predstaviteli-pokoleniya-alfa' },
  { title: 'Woman.ru: модные стрижки для мальчика в 2026 году', url: 'https://www.woman.ru/beauty/modnye-strizhki-dlya-malchika-v-2026-godu-obzor-glavnykh-trendov-id7208185/' },
  { title: 'Low Fade Styles: Teen Boy Haircuts 2026', url: 'https://lowfadestyles.com/teen-boy-haircuts/' },
  { title: 'Marie Claire: 2026 haircut trends', url: 'https://www.marieclaire.com/beauty/hair/best-haircut-trends-2026/' },
  { title: 'Wikipedia: Literary chic', url: 'https://en.wikipedia.org/wiki/Literary_chic' },
]
