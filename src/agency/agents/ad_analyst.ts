import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import { supabase } from '../../lib/supabase'
import type { AdsSession } from '../types/agency.types'
import type { Part } from '@google/generative-ai'

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
  if (session.screenshot_urls && session.screenshot_urls.length > 0) {
    for (const path of session.screenshot_urls) {
      try {
        const { data, error } = await supabase.storage.from('agency-uploads').download(path)
        if (data) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (reader.result) {
                resolve((reader.result as string).split(',')[1])
              } else {
                reject(new Error('Failed to convert image to base64'))
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(data)
          })

          parts.push({
            inlineData: {
              data: base64,
              mimeType: data.type
            }
          })
        }
      } catch (err) {
        console.error('Failed to load screenshot:', err)
      }
    }
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
