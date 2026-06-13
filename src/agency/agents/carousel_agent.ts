import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import type { ContentSession } from '../types/agency.types'

export async function runCarouselAgent(session: ContentSession) {
  const sop = await getAgentSOP('carousel_agent')
  const model = getAgencyModel()

  const systemInstruction = `
    You are the Carousel Agent at SkyFrame Media Agency.
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
    Based on the Content Manager's 7-day plan, please write the Carousel content for the week.
    
    CMO BRIEF (for overarching strategy):
    ${JSON.stringify(session.cmo_output, null, 2)}
    
    CONTENT MANAGER PLAN:
    ${JSON.stringify(session.content_manager_output, null, 2)}
    
    Please provide your Carousel content as a valid JSON object matching the requested output format.
  `

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    })

    const responseText = result.response.text()
    return JSON.parse(responseText)
  } catch (error: any) {
    throw new Error(`Carousel Agent failed: ${error.message}`)
  }
}
