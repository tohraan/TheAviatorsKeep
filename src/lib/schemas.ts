import { z } from 'zod'

export const leadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: z.string().optional().nullable().transform(val => val === '' ? null : val),
  source: z.enum(['facebook_marketplace', 'facebook_page', 'instagram', 'other'], {
    errorMap: () => ({ message: 'Please select a valid source' })
  }),
  source_ad: z.string().optional().nullable().transform(val => val === '' ? null : val),
  source_detail: z.string().optional().nullable().transform(val => val === '' ? null : val),
  plane_interest: z.string().optional().nullable().transform(val => val === '' ? null : val),
  frame_type: z.enum(['standard', 'custom', 'other']).optional().nullable().transform(val => val === '' ? null : val),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  funnel_stage: z.enum([
    'inquiry',
    'contacted',
    'interested',
    'booking_paid',
    'in_production',
    'ready_pending',
    'balance_paid',
    'shipping_paid',
    'delivered',
    'cold',
    'lost'
  ]).default('inquiry'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  follow_up_date: z.string().optional().nullable().transform(val => val === '' ? null : val),
  follow_up_type: z.enum(['hot_gone_cold', 'price_ghost', 'unread', 'post_delivery', 'general']).optional().nullable().transform(val => val === '' ? null : val)
})

export type LeadFormValues = z.infer<typeof leadSchema>

export const orderSchema = z.object({
  lead_id: z.string().optional().nullable(),
  frame_type: z.enum(['standard', 'custom', 'other'], {
    errorMap: () => ({ message: 'Please select a frame variant' })
  }),
  airline: z.string().min(1, 'Airline is required'),
  plane_model: z.string().optional().nullable().transform(val => val === '' ? null : val),
  plaque_color: z.string().optional().nullable().transform(val => val === '' ? null : val),
  price_aed: z.coerce.number().min(0, 'Price must be a positive number'),
  custom_notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

export type OrderFormValues = z.infer<typeof orderSchema>

