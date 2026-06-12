import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Cost } from '../types'

interface FinanceState {
  costs: Cost[]
  loading: boolean
  error: string | null
  fetchCosts: () => Promise<void>
  addCost: (cost: Omit<Cost, 'id' | 'created_at'>) => Promise<void>
  deleteCost: (id: string) => Promise<void>
  clearError: () => void
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  costs: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchCosts: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('costs')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      set({ costs: data || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch costs' })
    } finally {
      set({ loading: false })
    }
  },

  addCost: async (cost) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('costs')
        .insert([cost])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        costs: [data, ...state.costs],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to add cost entry', loading: false })
      throw err
    }
  },

  deleteCost: async (id) => {
    const previousCosts = [...get().costs]

    set((state) => ({
      costs: state.costs.filter((c) => c.id !== id)
    }))

    try {
      const { error } = await supabase
        .from('costs')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      set({ costs: previousCosts, error: err.message || 'Failed to delete cost entry' })
      throw err
    }
  }
}))
