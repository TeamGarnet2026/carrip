import { getGeminiApiKey } from '@/lib/google/config'

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: { message?: string }
}

export async function generateGeminiJson<T>(prompt: string): Promise<T> {
  const apiKey = getGeminiApiKey()

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    }
  )

  const data = (await response.json()) as GeminiResponse

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? `Gemini API エラー (${response.status})`
    )
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini から有効な応答が返りませんでした')
  }

  return JSON.parse(text) as T
}
