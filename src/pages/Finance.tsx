import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  TrendingUp,
  Coins,
  AlertTriangle,
  Trash2,
  FilterX,
  CreditCard,
  DollarSign
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useFinanceStore } from '@/stores/financeStore'
import { useOrdersStore } from '@/stores/ordersStore'
import { formatLocalDate, cn } from '@/lib/utils'
import type { CostCategory } from '@/types'

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const COST_CATEGORIES: { value: CostCategory; label: string }[] = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'ad_spend', label: 'Ad Spend' },
  { value: 'shipping_error', label: 'Shipping Error' },
  { value: 'waste', label: 'Wasted/Damaged' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
]

const AD_PLATFORMS = [
  { value: 'none', label: 'None / No Ads' },
  { value: 'facebook_marketplace', label: 'FB Marketplace' },
  { value: 'facebook_page', label: 'FB Page' },
  { value: 'instagram', label: 'Instagram' }
]

const costSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['raw_materials', 'consumables', 'ad_spend', 'shipping_error', 'waste', 'miscellaneous']),
  amount_aed: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  ad_platform: z.string().optional().nullable().transform(val => val === 'none' || val === '' ? null : val),
  order_id: z.string().optional().nullable().transform(val => val === '' ? null : val)
})

export default function Finance() {
  const { costs, loading: financeLoading, error: financeError, fetchCosts, addCost, deleteCost } = useFinanceStore()
  const { orders, fetchOrders } = useOrdersStore()

  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all') // YYYY-MM

  useEffect(() => {
    fetchCosts()
    fetchOrders()
  }, [fetchCosts, fetchOrders])

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      category: 'raw_materials',
      amount_aed: 0,
      description: '',
      ad_platform: 'none',
      order_id: ''
    }
  })

  const selectedCategory = watch('category')

  const onSubmit = async (data: any) => {
    try {
      await addCost(data as any)
      reset({
        date: new Date().toISOString().split('T')[0],
        category: 'raw_materials',
        amount_aed: 0,
        description: '',
        ad_platform: 'none',
        order_id: ''
      })
    } catch (e) {
      // handled by store
    }
  }

  // Get months list for filter dropdown
  const uniqueMonths = Array.from(
    new Set(
      costs.map((c) => c.date.substring(0, 7))
    )
  ).sort((a, b) => b.localeCompare(a))

  // Filter costs
  const filteredCosts = costs.filter((c) => {
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter
    const matchesMonth = monthFilter === 'all' || c.date.startsWith(monthFilter)
    return matchesCategory && matchesMonth
  })

  // Summary Metrics calculations (Current Month)
  const currentMonthStr = new Date().toISOString().substring(0, 7)

  // Monthly Revenue from orders delivered this month
  const getOrderRevenue = (order: typeof orders[0]) => {
    let rev = 0
    if (order.booking_paid) rev += 50
    if (order.balance_paid) rev += (Number(order.price_aed) - 50)
    if (order.shipping_paid && order.shipping_fee_aed) rev += Number(order.shipping_fee_aed)
    return rev
  }

  const currentMonthRevenue = (orders || [])
    .filter((o) => o.order_status === 'delivered' && o.delivered_at && o.delivered_at.startsWith(currentMonthStr))
    .reduce((sum, o) => sum + getOrderRevenue(o), 0)

  const currentMonthCosts = costs
    .filter((c) => c.date.startsWith(currentMonthStr))
    .reduce((sum, c) => sum + Number(c.amount_aed), 0)

  const currentMonthProfit = currentMonthRevenue - currentMonthCosts
  const currentMonthMargin = currentMonthRevenue > 0 ? (currentMonthProfit / currentMonthRevenue) * 100 : 0

  // Calculate Last 6 Months P&L Data for Recharts Bar Chart
  const getPLChartData = () => {
    const dataMap: Record<string, { monthLabel: string; Revenue: number; Expenses: number; Profit: number }> = {}

    // Get last 6 months keys
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().substring(0, 7)
      months.push(key)
      
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      dataMap[key] = { monthLabel: label, Revenue: 0, Expenses: 0, Profit: 0 }
    }

    // Populate revenue from delivered orders
    orders.forEach((o) => {
      if (o.order_status === 'delivered' && o.delivered_at) {
        const monthKey = o.delivered_at.substring(0, 7)
        if (dataMap[monthKey]) {
          dataMap[monthKey].Revenue += getOrderRevenue(o)
        }
      }
    })

    // Populate expenses from costs table
    costs.forEach((c) => {
      const monthKey = c.date.substring(0, 7)
      if (dataMap[monthKey]) {
        dataMap[monthKey].Expenses += Number(c.amount_aed)
      }
    })

    // Calculate profit
    months.forEach((m) => {
      dataMap[m].Profit = dataMap[m].Revenue - dataMap[m].Expenses
    })

    return months.map((m) => dataMap[m])
  }

  const chartData = getPLChartData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold font-ui tracking-wide">Finance & P&L</h1>
        <p className="text-sm text-text-secondary font-body mt-1">
          Review business margins, log material costs, ad spend, and view monthly P&L charts.
        </p>
      </div>

      {/* KPI summaries cards (Current Month GST) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rev Card */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Revenue (This Month)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-text-muted font-body text-xs">AED</span>
                <span className="text-2xl font-headline text-text-primary tracking-wide">
                  {currentMonthRevenue.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-status-green/10 border border-status-green/20 flex items-center justify-center text-status-green">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Costs (This Month)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-text-muted font-body text-xs">AED</span>
                <span className="text-2xl font-headline text-status-orange tracking-wide">
                  {currentMonthCosts.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-status-orange/10 border border-status-orange/20 flex items-center justify-center text-status-orange">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Net Profit (This Month)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-text-muted font-body text-xs">AED</span>
                <span
                  className={cn(
                    "text-2xl font-headline tracking-wide",
                    currentMonthProfit >= 0 ? "text-status-green" : "text-status-red"
                  )}
                >
                  {currentMonthProfit.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border",
                currentMonthProfit >= 0
                  ? "bg-status-green/10 border-status-green/20 text-status-green"
                  : "bg-status-red/10 border-status-red/20 text-status-red"
              )}
            >
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        {/* Margin Card */}
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
                Net Profit Margin
              </span>
              <div className="mt-1">
                <span
                  className={cn(
                    "text-2xl font-headline tracking-wide",
                    currentMonthMargin >= 0 ? "text-status-green" : "text-status-red"
                  )}
                >
                  {currentMonthMargin.toFixed(1)}%
                </span>
                <span className="text-text-muted text-[10px] font-body ml-1">margin</span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-status-purple/10 border border-status-purple/20 flex items-center justify-center text-status-purple">
              <Coins className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Structure */}
      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="bg-bg-surface border border-border-default font-ui text-xs">
          <TabsTrigger value="tracker" className="text-text-secondary data-[state=active]:text-accent-primary text-xs">
            Cost Tracker
          </TabsTrigger>
          <TabsTrigger value="pl_summary" className="text-text-secondary data-[state=active]:text-accent-primary text-xs">
            Profit & Loss Summary
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Cost Tracker */}
        <TabsContent value="tracker" className="pt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: cost list table */}
            <div className="lg:col-span-8 space-y-4">
              {/* Cost filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg-surface border border-border-default rounded-lg p-3">
                <div className="w-full sm:w-[180px]">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
                      <SelectValue placeholder="Filter Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-elevated border-border-default text-text-primary font-ui text-xs">
                      <SelectItem value="all">All Categories</SelectItem>
                      {COST_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-[180px]">
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
                      <SelectValue placeholder="Filter Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-elevated border-border-default text-text-primary font-body text-xs">
                      <SelectItem value="all">All Months</SelectItem>
                      {uniqueMonths.map((m) => {
                        const label = new Date(m + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        return <SelectItem key={m} value={m}>{label}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {(categoryFilter !== 'all' || monthFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCategoryFilter('all')
                      setMonthFilter('all')
                    }}
                    className="text-text-secondary hover:text-text-primary text-xs self-start sm:self-auto"
                  >
                    <FilterX className="h-4 w-4 mr-2" /> Reset
                  </Button>
                )}
              </div>

              {financeError && (
                <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{financeError}</span>
                </div>
              )}

              {/* Table */}
              <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-default bg-bg-surface text-text-secondary text-[10px] uppercase tracking-wider font-ui font-semibold">
                        <th className="p-3">Date</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">AED Cost</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-body text-xs">
                      {financeLoading && filteredCosts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-text-secondary">
                            Loading cost items...
                          </td>
                        </tr>
                      ) : filteredCosts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-text-muted italic">
                            No cost entries recorded matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredCosts.map((c) => (
                          <tr key={c.id} className="hover:bg-bg-elevated/20 transition-colors">
                            <td className="p-3 whitespace-nowrap">
                              {formatLocalDate(c.date)}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] font-ui border-border-default bg-bg-elevated text-text-primary capitalize whitespace-nowrap">
                                {c.category.replace('_', ' ')}
                              </Badge>
                              {c.ad_platform && (
                <span className="text-[9px] text-text-secondary block mt-0.5 uppercase tracking-wide">
                                  ({c.ad_platform.replace('_', ' ')})
                                </span>
                              )}
                            </td>
                            <td className="p-3 max-w-[200px] truncate text-text-secondary" title={c.description || undefined}>
                              {c.description}
                              {c.order_id && (
                                <span className="text-[9px] text-text-muted block mt-0.5 uppercase">
                                  Linked Order: #{c.order_id.substring(0, 8)}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-text-primary">
                              AED {Number(c.amount_aed).toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => deleteCost(c.id)}
                                className="text-text-muted hover:text-status-red p-1 rounded hover:bg-bg-elevated transition-colors"
                                title="Delete Cost Entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Add cost entry form */}
            <div className="lg:col-span-4">
              <Card className="bg-bg-surface border-border-default sticky top-6">
                <CardHeader className="border-b border-border-subtle pb-3">
                  <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary">
                    Record Expense
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-ui text-xs">
                    {/* Date */}
                    <div className="space-y-1">
                      <Label htmlFor="cost_date" className="text-text-secondary uppercase tracking-wider text-[10px]">Date *</Label>
                      <Input
                        id="cost_date"
                        type="date"
                        {...register('date')}
                        className="bg-bg-input border-border-default text-xs text-text-primary cursor-pointer font-body"
                      />
                      {errors.date?.message && (
                        <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.date.message)}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                      <Label htmlFor="cost_category" className="text-text-secondary uppercase tracking-wider text-[10px]">Cost Category *</Label>
                      <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-bg-input border-border-default text-xs">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                              {COST_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.category?.message && (
                        <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.category.message)}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <Label htmlFor="cost_amount" className="text-text-secondary uppercase tracking-wider text-[10px]">AED Amount *</Label>
                      <Input
                        id="cost_amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('amount_aed')}
                        className="bg-bg-input border-border-default text-xs font-body"
                      />
                      {errors.amount_aed?.message && (
                        <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.amount_aed.message)}</p>
                      )}
                    </div>

                    {/* Ad platform (only visible for ad spend category) */}
                    {selectedCategory === 'ad_spend' && (
                      <div className="space-y-1">
                        <Label htmlFor="cost_platform" className="text-text-secondary uppercase tracking-wider text-[10px]">Advertising Platform</Label>
                        <Controller
                          control={control}
                          name="ad_platform"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <SelectTrigger className="bg-bg-input border-border-default text-xs">
                                <SelectValue placeholder="Select Platform" />
                              </SelectTrigger>
                              <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                                {AD_PLATFORMS.map((ap) => (
                                  <SelectItem key={ap.value} value={ap.value}>{ap.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    {/* Optional Order reference ID */}
                    <div className="space-y-1">
                      <Label htmlFor="cost_order" className="text-text-secondary uppercase tracking-wider text-[10px]">Linked Order ID (Optional)</Label>
                      <Input
                        id="cost_order"
                        placeholder="UUID reference key..."
                        {...register('order_id')}
                        className="bg-bg-input border-border-default text-xs font-body"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label htmlFor="cost_description" className="text-text-secondary uppercase tracking-wider text-[10px]">Description / Note *</Label>
                      <Textarea
                        id="cost_description"
                        placeholder="Details of purchase or budget spent..."
                        rows={2}
                        {...register('description')}
                        className="bg-bg-input border-border-default text-xs"
                      />
                      {errors.description?.message && (
                        <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.description.message)}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-semibold"
                    >
                      {isSubmitting ? 'Recording...' : 'Record Expense Entry'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: P&L Summary */}
        <TabsContent value="pl_summary" className="pt-4">
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary">
                Profit & Loss Visual Comparison (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full text-xs font-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -10,
                      bottom: 0
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="monthLabel" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-default)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Revenue" fill="var(--status-green)" name="Revenue (AED)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="var(--status-orange)" name="Costs (AED)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit" fill="var(--accent-primary)" name="Net Profit (AED)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
