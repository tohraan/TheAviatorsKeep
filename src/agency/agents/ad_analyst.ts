import { callOpenRouter } from '../lib/openrouter'
import { getAgentSOP } from '../lib/sopLoader'
import type { AdsSession } from '../types/agency.types'

export async function runAdAnalystAgent(session: AdsSession) {
  const sop = await getAgentSOP('ad_analyst')

  const systemInstruction = `
    You are the Ad Analyst at SkyFrame Media Agency.
    Your role: ${sop.role}
    
    BRAND CONTEXT:
    ${sop.brand_context}
    
    YOUR KPI:
    ${sop.kpi}
    
    PLATFORM RULES:
    ${sop.platform_rules}
    
    WHAT GOOD LOOKS LIKE:
    ${sop.what_good_looks_like}
    
    NEVER DO:
    ${sop.never_do.map(n => `- ${n}`).join('\n')}
    
    OUTPUT FORMAT (Must be valid JSON):
    ${sop.output_format}
  `

  let promptText = `
    Please extract and analyze the performance metrics from the provided data.
    
    TEXT CONTEXT:
    ${session.text_context || 'None provided.'}
    
    Please provide your analysis as a valid JSON object matching the requested output format.
  `

  // Llama 3.3 70B is a text-only model. We simply inform it if screenshots were uploaded.
  if (session.screenshot_urls && session.screenshot_urls.length > 0) {
    promptText += `\n[Note: The user uploaded ${session.screenshot_urls.length} screenshot(s), but as a text-only analyst, you cannot view them. Rely heavily on the TEXT CONTEXT above.]`
  }

  try {
    const result = await callOpenRouter(systemInstruction, promptText)
    return result
  } catch (error: any) {
    throw new Error(`Ad Analyst Agent failed: ${error.message}`)
  }
}
