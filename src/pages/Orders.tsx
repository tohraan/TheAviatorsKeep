import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Package,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  FilterX,
  Plus,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle,
  Truck
} from 'lucide-react'
import { useOrdersStore } from '@/stores/ordersStore'
import { formatGST, formatLocalDate, cn } from '@/lib/utils'
import { OrderStatus } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATUS_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Awaiting Booking' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_production', label: 'In Production' },
  { value: 'ready', label: 'Ready' },
  { value: 'shipped', label: 'Shipped/Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
]

const STATUS_DETAILS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-status-yellow bg-status-yellow/10 border-status-yellow/20' },
  booking_confirmed: { label: 'Confirmed', color: 'text-status-blue bg-status-blue/10 border-status-blue/20' },
  in_production: { label: 'In Production', color: 'text-status-orange bg-status-orange/10 border-status-orange/20 animate-pulse' },
  ready: { label: 'Ready', color: 'text-status-purple bg-status-purple/10 border-status-purple/20' },
  awaiting_shipping_payment: { label: 'Awaiting Shipping Payment', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  shipped: { label: 'Shipped', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  delivered: { label: 'Delivered', color: 'text-status-green bg-status-green/10 border-status-green/20' },
  cancelled: { label: 'Cancelled', color: 'text-status-red bg-status-red/10 border-status-red/20' }
}

export default function Orders() {
  const navigate = useNavigate()
  const { orders, loading, error, fetchOrders } = useOrdersStore()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Filter calculations
  const filteredOrders = (orders || []).filter((o) => {
    const matchesSearch =
      o.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.plane_model && o.plane_model.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.lead?.name && o.lead.name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') return matchesSearch && o.order_status === 'pending'
    if (activeTab === 'confirmed') return matchesSearch && o.order_status === 'booking_confirmed'
    if (activeTab === 'in_production') return matchesSearch && o.order_status === 'in_production'
    if (activeTab === 'ready') return matchesSearch && (o.order_status === 'ready' || o.order_status === 'awaiting_shipping_payment')
    if (activeTab === 'shipped') return matchesSearch && (o.order_status === 'shipped' || o.order_status === 'delivered')
    if (activeTab === 'cancelled') return matchesSearch && o.order_status === 'cancelled'

    return matchesSearch
  })

  // Summary counts
  const totalRevenue = (orders || [])
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((sum, o) => {
      let orderRevenue = 0
      if (o.booking_paid) orderRevenue += 50
      if (o.balance_paid) orderRevenue += (Number(o.price_aed) - 50)
      if (o.shipping_paid && o.shipping_fee_aed) orderRevenue += Number(o.shipping_fee_aed)
      return sum + orderRevenue
    }, 0)

  const activeOrders = (orders || []).filter(
    (o) => o.order_status !== 'delivered' && o.order_status !== 'cancelled'
  )
  const inProdCount = activeOrders.filter((o) => o.order_status === 'in_production').length
  const missingMaterialsCount = activeOrders.filter(
    (o) => o.materials && o.materials.some((m) => !m.in_stock)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-ui tracking-wide">Order Operations</h1>
          <p className="text-sm text-text-secondary font-body mt-1">
            Track box frame production, checklists, payments, and dispatch.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Cumulative Revenue
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-text-muted font-body text-xs">AED</span>
                <span className="text-3xl font-headline text-text-primary tracking-wide">
                  {totalRevenue.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-status-green/10 border border-status-green/20 flex items-center justify-center text-status-green">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Active Queue
              </span>
              <div className="mt-1">
                <span className="text-3xl font-headline text-text-primary tracking-wide">
                  {activeOrders.length}
                </span>
                <span className="text-text-secondary font-body text-xs ml-1.5">orders</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-status-blue/10 border border-status-blue/20 flex items-center justify-center text-status-blue">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                In Production
              </span>
              <div className="mt-1">
                <span className="text-3xl font-headline text-status-orange tracking-wide">
                  {inProdCount}
                </span>
                <span className="text-text-secondary font-body text-xs ml-1.5">running</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-status-orange/10 border border-status-orange/20 flex items-center justify-center text-status-orange">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Material Alerts
              </span>
              <div className="mt-1">
                <span
                  className={cn(
                    "text-3xl font-headline tracking-wide",
                    missingMaterialsCount > 0 ? "text-status-red" : "text-text-primary"
                  )}
                >
                  {missingMaterialsCount}
                </span>
                <span className="text-text-secondary font-body text-xs ml-1.5">bottlenecks</span>
              </div>
            </div>
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center border",
                missingMaterialsCount > 0
                  ? "bg-status-red/10 border-status-red/20 text-status-red"
                  : "bg-bg-elevated border-border-default text-text-secondary"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-bg-surface border border-border-default rounded-lg p-4">
        <div className="flex-1 max-w-lg relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search by customer name, airline, plane model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-bg-input border-border-default text-xs font-ui"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto overflow-x-auto">
          <TabsList className="bg-bg-elevated border border-border-default font-ui text-xs">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-text-secondary hover:text-text-primary data-[state=active]:bg-bg-surface data-[state=active]:text-accent-primary text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid List View */}
      {loading && filteredOrders.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-text-secondary font-body">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border-default rounded-lg py-16 px-4 text-center">
          <Package className="h-10 w-10 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary font-body font-semibold">No orders found</p>
          <p className="text-xs text-text-muted font-body mt-1 max-w-sm">
            Try adjusting your search criteria or register a new order inside a customer's Lead Detail profile.
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="border-border-default hover:bg-bg-elevated text-xs font-ui mt-4"
            >
              <FilterX className="mr-2 h-4 w-4" /> Clear Search Query
            </Button>
          )}
        </div>
      ) : (
        /* Orders Database Table */
        <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-bg-surface text-text-secondary text-[10px] uppercase tracking-wider font-ui font-semibold">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product Variant</th>
                  <th className="p-4">AED Cost</th>
                  <th className="p-4 text-center">Payments</th>
                  <th className="p-4 text-center">Materials</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body text-xs">
                {filteredOrders.map((o) => {
                  const hasBottleneck = o.materials && o.materials.some((m) => !m.in_stock)
                  const orderDate = formatGST(o.created_at, 'dd/MM/yyyy')

                  return (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="hover:bg-bg-elevated/40 cursor-pointer transition-colors"
                    >
                      {/* Short ID */}
                      <td className="p-4 font-semibold text-text-muted uppercase">
                        #{o.id.substring(0, 8)}
                      </td>

                      {/* Customer Link */}
                      <td className="p-4">
                        {o.lead_id && o.lead ? (
                          <Link
                            to={`/leads/${o.lead_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-ui font-semibold text-text-primary hover:text-accent-primary hover:underline flex items-center gap-1.5"
                          >
                            {o.lead.name}
                            <ExternalLink className="h-3 w-3 text-text-muted" />
                          </Link>
                        ) : (
                          <span className="text-text-muted italic">Organic Order</span>
                        )}
                      </td>

                      {/* Product */}
                      <td className="p-4">
                        <span className="font-ui font-medium text-text-primary block">
                          {o.airline} {o.plane_model}
                        </span>
                        <span className="text-[10px] text-text-secondary capitalize block mt-0.5">
                          {o.frame_type} Frame {o.plaque_color ? `· ${o.plaque_color} plaque` : ''}
                        </span>
                      </td>

                      {/* AED Cost */}
                      <td className="p-4 text-text-primary font-semibold">
                        AED {Number(o.price_aed).toFixed(2)}
                      </td>

                      {/* Payments Visual Grid */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Booking */}
                          <div
                            className={cn(
                              "h-5 px-1.5 rounded-sm flex items-center justify-center text-[9px] font-ui border",
                              o.booking_paid
                                ? "bg-status-green/10 text-status-green border-status-green/20"
                                : "bg-bg-elevated text-text-muted border-border-default"
                            )}
                            title={`Booking: ${o.booking_paid ? 'Paid' : 'Unpaid'}`}
                          >
                            B
                          </div>
                          {/* Balance */}
                          <div
                            className={cn(
                              "h-5 px-1.5 rounded-sm flex items-center justify-center text-[9px] font-ui border",
                              o.balance_paid
                                ? "bg-status-green/10 text-status-green border-status-green/20"
                                : "bg-bg-elevated text-text-muted border-border-default"
                            )}
                            title={`Balance: ${o.balance_paid ? 'Paid' : 'Unpaid'}`}
                          >
                            L
                          </div>
                          {/* Shipping */}
                          <div
                            className={cn(
                              "h-5 px-1.5 rounded-sm flex items-center justify-center text-[9px] font-ui border",
                              !o.shipping_fee_aed
                                ? "bg-bg-base/40 text-text-muted/40 border-dashed border-border-subtle"
                                : o.shipping_paid
                                  ? "bg-status-green/10 text-status-green border-status-green/20"
                                  : "bg-bg-elevated text-text-muted border-border-default"
                            )}
                            title={`Shipping: ${
                              !o.shipping_fee_aed
                                ? 'No shipping quote'
                                : o.shipping_paid
                                  ? 'Paid'
                                  : 'Unpaid'
                            }`}
                          >
                            S
                          </div>
                        </div>
                      </td>

                      {/* Material Status Alert */}
                      <td className="p-4 text-center">
                        {hasBottleneck ? (
                          <Badge className="bg-status-orange/15 text-status-orange border border-status-orange/20 text-[9px] px-1.5 font-ui uppercase font-medium">
                            Bottleneck
                          </Badge>
                        ) : (
                          <Badge className="bg-bg-elevated text-text-muted border border-border-subtle text-[9px] px-1.5 font-ui uppercase font-medium">
                            Stock OK
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-2 py-0.5 border font-ui uppercase font-medium whitespace-nowrap",
                            STATUS_DETAILS[o.order_status]?.color || 'border-border-default'
                          )}
                        >
                          {STATUS_DETAILS[o.order_status]?.label || o.order_status.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-text-secondary text-[11px]">
                        {orderDate}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
