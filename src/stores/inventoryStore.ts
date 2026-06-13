// src/stores/inventoryStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { InventoryItem, InventoryLog } from '../types'

interface InventoryState {
  items: InventoryItem[]
  log: InventoryLog[]
  loading: boolean
  error: string | null
  // Derived: how many complete frames can be built right now
  maxFrames: number
  // Derived: items that are at or below threshold
  lowStockItems: InventoryItem[]
  // Derived: the bottleneck item(s) limiting production
  bottlenecks: InventoryItem[]

  fetchInventory: () => Promise<void>
  fetchLog: (limit?: number) => Promise<void>
  adjustQuantity: (itemId: string, itemKey: string, delta: number, reason: string, note?: string) => Promise<void>
  setQuantity: (itemId: string, itemKey: string, newQty: number, note?: string) => Promise<void>
  updateCost: (itemId: string, costPerUnit: number) => Promise<void>
  updateThreshold: (itemId: string, minThreshold: number) => Promise<void>
}

function computeDerived(items: InventoryItem[]) {
  // For each item: how many frames can THIS item support?
  // e.g. 30 nails ÷ 3 per frame = 10 frames from nails
  const frameCapacities = items.map(i =>
    i.units_per_frame > 0 ? Math.floor(i.quantity / i.units_per_frame) : i.quantity
  )
  const maxFrames = items.length > 0 ? Math.min(...frameCapacities) : 0
  const lowStockItems = items.filter(i => {
    // Low stock if item can support fewer than min_threshold frames
    const framesFromItem = i.units_per_frame > 0
      ? Math.floor(i.quantity / i.units_per_frame)
      : i.quantity
    return framesFromItem <= i.min_threshold
  })
  const bottlenecks = items.filter((i, idx) => frameCapacities[idx] === maxFrames)
  return { maxFrames, lowStockItems, bottlenecks }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  log: [],
  loading: false,
  error: null,
  maxFrames: 0,
  lowStockItems: [],
  bottlenecks: [],

  fetchInventory: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name')

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    const items = (data as InventoryItem[]) ?? []
    set({ items, loading: false, ...computeDerived(items) })
  },

  fetchLog: async (limit = 50) => {
    const { data } = await supabase
      .from('inventory_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    set({ log: (data as InventoryLog[]) ?? [] })
  },

  adjustQuantity: async (itemId, itemKey, delta, reason, note) => {
    const item = get().items.find(i => i.id === itemId)
    if (!item) return
    const newQty = Math.max(0, item.quantity + delta)

    // Optimistic update
    const updatedItems = get().items.map(i =>
      i.id === itemId ? { ...i, quantity: newQty } : i
    )
    set({ items: updatedItems, ...computeDerived(updatedItems) })

    // Persist quantity
    const { error: updateErr } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', itemId)

    if (updateErr) {
      // Revert
      set({ items: get().items, error: updateErr.message })
      return
    }

    // Log the change
    await supabase.from('inventory_log').insert({
      item_id: itemId,
      item_key: itemKey,
      change: delta,
      reason,
      note: note ?? null,
    })

    // Refresh log
    get().fetchLog()
  },

  setQuantity: async (itemId, itemKey, newQty, note) => {
    const item = get().items.find(i => i.id === itemId)
    if (!item) return
    const delta = newQty - item.quantity

    const updatedItems = get().items.map(i =>
      i.id === itemId ? { ...i, quantity: newQty } : i
    )
    set({ items: updatedItems, ...computeDerived(updatedItems) })

    const { error: updateErr } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', itemId)

    if (updateErr) {
      set({ error: updateErr.message })
      return
    }

    await supabase.from('inventory_log').insert({
      item_id: itemId,
      item_key: itemKey,
      change: delta,
      reason: 'correction',
      note: note ?? `Manual set to ${newQty}`,
    })

    get().fetchLog()
  },

  updateCost: async (itemId, costPerUnit) => {
    set({
      items: get().items.map(i =>
        i.id === itemId ? { ...i, cost_per_unit: costPerUnit } : i
      ),
    })
    await supabase
      .from('inventory')
      .update({ cost_per_unit: costPerUnit })
      .eq('id', itemId)
  },

  updateThreshold: async (itemId, minThreshold) => {
    const updatedItems = get().items.map(i =>
      i.id === itemId ? { ...i, min_threshold: minThreshold } : i
    )
    set({ items: updatedItems, ...computeDerived(updatedItems) })
    await supabase
      .from('inventory')
      .update({ min_threshold: minThreshold })
      .eq('id', itemId)
  },
}))
