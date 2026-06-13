import { getAgencyModel } from '../lib/gemini'
import { getAgentSOP } from '../lib/sopLoader'
import { supabase } from '../../lib/supabase'
import type { ContentSession } from '../types/agency.types'
import type { Part } from '@google/generative-ai'

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
    const parts: Part[] = [{ text: prompt }]

    if (session.screenshot_urls && session.screenshot_urls.length > 0) {
      for (const path of session.screenshot_urls) {
        try {
          const { data } = await supabase.storage.from('agency-uploads').download(path)
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

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      systemInstruction,
    })

    const responseText = result.response.text()
    return JSON.parse(responseText)
  } catch (error: any) {
    throw new Error(`CMO Agent failed: ${error.message}`)
  }
}
