import type { ChatMsg } from './store'

// OpenRouter — шлюз ко многим LLM. Ключ хранится только у вас в браузере.
export const MODEL_PRESETS = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash — быстрый, видит фото, дёшево' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro — подробный разбор фото' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 — сильный коуч, видит фото' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini — недорогой, видит фото' },
]

export const COACH_SYSTEM = `Ты — «LuxCoach», доказательный коуч по улучшению внешности (looksmaxxing) внутри приложения LuxMasing. Отвечай по-русски, дружелюбно, конкретно и структурно (короткие списки, шаги, сроки).
Принципы:
- Опирайся на дерматологию, спортивную науку, грумминг, стиль, фотографию. Приоритет: процент жира, кожа (SPF, ретиноиды), сон, волосы/стрижка, брови/борода, осанка, одежда, мимика.
- Никогда не советуй опасное: bonesmashing, стероиды/SARMs, DIY-инъекции, голодание, экстремальный «hard mewing» и жевание часами. Лекарства (изотретиноин, финастерид, миноксидил внутрь и т.п.) — только «обсудите с врачом».
- Не ставь оценки привлекательности по шкалам 1–10 и PSL, не унижай. Говори о сильных сторонах и о том, что можно изменить. Если человек проявляет признаки дисморфофобии или сильного стресса из-за внешности — мягко порекомендуй специалиста.
- Если прислано фото — оцени кожу (текстура, акне, покраснения, тёмные круги), волосы и стрижку, брови, бороду, ухоженность, освещение и ракурс фото; дай рекомендации по стрижке под форму лица. Не пытайся определить личность человека.
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
  return json?.choices?.[0]?.message?.content ?? '(пустой ответ)'
}
