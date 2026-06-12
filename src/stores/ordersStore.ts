import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Order, OrderMaterial, Lead, OrderStatus } from '../types'

export interface SelectedOrder extends Order {
  lead: Lead | null
  materials: OrderMaterial[]
}

export interface OrderListItem extends Order {
  lead: { name: string } | null
  materials: { in_stock: boolean }[]
}

interface OrdersState {
  orders: OrderListItem[]
  selectedOrder: SelectedOrder | null
  loading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  fetchOrderById: (id: string) => Promise<void>
  addOrder: (
    order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'booking_paid' | 'balance_paid' | 'shipping_paid' | 'order_status'>,
    leadId?: string | null
  ) => Promise<Order>
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  togglePayment: (
    id: string,
    stage: 'booking' | 'balance' | 'shipping',
    isPaid: boolean,
    shippingFee?: number | null
  ) => Promise<void>
  toggleMaterialStock: (orderId: string, materialId: string, inStock: boolean) => Promise<void>
  clearError: () => void
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, lead:leads(name), materials:order_materials(in_stock)')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ orders: (data as any) || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch orders' })
    } finally {
      set({ loading: false })
    }
  },

  fetchOrderById: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, lead:leads(*), materials:order_materials(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      set({ selectedOrder: data as any })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch order details' })
    } finally {
      set({ loading: false })
    }
  },

  addOrder: async (order, leadId) => {
    set({ loading: true, error: null })
    try {
      // 1. Insert order
      const orderPayload = {
        ...order,
        lead_id: leadId || null,
        order_status: 'pending',
        booking_paid: false,
        balance_paid: false,
        shipping_paid: false
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Create the 6 raw materials rows
      const materials = [
        'box_frame',
        'model_plane',
        'printout_plaque',
        'frame_extension',
        'nail',
        'pvc_tape'
      ]
      const materialsPayload = materials.map((m) => ({
        order_id: newOrder.id,
        material: m,
        in_stock: true,
        notes: null
      }))

      const { error: materialsError } = await supabase
        .from('order_materials')
        .insert(materialsPayload)

      if (materialsError) throw materialsError

      // 3. Link back to lead (if lead exists)
      if (leadId) {
        // Update leads table
        const { error: leadUpdateError } = await supabase
          .from('leads')
          .update({
            has_order: true,
            order_id: newOrder.id,
            // Advance funnel stage to booking_paid if order created
            funnel_stage: 'booking_paid'
          })
          .eq('id', leadId)

        if (leadUpdateError) throw leadUpdateError

        // Log system note in lead_notes
        await supabase
          .from('lead_notes')
          .insert([{
            lead_id: leadId,
            note: `Order registered for ${newOrder.airline} (${newOrder.frame_type} frame). Status: Pending.`,
            type: 'system'
          }])
      }

      // Refresh orders list
      const { data: listData } = await supabase
        .from('orders')
        .select('*, lead:leads(name)')
        .order('created_at', { ascending: false })

      set({ orders: (listData as any) || [], loading: false })
      return newOrder
    } catch (err: any) {
      set({ error: err.message || 'Failed to create order', loading: false })
      throw err
    }
  },

  updateOrder: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Local refresh
      if (get().selectedOrder?.id === id) {
        set((state) => ({
          selectedOrder: state.selectedOrder
            ? { ...state.selectedOrder, ...updates }
            : null
        }))
      }

      // Refresh list
      const { data } = await supabase
        .from('orders')
        .select('*, lead:leads(name)')
        .order('created_at', { ascending: false })

      set({ orders: (data as any) || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to update order' })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  updateOrderStatus: async (id, status) => {
    const previousOrder = get().selectedOrder
    const previousOrdersList = [...get().orders]

    // Determine lifecycle timestamps to set
    const timestampUpdates: Partial<Order> = { order_status: status }
    const now = new Date().toISOString()

    if (status === 'in_production') {
      timestampUpdates.production_started_at = now
    } else if (status === 'ready') {
      timestampUpdates.production_completed_at = now
    } else if (status === 'shipped') {
      timestampUpdates.shipped_at = now
    } else if (status === 'delivered') {
      timestampUpdates.delivered_at = now
    }

    // Local Optimistic Update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...timestampUpdates } : o
      ),
      selectedOrder: state.selectedOrder?.id === id
        ? { ...state.selectedOrder, ...timestampUpdates }
        : null
    }))

    try {
      const { error } = await supabase
        .from('orders')
        .update(timestampUpdates)
        .eq('id', id)

      if (error) throw error

      // Sync Lead funnel stage if order has a lead linked
      const leadId = previousOrder?.id === id ? previousOrder.lead_id : previousOrdersList.find(o => o.id === id)?.lead_id
      if (leadId) {
        let leadStage: string | null = null
        if (status === 'booking_confirmed') leadStage = 'booking_paid'
        else if (status === 'in_production') leadStage = 'in_production'
        else if (status === 'ready') leadStage = 'ready_pending'
        else if (status === 'shipped') leadStage = 'shipping_paid'
        else if (status === 'delivered') leadStage = 'delivered'
        else if (status === 'cancelled') leadStage = 'lost'

        if (leadStage) {
          await supabase
            .from('leads')
            .update({ funnel_stage: leadStage })
            .eq('id', leadId)

          // Add System Note to Lead
          await supabase
            .from('lead_notes')
            .insert([{
              lead_id: leadId,
              note: `Order status changed to ${status.replace('_', ' ').toUpperCase()}. Syncing lead funnel stage.`,
              type: 'system'
            }])
        }
      }
    } catch (err: any) {
      // Rollback
      set({
        orders: previousOrdersList,
        selectedOrder: previousOrder,
        error: err.message || 'Failed to update order status'
      })
    }
  },

  togglePayment: async (id, stage, isPaid, shippingFee) => {
    const previousOrder = get().selectedOrder
    const now = isPaid ? new Date().toISOString() : null
    const updates: Partial<Order> = {}

    if (stage === 'booking') {
      updates.booking_paid = isPaid
      updates.booking_paid_at = now
      if (isPaid && previousOrder?.order_status === 'pending') {
        updates.order_status = 'booking_confirmed'
      }
    } else if (stage === 'balance') {
      updates.balance_paid = isPaid
      updates.balance_paid_at = now
    } else if (stage === 'shipping') {
      updates.shipping_paid = isPaid
      updates.shipping_paid_at = now
      if (shippingFee !== undefined) {
        updates.shipping_fee_aed = shippingFee
      }
    }

    // Optimistic local update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
      selectedOrder: state.selectedOrder?.id === id
        ? { ...state.selectedOrder, ...updates }
        : null
    }))

    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Sync lead stage if booking paid
      if (stage === 'booking' && isPaid && previousOrder?.lead_id) {
        await supabase
          .from('leads')
          .update({ funnel_stage: 'booking_paid' })
          .eq('id', previousOrder.lead_id)

        await supabase
          .from('lead_notes')
          .insert([{
            lead_id: previousOrder.lead_id,
            note: 'Booking fee (50 AED) logged as PAID. Advancing stage.',
            type: 'system'
          }])
      }
    } catch (err: any) {
      // Rollback
      set({
        selectedOrder: previousOrder,
        error: err.message || 'Failed to toggle payment status'
      })
    }
  },

  toggleMaterialStock: async (orderId, materialId, inStock) => {
    const previousOrder = get().selectedOrder
    if (!previousOrder) return

    // Optimistically update material stock locally
    const updatedMaterials = previousOrder.materials.map((m) =>
      m.id === materialId ? { ...m, in_stock: inStock } : m
    )

    set({
      selectedOrder: {
        ...previousOrder,
        materials: updatedMaterials
      }
    })

    try {
      const { error } = await supabase
        .from('order_materials')
        .update({ in_stock: inStock })
        .eq('id', materialId)

      if (error) throw error

      // Log note on lead if material goes out of stock (bottleneck)
      if (!inStock && previousOrder.lead_id) {
        const materialName = previousOrder.materials.find(m => m.id === materialId)?.material || 'material'
        const cleanName = materialName.replace('_', ' ').toUpperCase()
        
        await supabase
          .from('lead_notes')
          .insert([{
            lead_id: previousOrder.lead_id,
            note: `Production Alert: Material missing -> ${cleanName}. Bottleneck flagged.`,
            type: 'system'
          }])
      }
    } catch (err: any) {
      // Rollback
      set({
        selectedOrder: previousOrder,
        error: err.message || 'Failed to update material stock'
      })
    }
  }
}))
