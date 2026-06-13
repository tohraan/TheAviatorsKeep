import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  Save,
  ChevronRight
} from 'lucide-react'
import { useOrdersStore } from '@/stores/ordersStore'
import { formatGST, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { OrderStatus, Material } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: '1. Pending Review' },
  { value: 'booking_confirmed', label: '2. Booking Confirmed' },
  { value: 'in_production', label: '3. In Production' },
  { value: 'ready', label: '4. Frame Ready' },
  { value: 'awaiting_shipping_payment', label: '5. Awaiting Shipping Payment' },
  { value: 'shipped', label: '6. Shipped / Dispatched' },
  { value: 'delivered', label: '7. Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
]

const MATERIAL_LABELS: Record<Material, string> = {
  box_frame: 'Box Frame',
  model_plane: 'Model Plane (Airliner)',
  printout_plaque: 'Printout Plaque',
  frame_extension: 'Frame Extension',
  nail: 'Nail (Plane Mounting)',
  pvc_tape: 'PVC Tape'
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()

  const {
    selectedOrder,
    loading,
    error,
    fetchOrderById,
    updateOrderStatus,
    togglePayment,
    toggleMaterialStock,
    updateOrder
  } = useOrdersStore()

  // Shipping inputs
  const [shippingFee, setShippingFee] = useState<string>('')
  const [courier, setCourier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSavingShipping, setIsSavingShipping] = useState(false)

  // Details inputs
  const [deliveredDate, setDeliveredDate] = useState<string>('')
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  // Material notes inputs (local states mapped by material ID)
  const [materialNotes, setMaterialNotes] = useState<Record<string, string>>({})
  const [savingMaterialId, setSavingMaterialId] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchOrderById(id)
    }
  }, [id, fetchOrderById])

  // Prefill states on load
  useEffect(() => {
    if (selectedOrder) {
      setShippingFee(selectedOrder.shipping_fee_aed ? selectedOrder.shipping_fee_aed.toString() : '')
      setCourier(selectedOrder.courier || '')
      setTrackingNumber(selectedOrder.tracking_number || '')
      
      setDeliveredDate(
        selectedOrder.delivered_at 
          ? formatGST(selectedOrder.delivered_at, 'yyyy-MM-dd') 
          : ''
      )

      const notesMap: Record<string, string> = {}
      selectedOrder.materials.forEach((m) => {
        notesMap[m.id] = m.notes || ''
      })
      setMaterialNotes(notesMap)
    }
  }, [selectedOrder])

  const handleStatusChange = async (val: string) => {
    if (id) {
      await updateOrderStatus(id, val as OrderStatus)
    }
  }

  const handleSaveDetails = async () => {
    if (id) {
      setIsSavingDetails(true)
      try {
        let deliveredAtValue = null
        if (deliveredDate) {
          const local = new Date(`${deliveredDate}T00:00:00`);
          local.setHours(local.getHours() - 4); // Undo GST
          deliveredAtValue = local.toISOString()
        }
        await updateOrder(id, { delivered_at: deliveredAtValue })
      } catch (e) {
        // handled
      } finally {
        setIsSavingDetails(false)
      }
    }
  }

  const handleSaveShipping = async () => {
    if (id) {
      setIsSavingShipping(true)
      try {
        const fee = shippingFee === '' ? null : Number(shippingFee)
        await updateOrder(id, {
          shipping_fee_aed: fee,
          courier: courier === '' ? null : courier,
          tracking_number: trackingNumber === '' ? null : trackingNumber
        })
      } catch (e) {
        // handled
      } finally {
        setIsSavingShipping(false)
      }
    }
  }

  const handleSaveMaterialNote = async (mId: string, mName: Material) => {
    setSavingMaterialId(mId)
    try {
      const { error: err } = await supabase
        .from('order_materials')
        .update({ notes: materialNotes[mId] || null })
        .eq('id', mId)

      if (err) throw err

      // Update local state notes logs
      if (selectedOrder && selectedOrder.lead_id) {
        const cleanName = mName.replace('_', ' ').toUpperCase()
        await supabase
          .from('lead_notes')
          .insert([{
            lead_id: selectedOrder.lead_id,
            note: `Updated checklist note for ${cleanName}: "${materialNotes[mId]}"`,
            type: 'system'
          }])
      }
    } catch (e) {
      // handled
    } finally {
      setSavingMaterialId(null)
    }
  }

  if (loading && !selectedOrder) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary font-body">Loading order details...</p>
      </div>
    )
  }

  if (!selectedOrder) {
    return (
      <div className="flex flex-col items-center justify-center border border-border-default rounded-lg py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-status-red mb-3" />
        <p className="text-sm text-text-secondary font-body font-semibold">Order not found</p>
        <Link to="/orders" className="text-accent-primary hover:underline font-ui text-xs mt-3 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Link>
      </div>
    )
  }

  // Bottleneck check
  const hasBottleneck = selectedOrder.materials.some((m) => !m.in_stock)

  // Payments logic values
  const basePrice = Number(selectedOrder.price_aed)
  const bookingAmt = 50.00
  const balanceAmt = basePrice - bookingAmt
  const shippingAmt = Number(selectedOrder.shipping_fee_aed || 0)
  const totalCollected =
    (selectedOrder.booking_paid ? bookingAmt : 0) +
    (selectedOrder.balance_paid ? balanceAmt : 0) +
    (selectedOrder.shipping_paid ? shippingAmt : 0)

  // Status Strip Steps definition
  const orderStatus = selectedOrder.order_status
  const steps = [
    { label: 'Booking', active: selectedOrder.booking_paid, current: orderStatus === 'booking_confirmed', statusValue: 'booking_confirmed' },
    { label: 'Production', active: orderStatus !== 'pending' && orderStatus !== 'booking_confirmed', current: orderStatus === 'in_production', statusValue: 'in_production' },
    { label: 'Ready', active: orderStatus === 'ready' || orderStatus === 'awaiting_shipping_payment' || orderStatus === 'shipped' || orderStatus === 'delivered', current: orderStatus === 'ready', statusValue: 'ready' },
    { label: 'Balance Paid', active: selectedOrder.balance_paid, current: orderStatus === 'awaiting_shipping_payment', statusValue: 'awaiting_shipping_payment' },
    { label: 'Shipped', active: orderStatus === 'shipped' || orderStatus === 'delivered', current: orderStatus === 'shipped', statusValue: 'shipped' },
    { label: 'Delivered', active: orderStatus === 'delivered', current: orderStatus === 'delivered', statusValue: 'delivered' }
  ]

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-ui tracking-wide text-text-primary uppercase">
                Order #{selectedOrder.id.substring(0, 8)}
              </h1>
              {hasBottleneck && (
                <Badge className="bg-status-red/10 border border-status-red/20 text-status-red text-[9px] font-ui uppercase">
                  Bottleneck
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-secondary font-body mt-0.5">
              Product: <strong className="text-text-primary">{selectedOrder.airline} {selectedOrder.plane_model}</strong> · {selectedOrder.frame_type} Frame
            </p>
          </div>
        </div>

        {/* Quick status selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Label className="text-text-secondary uppercase tracking-wider text-[10px] hidden sm:block whitespace-nowrap">
            Pipeline Stage:
          </Label>
          <div className="w-full sm:w-[220px]">
            <Select value={selectedOrder.order_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-bg-surface border-border-strong text-text-primary text-xs font-ui">
                <SelectValue placeholder="Pipeline Stage" />
              </SelectTrigger>
              <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Cockpit Status Timeline Strip */}
      <Card className="bg-bg-surface border-border-default overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-ui text-[11px] uppercase tracking-wide">
            {steps.map((step, idx) => (
              <div 
                key={step.label} 
                className="flex-1 flex items-center gap-3 cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => handleStatusChange(step.statusValue)}
                title={`Mark as ${step.label}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center border font-body text-[10px]",
                      step.active
                        ? "bg-status-green/10 border-status-green/30 text-status-green"
                        : step.current
                          ? "border-accent-primary text-accent-primary animate-pulse font-semibold"
                          : "border-border-default text-text-muted"
                    )}
                  >
                    {step.active ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      step.active
                        ? "text-status-green"
                        : step.current
                          ? "text-accent-primary"
                          : "text-text-secondary"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-[1px] bg-border-default" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Payments & Production logs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Payment Tracker Card */}
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary flex items-center justify-between">
                <span>Payment Lifecycle Tracker</span>
                <span className="font-body text-[11px] text-text-primary">
                  Collected: AED {totalCollected.toFixed(2)} / {(basePrice + shippingAmt).toFixed(2)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-ui">
              {/* booking row */}
              <div className="flex items-center justify-between p-3 bg-bg-elevated border border-border-default rounded-lg">
                <div className="space-y-1">
                  <span className="font-semibold text-text-primary block text-sm">
                    1. Booking Amount (AED 50.00)
                  </span>
                  <span className="text-text-secondary text-[11px] font-body block">
                    {selectedOrder.booking_paid
                      ? `Paid on: ${formatGST(selectedOrder.booking_paid_at, 'dd/MM/yyyy HH:mm')}`
                      : 'Awaiting customer confirmation'}
                  </span>
                </div>
                <Button
                  onClick={() => togglePayment(selectedOrder.id, 'booking', !selectedOrder.booking_paid)}
                  className={cn(
                    "text-xs px-3 py-1.5 h-8 font-semibold transition-all",
                    selectedOrder.booking_paid
                      ? "bg-status-green/10 hover:bg-status-green/20 text-status-green border border-status-green/20"
                      : "bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-text-primary"
                  )}
                >
                  {selectedOrder.booking_paid ? '✓ Paid' : 'Mark Paid'}
                </Button>
              </div>

              {/* balance row */}
              <div className="flex items-center justify-between p-3 bg-bg-elevated border border-border-default rounded-lg">
                <div className="space-y-1">
                  <span className="font-semibold text-text-primary block text-sm">
                    2. Balance Outstanding (AED {balanceAmt.toFixed(2)})
                  </span>
                  <span className="text-text-secondary text-[11px] font-body block">
                    {selectedOrder.balance_paid
                      ? `Paid on: ${formatGST(selectedOrder.balance_paid_at, 'dd/MM/yyyy HH:mm')}`
                      : 'Awaiting frame completion and photo sharing'}
                  </span>
                </div>
                <Button
                  onClick={() => togglePayment(selectedOrder.id, 'balance', !selectedOrder.balance_paid)}
                  disabled={!selectedOrder.booking_paid}
                  className={cn(
                    "text-xs px-3 py-1.5 h-8 font-semibold transition-all",
                    selectedOrder.balance_paid
                      ? "bg-status-green/10 hover:bg-status-green/20 text-status-green border border-status-green/20"
                      : "bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-text-primary"
                  )}
                >
                  {selectedOrder.balance_paid ? '✓ Paid' : 'Mark Paid'}
                </Button>
              </div>

              {/* shipping row */}
              <div className="p-3 bg-bg-elevated border border-border-default rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-semibold text-text-primary block text-sm">
                      3. Shipping & Delivery
                    </span>
                    <span className="text-text-secondary text-[11px] font-body block">
                      {selectedOrder.shipping_paid && selectedOrder.shipping_fee_aed
                        ? `Paid on: ${formatGST(selectedOrder.shipping_paid_at, 'dd/MM/yyyy HH:mm')}`
                        : 'Requires courier quote approval'}
                    </span>
                  </div>
                  <Button
                    onClick={() =>
                      togglePayment(
                        selectedOrder.id,
                        'shipping',
                        !selectedOrder.shipping_paid,
                        shippingFee ? Number(shippingFee) : null
                      )
                    }
                    disabled={!selectedOrder.balance_paid || !shippingFee}
                    className={cn(
                      "text-xs px-3 py-1.5 h-8 font-semibold transition-all",
                      selectedOrder.shipping_paid
                        ? "bg-status-green/10 hover:bg-status-green/20 text-status-green border border-status-green/20"
                        : "bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {selectedOrder.shipping_paid ? '✓ Paid' : 'Mark Paid'}
                  </Button>
                </div>

                {/* Courier info inputs */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border-subtle text-xs">
                  <div className="space-y-1">
                    <Label className="text-text-secondary text-[9px] uppercase tracking-wider">Shipping Fee (AED)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 35.00"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      className="bg-bg-input border-border-default text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-text-secondary text-[9px] uppercase tracking-wider">Courier/Agent</Label>
                    <Input
                      placeholder="e.g. Aramex / DHL"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="bg-bg-input border-border-default text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-text-secondary text-[9px] uppercase tracking-wider">Tracking Number</Label>
                    <Input
                      placeholder="Tracking #"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="bg-bg-input border-border-default text-xs h-8"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleSaveShipping}
                    disabled={isSavingShipping}
                    className="h-8 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-text-primary text-xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" /> Save Shipping Info
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production timeline logs card */}
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary">
                Production Timeline Stamps
              </CardTitle>
              <Button
                onClick={handleSaveDetails}
                disabled={isSavingDetails}
                className="h-7 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-text-primary text-[10px] px-2"
              >
                <Save className="h-3 w-3 mr-1" /> Save Details
              </Button>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 text-xs font-ui">
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Registered Date</span>
                <span className="font-body text-text-primary font-medium">
                  {formatGST(selectedOrder.created_at, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Booking Confirmed</span>
                <span className="font-body text-text-primary font-medium">
                  {selectedOrder.booking_paid_at ? (
                    formatGST(selectedOrder.booking_paid_at, 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-text-muted italic">Pending</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Production Started</span>
                <span className="font-body text-text-primary font-medium">
                  {selectedOrder.production_started_at ? (
                    formatGST(selectedOrder.production_started_at, 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-text-muted italic">Not started</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Production Completed</span>
                <span className="font-body text-text-primary font-medium">
                  {selectedOrder.production_completed_at ? (
                    formatGST(selectedOrder.production_completed_at, 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-text-muted italic">In queue</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Dispatched</span>
                <span className="font-body text-text-primary font-medium">
                  {selectedOrder.shipped_at ? (
                    formatGST(selectedOrder.shipped_at, 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-text-muted italic">Awaiting shipment</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Delivered On</span>
                <span className="font-body text-text-primary font-medium mt-1 block">
                  <Input 
                    type="date" 
                    className="h-7 text-[10px] bg-bg-input border-border-default max-w-[130px] font-body uppercase"
                    value={deliveredDate}
                    onChange={(e) => setDeliveredDate(e.target.value)}
                  />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Materials Checklist & Lead info */}
        <div className="lg:col-span-5 space-y-6">
          {/* Materials Checklist Card */}
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary flex items-center justify-between">
                <span>Materials & Parts Checklist</span>
                {hasBottleneck && (
                  <span className="text-[10px] text-status-orange font-semibold font-ui uppercase">
                    ⚠ Stock Missing
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-ui">
              {selectedOrder.materials.map((m) => (
                <div key={m.id} className="space-y-2 p-2.5 bg-bg-elevated border border-border-subtle rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{MATERIAL_LABELS[m.material]}</span>
                    <Button
                      onClick={() => toggleMaterialStock(selectedOrder.id, m.id, !m.in_stock)}
                      className={cn(
                        "h-6 px-2 text-[9px] font-semibold transition-all",
                        m.in_stock
                          ? "bg-status-green/10 text-status-green border border-status-green/20 hover:bg-status-green/20"
                          : "bg-status-orange/10 text-status-orange border border-status-orange/20 hover:bg-status-orange/20"
                      )}
                    >
                      {m.in_stock ? '✓ In Stock' : '⚠ Missing'}
                    </Button>
                  </div>
                  {/* Notes box */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Comment / supplier notes..."
                      value={materialNotes[m.id] || ''}
                      onChange={(e) =>
                        setMaterialNotes({
                          ...materialNotes,
                          [m.id]: e.target.value
                        })
                      }
                      className="bg-bg-input border-border-default h-7 text-[11px] font-body"
                    />
                    <Button
                      onClick={() => handleSaveMaterialNote(m.id, m.material)}
                      disabled={savingMaterialId === m.id}
                      className="h-7 w-7 p-0 bg-bg-surface border border-border-default hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Associated Lead Card */}
          {selectedOrder.lead && (
            <Card className="bg-bg-surface border-border-default">
              <CardHeader className="border-b border-border-subtle pb-3">
                <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary">
                  Associated CRM Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-ui font-semibold text-text-primary text-sm">
                    {selectedOrder.lead.name}
                  </span>
                  <Link to={`/leads/${selectedOrder.lead_id}`}>
                    <Button className="h-7 px-2.5 bg-accent-muted hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 text-[10px] font-ui">
                      Open Profile <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 text-text-secondary font-body">
                  <div>
                    <span className="text-[9px] uppercase font-ui block text-text-muted">Lead Source</span>
                    <span className="capitalize">{selectedOrder.lead.source.replace('_', ' ')}</span>
                  </div>
                  {selectedOrder.lead.phone && (
                    <div>
                      <span className="text-[9px] uppercase font-ui block text-text-muted">Contact</span>
                      <span>{selectedOrder.lead.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
