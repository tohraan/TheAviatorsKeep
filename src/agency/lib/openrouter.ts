const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

export const callOpenRouter = async (
  systemInstruction: string, 
  promptText: string, 
  model: string = 'meta-llama/llama-3.3-70b-instruct:free'
) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('VITE_OPENROUTER_API_KEY is missing. Please add it to your environment variables.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://the-aviators-keep.vercel.app', 
      'X-Title': 'SkyFrame Agency'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: promptText }
      ]
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content

  // Extract JSON from markdown if the model wraps it
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch (e) {
    throw new Error('Agent did not return valid JSON. ' + text)
  }
}
