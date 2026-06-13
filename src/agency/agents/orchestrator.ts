import { supabase } from '../../lib/supabase'
import { ContentSession, AdsSession } from '../types/agency.types'
import { runCMOAgent } from './cmo'
import { runContentManagerAgent } from './content_manager'
import { runReelAgent } from './reel_agent'
import { runCarouselAgent } from './carousel_agent'
import { runFBPostAgent } from './fb_post_agent'
import { runAdAnalystAgent } from './ad_analyst'
import { runPaidMediaManagerAgent } from './paid_media_manager'
import { runAdCopywriterAgent } from './ad_copywriter'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function runContentPipeline(sessionId: string) {
  // 1. Fetch Session
  const { data: sessionData, error: sessionError } = await supabase
    .from('agency_content_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !sessionData) {
    throw new Error('Failed to load content session')
  }

  let session = sessionData as ContentSession

  const savePartial = async (updates: Partial<ContentSession>) => {
    await supabase.from('agency_content_sessions').update(updates).eq('id', sessionId)
    session = { ...session, ...updates }
  }

  try {
    await savePartial({ status: 'running' })

    // CMO
    if (!session.cmo_output) {
      const cmoOut = await runCMOAgent(session)
      await savePartial({ cmo_output: cmoOut })
      await delay(500)
    }

    // Content Manager
    if (!session.content_manager_output) {
      const cmOut = await runContentManagerAgent(session)
      await savePartial({ content_manager_output: cmOut })
      await delay(500)
    }

    // Reel Agent
    if (!session.reel_output) {
      const reelOut = await runReelAgent(session)
      await savePartial({ reel_output: reelOut })
      await delay(500)
    }

    // Carousel Agent
    if (!session.carousel_output) {
      const carouselOut = await runCarouselAgent(session)
      await savePartial({ carousel_output: carouselOut })
      await delay(500)
    }

    // FB Post Agent
    if (!session.fb_post_output) {
      const fbOut = await runFBPostAgent(session)
      await savePartial({ fb_post_output: fbOut, status: 'complete', completed_at: new Date().toISOString() } as any)
    } else {
      await savePartial({ status: 'complete', completed_at: new Date().toISOString() } as any)
    }

  } catch (error: unknown) {
    console.error('Content Pipeline failed:', error)
    await savePartial({ status: 'failed' })
    throw error
  }
}

export async function runAdsPipeline(sessionId: string) {
  // 1. Fetch Session
  const { data: sessionData, error: sessionError } = await supabase
    .from('agency_ads_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !sessionData) {
    throw new Error('Failed to load ads session')
  }

  let session = sessionData as AdsSession

  const savePartial = async (updates: Partial<AdsSession>) => {
    await supabase.from('agency_ads_sessions').update(updates).eq('id', sessionId)
    session = { ...session, ...updates }
  }

  try {
    await savePartial({ status: 'running' })

    // Ad Analyst
    if (!session.ad_analyst_output) {
      const analystOut = await runAdAnalystAgent(session)
      await savePartial({ ad_analyst_output: analystOut })
      await delay(500)
    }

    // Paid Media Manager
    if (!session.paid_media_manager_output) {
      const managerOut = await runPaidMediaManagerAgent(session)
      await savePartial({ paid_media_manager_output: managerOut })
      await delay(500)
    }

    // Ad Copywriter
    if (!session.ad_copywriter_output) {
      const copywriterOut = await runAdCopywriterAgent(session)
      await savePartial({ ad_copywriter_output: copywriterOut, status: 'complete', completed_at: new Date().toISOString() } as any)
    } else {
      await savePartial({ status: 'complete', completed_at: new Date().toISOString() } as any)
    }

  } catch (error: unknown) {
    console.error('Ads Pipeline failed:', error)
    await savePartial({ status: 'failed' })
    throw error
  }
}
