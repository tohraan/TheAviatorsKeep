// src/lib/agents/orchestrator.ts

import { supabase } from '../supabase'
import { callGemini, type GeminiPart } from '../gemini'
import { ANALYST_PROMPT } from './analyst'
import { STRATEGIST_PROMPT } from './strategist'
import { COPYWRITER_PROMPT } from './copywriter'
import { PLANNER_PROMPT } from './planner'
import type {
  AgentSession,
  AnalystOutput,
  StrategistOutput,
  CopywriterOutput,
  PlannerOutput,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip data URL prefix and return mime type + raw base64 data */
function cleanBase64(base64Str: string): { mimeType: string; data: string } {
  const match = base64Str.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (match) return { mimeType: match[1], data: match[2] }
  return { mimeType: 'image/png', data: base64Str }
}

/** Call Gemini with one automatic retry using a stricter JSON instruction */
async function callAgentWithRetry<T>(
  systemPrompt: string,
  parts: GeminiPart[],
  apiKey?: string,
  isRetry = false
): Promise<T> {
  try {
    const result = await callGemini(systemPrompt, parts, apiKey)
    return result as T
  } catch (error) {
    if (!isRetry) {
      const strictPrompt =
        systemPrompt +
        '\n\nCRITICAL: Return ONLY raw valid JSON matching the schema above. No markdown. No prose. Just JSON.'
      return callAgentWithRetry<T>(strictPrompt, parts, apiKey, true)
    }
    throw error
  }
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export async function runAgentPipeline(
  session: AgentSession,
  onStepComplete?: (
    step: 'analyst' | 'strategist' | 'copywriter' | 'planner',
    data: unknown
  ) => void,
  apiKey?: string,
  existingSessionId?: string
): Promise<{ sessionId: string; session: AgentSession }> {
  let sessionId = existingSessionId

  // 1. Create or reuse Supabase session record
  if (!sessionId) {
    const label =
      session.screenshots.length > 0
        ? session.screenshots[0].label
        : 'Analytics Swarm'
    const { data: dbSession, error: createError } = await supabase
      .from('analytics_sessions')
      .insert([
        {
          session_label: label,
          platform: null,
          raw_context: session.screenshots.map(s => s.label).join(' | '),
          agent_output: {},
        },
      ])
      .select()
      .single()

    if (createError) throw createError
    sessionId = dbSession.id as string
  }

  const updateSession = async (updates: Record<string, unknown>) => {
    if (!sessionId) return
    const { error } = await supabase
      .from('analytics_sessions')
      .update(updates)
      .eq('id', sessionId)
    if (error) console.error('Error saving session progress:', error)
  }

  const currentOutputs: Record<string, unknown> = {}

  // ── AGENT 1: ANALYST ──────────────────────────────────────────────────────
  if (!session.analystOutput) {
    // Build Gemini parts: one image + one label text per screenshot
    const analystParts: GeminiPart[] = session.screenshots.flatMap(s => {
      const { mimeType, data } = cleanBase64(s.base64)
      return [
        { inlineData: { mimeType, data } },
        { text: `Screenshot context: ${s.label}` },
      ]
    })

    const analystResult = await callAgentWithRetry<AnalystOutput>(
      ANALYST_PROMPT,
      analystParts,
      apiKey
    )

    session.analystOutput = analystResult
    currentOutputs.analyst = analystResult

    await updateSession({
      platform: analystResult.platform,
      agent_output: currentOutputs,
    })

    onStepComplete?.('analyst', analystResult)
  } else {
    currentOutputs.analyst = session.analystOutput
  }

  // ── AGENT 2: STRATEGIST ───────────────────────────────────────────────────
  if (!session.strategistOutput) {
    const strategistResult = await callAgentWithRetry<StrategistOutput>(
      STRATEGIST_PROMPT,
      [{ text: JSON.stringify(session.analystOutput) }],
      apiKey
    )

    session.strategistOutput = strategistResult
    currentOutputs.strategist = strategistResult

    await updateSession({ agent_output: { ...currentOutputs } })
    onStepComplete?.('strategist', strategistResult)
  } else {
    currentOutputs.strategist = session.strategistOutput
  }

  // ── AGENT 3: COPYWRITER ───────────────────────────────────────────────────
  if (!session.copywriterOutput) {
    const copywriterResult = await callAgentWithRetry<CopywriterOutput>(
      COPYWRITER_PROMPT,
      [{ text: JSON.stringify(session.strategistOutput) }],
      apiKey
    )

    session.copywriterOutput = copywriterResult
    currentOutputs.copywriter = copywriterResult

    await updateSession({ agent_output: { ...currentOutputs } })
    onStepComplete?.('copywriter', copywriterResult)
  } else {
    currentOutputs.copywriter = session.copywriterOutput
  }

  // ── AGENT 4: PLANNER ──────────────────────────────────────────────────────
  if (!session.plannerOutput) {
    const plannerResult = await callAgentWithRetry<PlannerOutput>(
      PLANNER_PROMPT,
      [
        {
          text: JSON.stringify({
            strategy: session.strategistOutput,
            captions: session.copywriterOutput,
          }),
        },
      ],
      apiKey
    )

    session.plannerOutput = plannerResult
    currentOutputs.planner = plannerResult

    const actionItems = plannerResult.action_items ?? []
    const contentIdeas =
      session.copywriterOutput?.captions?.map(c => c.image_direction) ?? []

    await updateSession({
      agent_output: { ...currentOutputs },
      action_items: actionItems,
      content_ideas: contentIdeas,
    })

    onStepComplete?.('planner', plannerResult)
  }

  return { sessionId: sessionId ?? '', session }
}
