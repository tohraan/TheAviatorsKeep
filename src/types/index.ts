// src/types/index.ts
// Shared TypeScript types matching the Supabase schema.

export type LeadSource = 'facebook_marketplace' | 'facebook_page' | 'instagram' | 'other'

export type FunnelStage =
  | 'inquiry'
  | 'contacted'
  | 'interested'
  | 'booking_paid'
  | 'in_production'
  | 'ready_pending'
  | 'balance_paid'
  | 'shipping_paid'
  | 'delivered'
  | 'cold'
  | 'lost'

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type OrderStatus =
  | 'pending'
  | 'booking_confirmed'
  | 'in_production'
  | 'ready'
  | 'awaiting_shipping_payment'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type Material =
  | 'box_frame'
  | 'model_plane'
  | 'printout_plaque'
  | 'frame_extension'
  | 'nail'
  | 'pvc_tape'

export type CostCategory =
  | 'raw_materials'
  | 'consumables'
  | 'ad_spend'
  | 'shipping_error'
  | 'waste'
  | 'miscellaneous'

export type PostPlatform = 'instagram' | 'facebook_page' | 'facebook_marketplace' | 'both'

export type PostStatus = 'planned' | 'drafted' | 'posted' | 'skipped'

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  name: string
  phone?: string | null
  source: LeadSource
  source_ad?: string | null
  source_detail?: string | null
  plane_interest?: string | null
  frame_type?: 'standard' | 'custom' | 'other' | null
  notes?: string | null
  funnel_stage: FunnelStage
  priority: Priority
  follow_up_date?: string | null
  follow_up_type?: 'hot_gone_cold' | 'price_ghost' | 'unread' | 'post_delivery' | 'general' | null
  last_contacted_at?: string | null
  has_order: boolean
  order_id?: string | null
  orders?: Order[]
}

export interface LeadNote {
  id: string
  lead_id: string
  created_at: string
  note: string
  type: 'general' | 'whatsapp' | 'call' | 'system'
}

export interface Order {
  id: string
  created_at: string
  updated_at: string
  lead_id?: string | null
  frame_type: 'standard' | 'custom' | 'other'
  airline: string
  plane_model?: string | null
  plaque_color?: string | null
  custom_notes?: string | null
  price_aed: number
  booking_paid: boolean
  booking_paid_at?: string | null
  balance_paid: boolean
  balance_paid_at?: string | null
  shipping_fee_aed?: number | null
  shipping_paid: boolean
  shipping_paid_at?: string | null
  order_status: OrderStatus
  shipped_at?: string | null
  delivered_at?: string | null
  courier?: string | null
  tracking_number?: string | null
  production_started_at?: string | null
  production_completed_at?: string | null
}

export interface OrderMaterial {
  id: string
  order_id: string
  material: Material
  in_stock: boolean
  notes?: string | null
}

export interface Cost {
  id: string
  created_at: string
  date: string
  category: CostCategory
  amount_aed: number
  description?: string | null
  order_id?: string | null
  ad_platform?: 'facebook_marketplace' | 'facebook_page' | 'instagram' | null
}

export interface Post {
  id: string
  created_at: string
  date: string
  platform: PostPlatform
  content_type?: 'carousel' | 'single_image' | 'reel' | 'story' | 'listing' | null
  caption?: string | null
  image_notes?: string | null
  boosted: boolean
  boost_budget_aed?: number | null
  boost_platform?: string | null
  status: PostStatus
  performance_notes?: string | null
}

export interface AnalyticsSession {
  id: string
  created_at: string
  session_label?: string | null
  platform?: 'instagram' | 'facebook_page' | 'facebook_marketplace' | 'boosted_ad' | null
  raw_context?: string | null
  agent_output?: Record<string, any> | null
  action_items?: string[] | null
  content_ideas?: string[] | null
}

export interface Setting {
  key: string
  value: string
}

export interface InventoryItem {
  id: string
  created_at: string
  updated_at: string
  item_key: string
  item_name: string
  unit: string
  quantity: number
  units_per_frame: number  // how many needed per completed frame (e.g. nails=3, drill=2)
  min_threshold: number
  cost_per_unit?: number | null
  is_outsourced: boolean
  notes?: string | null
}

export interface InventoryLog {
  id: string
  created_at: string
  item_id: string
  item_key: string
  change: number       // positive = restock, negative = used
  reason?: string | null
  note?: string | null
}

export interface AirplaneModelStock {
  id: string
  created_at: string
  updated_at: string
  airline: string     // e.g. Emirates, Etihad, Qatar
  model: string       // e.g. A380, B777, A350
  quantity: number
  notes?: string | null
}
