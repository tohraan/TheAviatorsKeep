import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import { AdsSession } from '../types/agency.types'

export async function runAdCopywriterAgent(session: AdsSession) {
  const sop = await getAgentSOP('ad_copywriter')
  const model = getAgencyModel()

  const systemInstruction = `
    You are the Ad Copywriter at SkyFrame Media Agency.
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
    Based on the Paid Media Manager's strategy and the Ad Analyst's report, please provide 3 variations of ad copy.
    
    AD ANALYST OUTPUT:
    ${JSON.stringify(session.ad_analyst_output, null, 2)}
    
    PAID MEDIA MANAGER STRATEGY:
    ${JSON.stringify(session.paid_media_manager_output, null, 2)}
    
    Please provide your 3 copy variations as a valid JSON object matching the requested output format.
  `

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    })

    const responseText = result.response.text()
    return JSON.parse(responseText)
  } catch (error: any) {
    throw new Error(`Ad Copywriter Agent failed: ${error.message}`)
  }
}
