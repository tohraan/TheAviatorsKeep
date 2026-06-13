import { callOpenRouter } from '../lib/openrouter'
import { getAgentSOP } from '../lib/sopLoader'
import type { ContentSession } from '../types/agency.types'

export async function runCMOAgent(session: ContentSession) {
  const sop = await getAgentSOP('cmo')

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

  let promptText = prompt
  if (session.screenshot_urls && session.screenshot_urls.length > 0) {
    promptText += `\n[Note: The user uploaded ${session.screenshot_urls.length} screenshot(s), but as a text-only analyst, you cannot view them. Rely heavily on the TEXT CONTEXT above.]`
  }

  try {
    const result = await callOpenRouter(systemInstruction, promptText)
    return result
  } catch (error: any) {
    throw new Error(`CMO Agent failed: ${error.message}`)
  }
}
