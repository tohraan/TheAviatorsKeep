import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import { AdsSession } from '../types/agency.types'
import { Part } from '@google/generative-ai'

export async function runAdAnalystAgent(session: AdsSession) {
  const sop = await getAgentSOP('ad_analyst')
  const model = getAgencyModel()

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

  const promptText = `
    Please extract and analyze the performance metrics from the provided data.
    
    TEXT CONTEXT:
    ${session.text_context || 'None provided.'}
    
    Please provide your analysis as a valid JSON object matching the requested output format.
  `

  const parts: Part[] = [{ text: promptText }]

  // Add screenshots to context if available
  // In a real implementation, you might need to fetch the image and provide the base64 data to Gemini.
  // For now, if there are urls, we just inform the agent (or if we were doing true multimodal, pass InlineDataPart).
  if (session.screenshot_urls && session.screenshot_urls.length > 0) {
    parts.push({
      text: `\nNote: The user has provided screenshot URLs, but in this execution environment they are handled separately. Analyze the provided text context thoroughly.`
    })
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      systemInstruction,
    })

    const responseText = result.response.text()
    return JSON.parse(responseText)
  } catch (error: any) {
    throw new Error(`Ad Analyst Agent failed: ${error.message}`)
  }
}
