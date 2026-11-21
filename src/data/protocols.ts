import type { Profile } from '../lib/store'

export type Category = 'skin' | 'body' | 'face' | 'hair' | 'sleep' | 'style' | 'mind'

export const CATEGORIES: Record<Category, { name: string; icon: string; color: string }> = {
  skin: { name: 'Кожа', icon: '✨', color: '#f6a5c0' },
  body: { name: 'Тело', icon: '💪', color: '#7cc4ff' },
  face: { name: 'Лицо и осанка', icon: '🗿', color: '#c6a2ff' },
  hair: { name: 'Волосы', icon: '💈', color: '#ffd27c' },
  sleep: { name: 'Сон и питание', icon: '🌙', color: '#8fe3c0' },
  style: { name: 'Стиль', icon: '🧥', color: '#ffb38a' },
  mind: { name: 'Подача', icon: '🧠', color: '#a0b4ff' },
}

export interface Task {
  id: string
  title: string
  desc: string
  cat: Category
  xp: number
  when: 'Утро' | 'День' | 'Вечер' | 'Любое время'
  days?: number[] // 0=вс … 6=сб; если нет — каждый день
  lesson?: string // id урока для подробностей
  drill?: string // id упражнения тренажёра
  only?: (p: Profile) => boolean
}

export const TASKS: Task[] = [
  // Кожа
  { id: 'am-cleanse', title: 'Умыться мягким гелем', desc: 'Тёплая вода, мягкий pH-нейтральный гель 30–60 сек. Не тереть полотенцем — промокнуть.', cat: 'skin', xp: 5, when: 'Утро', lesson: 'skin-basics' },
  { id: 'am-spf', title: 'SPF 30–50', desc: 'Главное антивозрастное средство. 2 пальца крема на лицо и шею, даже в пасмурную погоду. Обновлять каждые 2–3 ч на солнце.', cat: 'skin', xp: 10, when: 'Утро', lesson: 'skin-basics' },
  { id: 'pm-cleanse', title: 'Вечернее очищение', desc: 'Смыть SPF и себум. При стойком SPF/макияже — двойное очищение (гидрофильное масло → гель).', cat: 'skin', xp: 5, when: 'Вечер', lesson: 'skin-basics' },
  { id: 'pm-active', title: 'Актив: ретиноид / кислоты', desc: 'Ретиноид (адапален 0.1% или ретинол) 3 вечера в неделю на сухую кожу, горошину на всё лицо. Начать с 2 раз в неделю. Не смешивать в один вечер с кислотами.', cat: 'skin', xp: 10, when: 'Вечер', days: [1, 3, 5], lesson: 'skin-actives' },
  { id: 'pm-moist', title: 'Увлажняющий крем', desc: 'Крем с керамидами / глицерином / пантенолом. Наносить на слегка влажную кожу.', cat: 'skin', xp: 5, when: 'Вечер', lesson: 'skin-basics' },
  { id: 'acne-bpo', title: 'Точечно бензоилпероксид', desc: 'BPO 2.5–5% на воспаления (короткий контакт 2–5 минут и смыть — меньше раздражения). Беречь ткань — отбеливает.', cat: 'skin', xp: 5, when: 'Вечер', lesson: 'skin-acne', only: (p) => p.acne },
  { id: 'lips', title: 'Бальзам для губ', desc: 'Не облизывать губы. Днём — бальзам с SPF.', cat: 'skin', xp: 3, when: 'Любое время' },
  { id: 'pillow', title: 'Чистая наволочка', desc: 'Менять наволочку 2 раза в неделю — меньше высыпаний.', cat: 'skin', xp: 3, when: 'Любое время', days: [0, 3] },

  // Тело
  { id: 'train', title: 'Силовая тренировка', desc: 'Полное тело 45–60 мин: присед/жим ногами, жим лёжа/отжимания, тяга, жим над головой, подтягивания. Плечи и спина дают V-силуэт.', cat: 'body', xp: 25, when: 'День', days: [1, 3, 5], lesson: 'body-training' },
  { id: 'steps', title: '8 000+ шагов', desc: 'Шаги — самый простой способ держать дефицит и низкий процент жира, который «открывает» скулы и челюсть.', cat: 'body', xp: 10, when: 'Любое время', lesson: 'body-fat' },
  { id: 'protein', title: 'Белок 1.6–2 г/кг', desc: 'Мясо, рыба, яйца, творог, бобовые. Поддерживает мышцы на дефиците.', cat: 'body', xp: 10, when: 'Любое время', lesson: 'body-fat' },
  { id: 'cardio', title: 'Кардио 30 мин', desc: 'Быстрая ходьба, вело, бег — зона 2 (можно говорить, но тяжело петь).', cat: 'body', xp: 10, when: 'День', days: [2, 4, 6] },

  // Лицо и осанка
  { id: 'posture', title: 'Осанка: chin tucks + wall angels', desc: '3×10 подтягиваний подбородка назад (двойной подбородок, затылок тянется вверх) и 3×10 «ангелов» у стены. Убирает «шею вперёд».', cat: 'face', xp: 10, when: 'Любое время', lesson: 'face-posture' },
  { id: 'tongue', title: 'Проверка позиции языка', desc: 'Губы сомкнуты, зубы слегка касаются, язык мягко лежит у нёба, дыхание носом. Это нормальная осанка покоя — не надо давить.', cat: 'face', xp: 5, when: 'Любое время', lesson: 'face-mewing' },
  { id: 'drill-face', title: 'Тренажёр мимики (5 мин)', desc: 'Squinch, искренняя улыбка, расслабленный лоб — в разделе «Тренажёр».', cat: 'face', xp: 15, when: 'Любое время', drill: 'squinch', lesson: 'mind-photo' },
  { id: 'salt', title: 'Соль и алкоголь под контролем', desc: 'Меньше соли и алкоголя вечером → меньше отёков лица и век утром.', cat: 'face', xp: 5, when: 'Вечер', lesson: 'body-fat' },

  // Волосы
  { id: 'hair-style', title: 'Уложить волосы', desc: 'Феном направить объём, немного матовой пасты/глины. 3 минуты меняют восприятие сильнее, чем кажется.', cat: 'hair', xp: 5, when: 'Утро', lesson: 'hair-cut' },
  { id: 'brows', title: 'Брови: расчесать и проверить', desc: 'Расчесать вверх-наружу, убрать единичные волоски между бровей. Не выщипывать форму самому — к мастеру.', cat: 'hair', xp: 3, when: 'Утро', days: [1, 4], lesson: 'hair-brows' },
  { id: 'beard', title: 'Контур бороды/щетины', desc: 'Линия шеи — на 1–2 пальца выше кадыка, щёки — чётко. Длина равномерная.', cat: 'hair', xp: 5, when: 'Утро', days: [2, 5], lesson: 'hair-beard', only: (p) => p.sex === 'male' && p.beard },
  { id: 'teeth', title: 'Зубы: щётка 2×2 мин + нить', desc: 'Здоровые десны и белые зубы сильно влияют на улыбку. Нить/ирригатор — каждый вечер.', cat: 'hair', xp: 5, when: 'Вечер', lesson: 'face-teeth' },

  // Сон и питание
  { id: 'sleep', title: 'Сон 7–9 часов', desc: 'Ложиться в одно время. За час до сна — без яркого экрана. Сон = кожа, отёки, гормоны, вес.', cat: 'sleep', xp: 15, when: 'Вечер', lesson: 'sleep' },
  { id: 'water', title: 'Вода 30–35 мл/кг', desc: 'Достаточная гидратация, моча светло-соломенного цвета.', cat: 'sleep', xp: 5, when: 'Любое время' },
  { id: 'veg', title: '2+ порции овощей / фрукт', desc: 'Клетчатка и микроэлементы — для кожи и сытости.', cat: 'sleep', xp: 5, when: 'Любое время' },
  { id: 'sugar', title: 'Без сладких напитков', desc: 'Газировка/соки — лишние калории и хуже кожа у склонных к акне.', cat: 'sleep', xp: 5, when: 'Любое время' },

  // Стиль
  { id: 'fit', title: 'Одежда по размеру', desc: 'Перед выходом: плечевой шов на краю плеча, нет лишней ткани, брюки без «гармошки».', cat: 'style', xp: 5, when: 'Утро', lesson: 'style-fit' },
  { id: 'scent', title: 'Парфюм: 2–3 пшика', desc: 'Шея и запястья. Ненавязчиво — люди должны почувствовать вблизи.', cat: 'style', xp: 3, when: 'Утро', days: [1, 2, 3, 4, 5] },

  // Подача
  { id: 'eye', title: 'Зрительный контакт', desc: 'В разговоре держать взгляд 3–5 сек, отводить в сторону, а не вниз. Медленная речь и спокойные жесты.', cat: 'mind', xp: 5, when: 'День', lesson: 'mind-presence' },
  { id: 'photo', title: 'Фото прогресса', desc: 'Раз в неделю: один свет, одно место, камера на уровне глаз, лицо прямо. Раздел «Анализ» → сохранить.', cat: 'mind', xp: 20, when: 'Утро', days: [0], lesson: 'mind-photo' },
  { id: 'nocompare', title: 'Без сравнения и «рейтингов»', desc: 'Не постить своё фото для оценок в сети. Сравнивай себя только с собой вчерашним.', cat: 'mind', xp: 5, when: 'Любое время', lesson: 'myths' },
]

export function tasksFor(p: Profile, date = new Date()): Task[] {
  const dow = date.getDay()
  return TASKS.filter((t) => (!t.days || t.days.includes(dow)) && (!t.only || t.only(p)))
}
