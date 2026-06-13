import { callOpenRouter } from '../lib/openrouter'
import { getAgentSOP } from '../lib/sopLoader'
import type { AdsSession } from '../types/agency.types'

export async function runPaidMediaManagerAgent(session: AdsSession) {
  const sop = await getAgentSOP('paid_media_manager')

  const systemInstruction = `
    You are the Paid Media Manager at SkyFrame Media Agency.
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

  const prompt = `
    Based on the Ad Analyst's report, please provide the paid media strategy.
    
    AD ANALYST OUTPUT:
    ${JSON.stringify(session.ad_analyst_output, null, 2)}
    
    CURRENT BUDGET AED: ${session.budget_recommendation_aed || 'Not specified'}
    CURRENT ROAS: ${session.roas_current || 'Not specified'}
    
    Please provide your strategy as a valid JSON object matching the requested output format.
  `

  try {
    const result = await callOpenRouter(systemInstruction, prompt)
    return result
  } catch (error: any) {
    throw new Error(`Paid Media Manager failed: ${error.message}`)
  }
}
