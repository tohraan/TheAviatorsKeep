export type AgentName = 'cmo' | 'content_manager' | 'reel_agent' |
  'carousel_agent' | 'fb_post_agent' | 'paid_media_manager' |
  'ad_analyst' | 'ad_copywriter'

export type AgentStatus = 'idle' | 'running' | 'complete' | 'failed'
export type ContentType = 'reel' | 'carousel' | 'fb_post'
export type ContentPlatform = 'instagram' | 'facebook_page' | 'both'
export type ContentStatus = 'draft' | 'approved' | 'posted' | 'skipped'
export type AdCopyStatus = 'draft' | 'approved' | 'live' | 'retired'
export type SessionStatus = 'running' | 'complete' | 'failed' | 'partial'

export interface AgentProgress {
  name: AgentName
  status: AgentStatus
  output?: object
  error?: string
}

export interface ContentSession {
  id: string
  created_at: string
  session_label?: string
  week_of?: string
  text_context?: string
  history_context?: string
  screenshot_urls?: string[]
  cmo_output?: object
  content_manager_output?: object
  reel_output?: object
  carousel_output?: object
  fb_post_output?: object
  status: SessionStatus
}

export interface AdsSession {
  id: string
  created_at: string
  session_label?: string
  period_start?: string
  period_end?: string
  text_context?: string
  screenshot_urls?: string[]
  ad_analyst_output?: object
  paid_media_manager_output?: object
  ad_copywriter_output?: object
  budget_recommendation_aed?: number
  roas_current?: number
  roas_target?: number
  cpo_current?: number
  status: SessionStatus
}

export interface SOP {
  id: string
  agent_name: AgentName
  role: string
  kpi: string
  tone_guidelines: string
  never_do: string[]
  full_sop: string
  version: number
  brand_context?: string
  content_pillars?: string[]
  platform_rules?: string
  what_good_looks_like?: string
  output_format?: string
}
