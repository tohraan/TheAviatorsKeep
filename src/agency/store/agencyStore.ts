import { create } from 'zustand'
import { supabase } from '../../lib/supabase'
import type { ContentSession, AdsSession, SOP } from '../types/agency.types'
import { runContentPipeline, runAdsPipeline } from '../agents/orchestrator'

interface AgencyState {
  contentSessions: ContentSession[]
  adsSessions: AdsSession[]
  sops: SOP[]
  loading: boolean
  error: string | null

  // Fetchers
  fetchContentSessions: () => Promise<void>
  fetchAdsSessions: () => Promise<void>
  fetchSOPs: () => Promise<void>

  // Creators
  createContentSession: (session: Partial<ContentSession>) => Promise<string | null>
  createAdsSession: (session: Partial<AdsSession>) => Promise<string | null>

  // Runners
  startContentSession: (id: string) => Promise<void>
  startAdsSession: (id: string) => Promise<void>

  // SOP
  updateSOP: (id: string, updates: Partial<SOP>) => Promise<void>
  resetSOP: (id: string, defaultSOP: Partial<SOP>) => Promise<void>
}

export const useAgencyStore = create<AgencyState>((set, get) => ({
  contentSessions: [],
  adsSessions: [],
  sops: [],
  loading: false,
  error: null,

  fetchContentSessions: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('agency_content_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ contentSessions: data as ContentSession[], loading: false })
    }
  },

  fetchAdsSessions: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('agency_ads_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ adsSessions: data as AdsSession[], loading: false })
    }
  },

  fetchSOPs: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('agency_sops')
      .select('*')
      .order('agent_name')

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ sops: data as SOP[], loading: false })
    }
  },

  createContentSession: async (session) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('agency_content_sessions')
      .insert({ ...session, status: 'running' }) 
      .select()
      .single()

    if (error) {
      set({ error: error.message, loading: false })
      return null
    } else {
      set(state => ({
        contentSessions: [data as ContentSession, ...state.contentSessions],
        loading: false
      }))
      return data.id
    }
  },

  createAdsSession: async (session) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('agency_ads_sessions')
      .insert({ ...session, status: 'running' })
      .select()
      .single()

    if (error) {
      set({ error: error.message, loading: false })
      return null
    } else {
      set(state => ({
        adsSessions: [data as AdsSession, ...state.adsSessions],
        loading: false
      }))
      return data.id
    }
  },

  startContentSession: async (id) => {
    // Start it asynchronously, updating status directly in DB via orchestrator
    runContentPipeline(id).then(() => {
      get().fetchContentSessions()
    }).catch((e) => {
      console.error(e)
      get().fetchContentSessions()
    })
  },

  startAdsSession: async (id) => {
    runAdsPipeline(id).then(() => {
      get().fetchAdsSessions()
    }).catch((e) => {
      console.error(e)
      get().fetchAdsSessions()
    })
  },

  updateSOP: async (id, updates) => {
    const { error } = await supabase
      .from('agency_sops')
      .update({ ...updates, version: updates.version ? updates.version + 1 : 2 })
      .eq('id', id)

    if (error) {
      set({ error: error.message })
    } else {
      get().fetchSOPs()
    }
  },

  resetSOP: async (id, defaultSOP) => {
    const { error } = await supabase
      .from('agency_sops')
      .update({ ...defaultSOP, version: 1 })
      .eq('id', id)

    if (error) {
      set({ error: error.message })
    } else {
      get().fetchSOPs()
    }
  }
}))
