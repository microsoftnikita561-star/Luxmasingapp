import type { ChatMsg } from './store'

// OpenRouter — шлюз ко многим LLM. Ключ хранится только у вас в браузере.
export const DEFAULT_MODEL = '~google/gemini-flash-latest'
// Запасной список, если каталог OpenRouter не загрузился. Псевдонимы «~…-latest» сами переключаются на свежую модель.
export const MODEL_PRESETS = [
  { id: '~google/gemini-flash-latest', label: 'Gemini Flash — быстрый и недорогой' },
  { id: '~anthropic/claude-haiku-latest', label: 'Claude Haiku — самый дешёвый' },
  { id: '~anthropic/claude-sonnet-latest', label: 'Claude Sonnet — подробные разборы' },
  { id: '~google/gemini-pro-latest', label: 'Gemini Pro — максимум качества' },
]

export const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image'

/** Генерация или редактирование картинки. Возвращает data URL. */
export async function generateImage(opts: { key: string; model: string; prompt: string; image?: string }): Promise<string> {
  const content = opts.image ? [{ type: 'text', text: opts.prompt }, { type: 'image_url', image_url: { url: opts.image } }] : opts.prompt
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.key}`, 'Content-Type': 'application/json', 'X-Title': 'LuxMasing' },
    body: JSON.stringify({ model: opts.model, modalities: ['image', 'text'], messages: [{ role: 'user', content }] }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error?.message || `Ошибка OpenRouter: ${res.status}`)
  const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) throw new Error('Модель не вернула картинку. Попробуйте ещё раз или выберите другую модель для картинок в профиле.')
  return url
}

export interface ModelInfo { id: string; name: string; pricePerM: number; makesImages: boolean }
/** Актуальный каталог моделей, которые принимают изображения (ключ не нужен) */
export async function listVisionModels(): Promise<ModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  const json = await res.json()
  return (json.data as { id: string; name: string; architecture?: { input_modalities?: string[]; output_modalities?: string[] }; pricing?: { prompt?: string } }[])
    .filter((m) => m.architecture?.input_modalities?.includes('image') && !m.id.endsWith(':batch'))
    .filter((m) => !m.id.startsWith('openrouter/'))
    .map((m) => ({ id: m.id, name: m.name, pricePerM: Number(m.pricing?.prompt ?? 0) * 1e6, makesImages: !!m.architecture?.output_modalities?.includes('image') }))
}

export const COACH_SYSTEM = `Ты — «LuxCoach», доказательный коуч по улучшению внешности (looksmaxxing) внутри приложения LuxMasing. Отвечай по-русски, дружелюбно, конкретно и структурно (короткие списки, шаги, сроки).
Принципы:
- Опирайся на дерматологию, спортивную науку, грумминг, стиль, фотографию. Приоритет: процент жира, кожа (SPF, ретиноиды), сон, волосы/стрижка, брови/борода, осанка, одежда, мимика.
- Никогда не советуй опасное: bonesmashing, стероиды/SARMs, DIY-инъекции, голодание, экстремальный «hard mewing» и жевание часами. Лекарства (изотретиноин, финастерид, миноксидил внутрь и т.п.) — только «обсудите с врачом».
- Не ставь оценки привлекательности по шкалам 1–10 и PSL, не унижай. Говори о сильных сторонах и о том, что можно изменить. Если человек проявляет признаки дисморфофобии или сильного стресса из-за внешности — мягко порекомендуй специалиста.
- Если прислано фото — оцени кожу (текстура, акне, покраснения, тёмные круги), волосы и стрижку, брови, бороду, ухоженность, освещение и ракурс фото; дай рекомендации по стрижке под форму лица. Не пытайся определить личность человека.
- Если пользователь спрашивает про причёску или одежду, опирайся на его выбор из раздела «Стиль», если он указан, и давай конкретику: что сказать барберу, какие вещи купить первыми.
- Учитывай данные геометрического анализа, если они даны, но помни, что это 2D-измерения с погрешностью.`

export async function chat(opts: { key: string; model: string; system: string; messages: ChatMsg[]; signal?: AbortSignal }): Promise<string> {
  const body = {
    model: opts.model,
    messages: [
      { role: 'system', content: opts.system },
      ...opts.messages.map((m) =>
        m.image
          ? { role: m.role, content: [{ type: 'text', text: m.content || 'Разбери моё фото.' }, { type: 'image_url', image_url: { url: m.image } }] }
          : { role: m.role, content: m.content },
      ),
    ],
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${opts.key}`,
      'Content-Type': 'application/json',
      'X-Title': 'LuxMasing',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error?.message || `Ошибка OpenRouter: ${res.status}`)
  const choice = json?.choices?.[0]
  if (!choice?.message?.content) throw new Error(choice?.finish_reason === 'length' ? 'Модель не уложилась в лимит ответа. Попробуйте ещё раз или выберите другую модель.' : 'Модель вернула пустой ответ. Попробуйте ещё раз.')
  return choice.message.content
}
