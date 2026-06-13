import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Lead, LeadNote, FunnelStage } from '../types'

interface LeadsState {
  leads: Lead[]
  selectedLead: Lead | null
  notes: LeadNote[]
  loading: boolean
  error: string | null
  fetchLeads: () => Promise<void>
  fetchLeadById: (id: string) => Promise<void>
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'has_order' | 'order_id'>) => Promise<Lead>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  updateLeadStage: (id: string, stage: FunnelStage) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  fetchNotes: (leadId: string) => Promise<void>
  addNote: (leadId: string, noteText: string, type: LeadNote['type']) => Promise<void>
  setSelectedLead: (lead: Lead | null) => void
  clearError: () => void
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  selectedLead: null,
  notes: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  setSelectedLead: (lead) => set({ selectedLead: lead }),

  fetchLeads: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ leads: data || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch leads' })
    } finally {
      set({ loading: false })
    }
  },

  fetchLeadById: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, orders!lead_id(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      set({ selectedLead: data })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch lead details' })
    } finally {
      set({ loading: false })
    }
  },

  addLead: async (lead) => {
    set({ loading: true, error: null })
    try {
      // 1. Insert lead
      const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select()
        .single()

      if (error) throw error

      // 2. Add initial system log note
      await supabase
        .from('lead_notes')
        .insert([{
          lead_id: data.id,
          note: `Lead created from source: ${lead.source.replace('_', ' ')}`,
          type: 'system'
        }])

      // Update local state
      set((state) => ({
        leads: [data, ...state.leads],
        loading: false
      }))

      return data
    } catch (err: any) {
      set({ error: err.message || 'Failed to create lead', loading: false })
      throw err
    }
  },

  updateLead: async (id, updates) => {
    // Save previous state for potential rollback
    const previousLeads = [...get().leads]
    const previousSelectedLead = get().selectedLead

    // Perform local optimistic update
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ),
      selectedLead: state.selectedLead?.id === id ? { ...state.selectedLead, ...updates, updated_at: new Date().toISOString() } : state.selectedLead
    }))

    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      // Rollback on error
      set({ leads: previousLeads, selectedLead: previousSelectedLead, error: err.message || 'Failed to update lead' })
      throw err
    }
  },

  updateLeadStage: async (id, stage) => {
    const previousLeads = [...get().leads]
    const previousSelectedLead = get().selectedLead
    const currentLead = previousLeads.find(l => l.id === id)
    const oldStage = currentLead?.funnel_stage

    if (oldStage === stage) return // No change

    // 1. Optimistic Update
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, funnel_stage: stage, updated_at: new Date().toISOString() } : l
      ),
      selectedLead: state.selectedLead?.id === id ? { ...state.selectedLead, funnel_stage: stage, updated_at: new Date().toISOString() } : state.selectedLead
    }))

    try {
      // 2. Database update
      const { error } = await supabase
        .from('leads')
        .update({ funnel_stage: stage })
        .eq('id', id)

      if (error) throw error

      // 3. Log a system note of stage change
      const stageText = stage.replace('_', ' ').toUpperCase()
      const { data: noteData, error: noteError } = await supabase
        .from('lead_notes')
        .insert([{
          lead_id: id,
          note: `Funnel stage changed to ${stageText}`,
          type: 'system'
        }])
        .select()
        .single()

      // 4. Sync Order status for any associated orders
      let orderStage: string | null = null
      if (stage === 'booking_paid') orderStage = 'booking_confirmed'
      else if (stage === 'in_production') orderStage = 'in_production'
      else if (stage === 'ready_pending') orderStage = 'ready'
      else if (stage === 'shipping_paid') orderStage = 'shipped'
      else if (stage === 'delivered') orderStage = 'delivered'
      else if (stage === 'lost') orderStage = 'cancelled'

      if (orderStage) {
        // Also update the timestamps based on the status
        const timestampUpdates: any = { order_status: orderStage }
        const now = new Date().toISOString()
        
        if (orderStage === 'in_production') timestampUpdates.production_started_at = now
        else if (orderStage === 'ready') timestampUpdates.production_completed_at = now
        else if (orderStage === 'shipped') timestampUpdates.shipped_at = now
        else if (orderStage === 'delivered') timestampUpdates.delivered_at = now

        await supabase
          .from('orders')
          .update(timestampUpdates)
          .eq('lead_id', id)
      }

      if (!noteError && noteData && get().selectedLead?.id === id) {
        set((state) => ({ notes: [noteData, ...state.notes] }))
      }
    } catch (err: any) {
      // Rollback
      set({ leads: previousLeads, selectedLead: previousSelectedLead, error: err.message || 'Failed to update lead stage' })
    }
  },

  deleteLead: async (id) => {
    const previousLeads = [...get().leads]

    // Optimistically remove from state
    set((state) => ({
      leads: state.leads.filter((l) => l.id !== id),
      selectedLead: state.selectedLead?.id === id ? null : state.selectedLead
    }))

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      // Rollback
      set({ leads: previousLeads, error: err.message || 'Failed to delete lead' })
      throw err
    }
  },

  fetchNotes: async (leadId) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ notes: data || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch notes' })
    }
  },

  addNote: async (leadId, noteText, type) => {
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{
          lead_id: leadId,
          note: noteText,
          type
        }])
        .select()
        .single()

      if (error) throw error

      // Update last_contacted_at on lead if it is a communication note
      if (type === 'whatsapp' || type === 'call') {
        const timestamp = new Date().toISOString()
        await supabase
          .from('leads')
          .update({ last_contacted_at: timestamp })
          .eq('id', leadId)

        // Local state update for lead parameters
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, last_contacted_at: timestamp } : l),
          selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, last_contacted_at: timestamp } : state.selectedLead
        }))
      }

      set((state) => ({
        notes: [data, ...state.notes]
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to add note' })
      throw err
    }
  }
}))
