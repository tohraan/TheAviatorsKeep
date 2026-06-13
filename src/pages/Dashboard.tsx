import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { addHours, format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import type { Lead, Order, OrderMaterial, Post } from '../types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  revenueThisMonth: number
  allTimeRevenue: number
  activeLeads: number
  inProductionOrders: number
  followUpsDue: number
}

interface MaterialAlert {
  orderId: string
  airline: string
  missing: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gstDate(utcString: string) {
  return addHours(new Date(utcString), 4)
}

function formatAED(amount: number) {
  return `AED ${amount.toFixed(2)}`
}

function priorityColor(priority: string) {
  const map: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F97316',
    normal: '#3B7FE8',
    low: '#4A5068',
  }
  return map[priority] ?? '#4A5068'
}

function stageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function followUpLabel(lead: Lead): { label: string; color: string } {
  if (!lead.follow_up_date) return { label: '', color: '' }
  const d = parseISO(lead.follow_up_date)
  if (isPast(d) && !isToday(d)) return { label: 'OVERDUE', color: '#EF4444' }
  if (isToday(d)) return { label: 'TODAY', color: '#EAB308' }
  if (isTomorrow(d)) return { label: 'TOMORROW', color: '#F97316' }
  return { label: format(d, 'dd MMM'), color: '#8B92A8' }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDates(): Date[] {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: '#A855F7',
  facebook_page: '#3B7FE8',
  facebook_marketplace: '#22C55E',
  both: '#EAB308',
}

const STATUS_COLOR: Record<string, string> = {
  planned: '#8B92A8',
  drafted: '#3B7FE8',
  posted: '#22C55E',
  skipped: '#EF4444',
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  subColor,
  accent,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
  accent?: string
}) {
  return (
    <div
      className="bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1"
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <p className="text-xs font-ui font-medium tracking-widest uppercase text-text-secondary">
        {label}
      </p>
      <p className="text-4xl font-headline text-text-primary leading-none tracking-wide">
        {value}
      </p>
      {sub && (
        <p className="text-xs font-body mt-1" style={{ color: subColor ?? '#8B92A8' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    revenueThisMonth: 0,
    activeLeads: 0,
    inProductionOrders: 0,
    followUpsDue: 0,
  })
  const [dueLeads, setDueLeads] = useState<Lead[]>([])
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<MaterialAlert[]>([])
  const [weekPosts, setWeekPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const weekDates = getWeekDates()
      const weekStart = weekDates[0].toISOString().split('T')[0]
      const weekEnd = weekDates[6].toISOString().split('T')[0]

      const [
        { data: leads },
        { data: orders },
        { data: materials },
        { data: posts },
      ] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*'),
        supabase
          .from('order_materials')
          .select('*, order:orders!order_id(id, airline, order_status)')
          .eq('in_stock', false),
        supabase
          .from('posts')
          .select('*')
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('date'),
      ])

      const allLeads: Lead[] = leads ?? []
      const allOrders: Order[] = orders ?? []
      const allMaterials = materials ?? []
      const allPosts: Post[] = posts ?? []

      // --- KPI: Revenue (booking = 50, balance = price - 50)
      const calculateRevenue = (orders: Order[]) => orders.reduce((sum, o) => {
        let r = 0
        if (o.booking_paid) r += 50
        if (o.balance_paid) r += (o.price_aed - 50)
        if (o.shipping_paid && o.shipping_fee_aed) r += o.shipping_fee_aed
        return sum + r
      }, 0)

      const monthOrders = allOrders.filter(
        o => o.created_at && o.created_at.split('T')[0] >= startOfMonth
      )
      const revenueThisMonth = calculateRevenue(monthOrders)
      const allTimeRevenue = calculateRevenue(allOrders)

      // --- KPI: Active leads (not lost/delivered)
      const activeLeads = allLeads.filter(
        l => !['delivered', 'lost'].includes(l.funnel_stage)
      ).length

      // --- KPI: In production orders
      const inProd = allOrders.filter(o => o.order_status === 'in_production').length

      // --- KPI: Follow-ups due today or overdue
      const due = allLeads.filter(l => {
        if (!l.follow_up_date) return false
        return l.follow_up_date <= today && !['delivered', 'lost'].includes(l.funnel_stage)
      })

      // --- Material alerts (group by order)
      const alertMap: Record<string, MaterialAlert> = {}
      allMaterials.forEach((m: OrderMaterial & { order: Order }) => {
        const oid = m.order_id
        if (!alertMap[oid]) {
          alertMap[oid] = {
            orderId: oid,
            airline: (m.order as Order)?.airline ?? 'Unknown',
            missing: [],
          }
        }
        alertMap[oid].missing.push(m.material.replace(/_/g, ' '))
      })

      setStats({
        revenueThisMonth,
        allTimeRevenue,
        activeLeads,
        inProductionOrders: inProd,
        followUpsDue: due.length,
      })
      setDueLeads(due.slice(0, 5))
      setRecentLeads(allLeads.slice(0, 6))
      setMaterialAlerts(Object.values(alertMap).slice(0, 5))
      setWeekPosts(allPosts)
      setLoading(false)
    }
    load()
  }, [])

  const weekDates = getWeekDates()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
            SkyFrame Command Center
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            {format(gstDate(new Date().toISOString()), 'EEEE, d MMMM yyyy')} · Dubai (GST)
          </p>
        </div>
        <Link
          to="/leads"
          className="px-4 py-2 rounded-lg text-sm font-ui font-medium text-white transition-colors"
          style={{ background: '#3B7FE8' }}
        >
          + New Lead
        </Link>
      </div>

      {/* Follow-up Alert Strip */}
      {dueLeads.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3 border"
          style={{ background: '#EAB30810', borderColor: '#EAB30840' }}
        >
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <span className="text-sm font-ui font-medium text-status-yellow">
              {dueLeads.length} follow-up{dueLeads.length !== 1 ? 's' : ''} due
            </span>
            <span className="text-xs font-body text-text-secondary ml-2">
              {dueLeads.map(l => l.name).join(', ')}
            </span>
          </div>
          <Link
            to="/leads"
            className="text-xs font-ui text-status-yellow hover:underline flex-shrink-0"
          >
            View All →
          </Link>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="This Month"
          value={formatAED(stats.revenueThisMonth)}
          sub="Revenue (Booking + Balance + Ship)"
          accent="#22C55E"
        />
        <KpiCard
          label="All Time"
          value={formatAED(stats.allTimeRevenue)}
          sub="Total Lifetime Revenue"
          accent="#3B7FE8"
        />
        <KpiCard
          label="Pipeline"
          value={stats.activeLeads.toString()}
          sub="Active Leads"
        />
        <KpiCard
          label="Production"
          value={stats.inProductionOrders.toString()}
          sub="Orders In Progress"
        />
        <KpiCard
          label="Action"
          value={stats.followUpsDue.toString()}
          sub="Follow-ups Due Today"
          subColor={stats.followUpsDue > 0 ? '#EF4444' : undefined}
        />
      </div>

      {/* Middle row: Recent Leads + Material Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Leads */}
        <div className="bg-bg-surface border border-border-default rounded-lg">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
            <p className="text-xs font-ui font-medium tracking-widest uppercase text-text-secondary">
              Recent Leads
            </p>
            <Link to="/leads" className="text-xs font-ui text-accent-primary hover:underline">
              View All →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">👥</span>
              <p className="text-sm font-ui text-text-muted">No leads yet.</p>
              <Link to="/leads" className="text-xs font-body text-accent-primary mt-2 hover:underline">
                + Add First Lead
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {recentLeads.map(lead => {
                const fu = followUpLabel(lead)
                return (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-elevated transition-colors group"
                  >
                    {/* Priority dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: priorityColor(lead.priority) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-ui font-medium text-text-primary group-hover:text-accent-primary transition-colors truncate">
                        {lead.name}
                      </p>
                      <p className="text-xs font-body text-text-secondary truncate">
                        {lead.plane_interest ?? '—'} · {stageLabel(lead.funnel_stage)}
                      </p>
                    </div>
                    {fu.label && (
                      <span
                        className="text-xs font-ui px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color: fu.color, background: `${fu.color}15` }}
                      >
                        {fu.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Material Alerts */}
        <div className="bg-bg-surface border border-border-default rounded-lg">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
            <p className="text-xs font-ui font-medium tracking-widest uppercase text-text-secondary">
              Material Alerts
            </p>
            <Link to="/orders" className="text-xs font-ui text-accent-primary hover:underline">
              View Orders →
            </Link>
          </div>
          {materialAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">✅</span>
              <p className="text-sm font-ui text-text-muted">No missing materials.</p>
              <p className="text-xs font-body text-text-secondary mt-1">All orders are fully stocked.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {materialAlerts.map(alert => (
                <Link
                  key={alert.orderId}
                  to={`/orders/${alert.orderId}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-bg-elevated transition-colors group"
                >
                  <span className="text-status-orange mt-0.5 flex-shrink-0">⚠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-ui font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                      {alert.airline}
                    </p>
                    <p className="text-xs font-body text-text-secondary truncate">
                      Missing: {alert.missing.join(', ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Calendar Strip */}
      <div className="bg-bg-surface border border-border-default rounded-lg">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <p className="text-xs font-ui font-medium tracking-widest uppercase text-text-secondary">
            Content Calendar — This Week
          </p>
          <Link to="/content" className="text-xs font-ui text-accent-primary hover:underline">
            Full Calendar →
          </Link>
        </div>
        <div className="grid grid-cols-7 divide-x divide-border-subtle">
          {weekDates.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0]
            const todayStr = new Date().toISOString().split('T')[0]
            const isCurrentDay = dateStr === todayStr
            const dayPosts = weekPosts.filter(p => p.date === dateStr)
            return (
              <div
                key={i}
                className="p-3 min-h-[96px]"
                style={isCurrentDay ? { background: '#1E3A6E30' } : undefined}
              >
                <div className="flex flex-col items-center mb-2">
                  <p
                    className="text-xs font-ui font-medium tracking-wide uppercase"
                    style={{ color: isCurrentDay ? '#3B7FE8' : '#8B92A8' }}
                  >
                    {DAYS[i]}
                  </p>
                  <p
                    className="text-sm font-headline leading-none mt-0.5"
                    style={{ color: isCurrentDay ? '#F1F3F7' : '#4A5068' }}
                  >
                    {format(date, 'd')}
                  </p>
                </div>
                <div className="space-y-1">
                  {dayPosts.length === 0 ? (
                    <div
                      className="h-1 rounded-full w-full"
                      style={{ background: '#1E2230' }}
                    />
                  ) : (
                    dayPosts.map(post => (
                      <div
                        key={post.id}
                        className="h-1.5 rounded-full w-full"
                        title={`${post.platform} · ${post.status}`}
                        style={{
                          background:
                            STATUS_COLOR[post.status] ?? PLATFORM_COLOR[post.platform] ?? '#8B92A8',
                        }}
                      />
                    ))
                  )}
                </div>
                {dayPosts.length > 0 && (
                  <p className="text-xs font-body text-text-muted mt-1 text-center">
                    {dayPosts.length}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 border-t border-border-subtle">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-body text-text-muted capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
