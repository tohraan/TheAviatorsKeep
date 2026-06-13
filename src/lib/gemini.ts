// src/lib/gemini.ts
// Google Gemini API client — replaces Anthropic for the AI agency pipeline.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string // base64, no data URL prefix
  }
}

/**
 * Call Gemini generateContent API.
 * @param systemPrompt  Instruction text prepended as first text part
 * @param parts         Array of GeminiPart (text + optional images)
 * @param apiKey        Optional override; falls back to VITE_GEMINI_API_KEY
 * @returns             Parsed JSON object from the model's text response
 */
export async function callGemini(
  systemPrompt: string,
  parts: GeminiPart[],
  apiKey?: string
): Promise<unknown> {
  const finalKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY

  if (!finalKey || finalKey === 'your-gemini-key') {
    throw new Error(
      'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local.'
    )
  }

  // Build content parts: inject system prompt as first text item
  const contentParts: GeminiPart[] = [
    { text: systemPrompt },
    ...parts,
  ]

  const body = {
    contents: [
      {
        parts: contentParts.map(p => {
          if (p.inlineData) {
            return { inline_data: { mime_type: p.inlineData.mimeType, data: p.inlineData.data } }
          }
          return { text: p.text ?? '' }
        }),
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${finalKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errBody}`)
  }

  const result = await response.json()

  // Extract text from the first candidate's first part
  const text: string =
    result?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  // Strip markdown fences if the model wraps JSON despite responseMimeType
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini response was not valid JSON. Please retry.')
  }
}
