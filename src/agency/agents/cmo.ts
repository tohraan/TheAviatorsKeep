import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import type { ContentSession } from '../types/agency.types'

export async function runCMOAgent(session: ContentSession) {
  const sop = await getAgentSOP('cmo')
  const model = getAgencyModel()

  const systemInstruction = `
    You are the CMO (Chief Marketing Officer) at SkyFrame Media Agency.
    Your role: ${sop.role}
    
    BRAND CONTEXT:
    ${sop.brand_context}
    
    YOUR KPI:
    ${sop.kpi}
    
    CONTENT PILLARS TO DRAW FROM:
    ${sop.content_pillars?.join(', ')}
    
    TONE GUIDELINES:
    ${sop.tone_guidelines}
    
    WHAT GOOD LOOKS LIKE:
    ${sop.what_good_looks_like}
    
    NEVER DO:
    ${sop.never_do.map(n => `- ${n}`).join('\n')}
    
    OUTPUT FORMAT (Must be valid JSON):
    ${sop.output_format}
  `

  const prompt = `
    Based on the following session context, please provide the CMO weekly brief.
    
    OPERATOR TEXT CONTEXT:
    ${session.text_context || 'None provided.'}
    
    HISTORY CONTEXT:
    ${session.history_context || 'None available.'}
    
    Please provide your strategic direction as a valid JSON object matching the requested output format.
  `

  try {
    // If we had screenshot_urls, we'd add them here. For the CMO, typically text context is primary, 
    // but multimodal is possible.
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    })

    const responseText = result.response.text()
    return JSON.parse(responseText)
  } catch (error: any) {
    throw new Error(`CMO Agent failed: ${error.message}`)
  }
}
