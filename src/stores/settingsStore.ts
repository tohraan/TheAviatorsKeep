// src/stores/settingsStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Setting } from '../types'

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  error: string | null
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    const map: Record<string, string> = {}
    ;(data as Setting[]).forEach(row => { map[row.key] = row.value })
    set({ settings: map, loading: false })
  },

  updateSetting: async (key: string, value: string) => {
    const prev = get().settings
    // Optimistic update
    set({ settings: { ...prev, [key]: value } })
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
    if (error) {
      // Revert on failure
      set({ settings: prev, error: error.message })
    }
  },
}))
