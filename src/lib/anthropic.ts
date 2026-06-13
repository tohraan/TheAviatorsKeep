// src/lib/anthropic.ts

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | any[]
}

export async function callAnthropic(
  systemPrompt: string,
  userContent: any[],
  apiKey?: string
): Promise<any> {
  const finalApiKey = apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!finalApiKey || finalApiKey === 'your-anthropic-key') {
    throw new Error('Anthropic API key is not configured. Please supply a valid key or set VITE_ANTHROPIC_API_KEY in .env.local.')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': finalApiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-developer-only-headers': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API request failed with status ${response.status}: ${errorBody}`)
  }

  const result = await response.json()
  const text = result.content.find((block: any) => block.type === 'text')?.text || ''
  
  // Clean JSON response (Claude sometimes wraps JSON in codeblocks even with instructions not to)
  let cleanedText = text.trim()
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7)
  }
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3)
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3)
  }
  cleanedText = cleanedText.trim()

  try {
    return JSON.parse(cleanedText)
  } catch (parseError) {
    console.error('Failed to parse Anthropic JSON response:', cleanedText)
    throw new Error('Response returned by AI was not valid JSON. Please retry.')
  }
}
