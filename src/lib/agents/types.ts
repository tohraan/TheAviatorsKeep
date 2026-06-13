// src/lib/agents/types.ts

export interface ScreenshotInput {
  base64: string
  label: string
}

export interface AgentSession {
  screenshots: ScreenshotInput[]
  analystOutput?: AnalystOutput
  strategistOutput?: StrategistOutput
  copywriterOutput?: CopywriterOutput
  plannerOutput?: PlannerOutput
}

export interface AnalystOutput {
  platform: 'instagram' | 'facebook_page' | 'facebook_marketplace' | 'boosted_ad'
  period: string
  metrics: Record<string, number | string>
  top_performing: string[]
  underperforming: string[]
  audience_signals: string[]
  raw_observations: string[]
}

export interface StrategistOutput {
  priority_actions: string[]
  content_pillars: string[]
  posting_frequency: {
    instagram: string
    facebook: string
  }
  boost_recommendation: {
    should_boost: boolean
    which_content: string
    budget_aed: number
  }
  avoid: string[]
  weekly_focus: string
}

export interface CopywriterCaption {
  content_type: 'carousel' | 'single_image' | 'reel' | 'story'
  hook: string
  body: string
  cta: string
  hashtags: string[]
  content_pillar: string
  image_direction: string
}

export interface CopywriterOutput {
  captions: CopywriterCaption[]
}

export interface PlannerDay {
  day: string
  date: string
  platform: 'instagram' | 'facebook_page' | 'both'
  content_type: 'carousel' | 'single_image' | 'reel' | 'story'
  caption_index: number
  boost: boolean
  boost_budget_aed: number | null
  notes: string
}

export interface PlannerOutput {
  week_theme: string
  calendar: PlannerDay[]
  action_items: string[]
  materials_needed: string[]
}
