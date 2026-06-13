import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Search,
  Plus,
  Kanban as KanbanIcon,
  List as ListIcon,
  AlertTriangle,
  User,
  FilterX,
  Plane,
  X
} from 'lucide-react'
import { useLeadsStore } from '@/stores/leadsStore'
import { leadSchema } from '@/lib/schemas'
import type { FunnelStage, Priority, LeadSource } from '@/types'
import { formatLocalDate, cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const KANBAN_STAGES: { stage: FunnelStage; label: string; color: string }[] = [
  { stage: 'inquiry', label: 'Inquiry', color: 'bg-text-secondary' },
  { stage: 'contacted', label: 'Contacted', color: 'bg-status-blue' },
  { stage: 'interested', label: 'Interested', color: 'bg-status-purple' },
  { stage: 'booking_paid', label: 'Booking Paid', color: 'bg-status-green' },
  { stage: 'in_production', label: 'In Production', color: 'bg-status-orange' },
  { stage: 'ready_pending', label: 'Ready (Pending)', color: 'bg-accent-primary' },
  { stage: 'delivered', label: 'Delivered', color: 'bg-green-700' }
]

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'facebook_marketplace', label: 'FB Marketplace' },
  { value: 'facebook_page', label: 'FB Page' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'other', label: 'Other' }
]

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-text-muted bg-bg-elevated border-border-subtle' },
  { value: 'normal', label: 'Normal', color: 'text-text-secondary bg-bg-surface border-border-default' },
  { value: 'high', label: 'High', color: 'text-status-orange bg-status-orange/10 border-status-orange/20' },
  { value: 'urgent', label: 'Urgent', color: 'text-status-red bg-status-red/10 border-status-red/20' }
]

const FOLLOW_UP_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'hot_gone_cold', label: 'Hot Gone Cold' },
  { value: 'price_ghost', label: 'Price Ghost' },
  { value: 'unread', label: 'Unread' },
  { value: 'post_delivery', label: 'Post Delivery' }
]

export default function Leads() {
  const navigate = useNavigate()
  const { leads, loading, error, fetchLeads, addLead, updateLeadStage } = useLeadsStore()

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [draggedOverStage, setDraggedOverStage] = useState<FunnelStage | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      phone: '',
      source: 'instagram',
      source_ad: '',
      source_detail: '',
      plane_interest: '',
      frame_type: null,
      notes: '',
      funnel_stage: 'inquiry',
      priority: 'normal',
      follow_up_date: null,
      follow_up_type: null
    }
  })

  const onSubmit = async (data: any) => {
    try {
      await addLead(data as any)
      reset()
      setIsSheetOpen(false)
    } catch (e) {
      // handled by store error
    }
  }

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId)
  };

  const handleDragOver = (e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault()
    setDraggedOverStage(stage)
  }

  const handleDrop = async (e: React.DragEvent, targetStage: FunnelStage) => {
    e.preventDefault()
    setDraggedOverStage(null)
    const leadId = e.dataTransfer.getData('text/plain')
    if (leadId) {
      await updateLeadStage(leadId, targetStage)
    }
  }

  // Helper date comparisons
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false
    return dateStr < getTodayStr()
  }
  const isDueToday = (dateStr?: string | null) => {
    if (!dateStr) return false
    return dateStr === getTodayStr()
  }

  // Filter leads
  const filteredLeads = (leads || []).filter((lead) => {
    if (!lead) return false
    const name = lead.name || ''
    const planeInterest = lead.plane_interest || ''
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      planeInterest.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter

    return matchesSearch && matchesSource && matchesPriority
  })

  // Clear filters
  const resetFilters = () => {
    setSearchQuery('')
    setSourceFilter('all')
    setPriorityFilter('all')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-ui tracking-wide">Leads CRM</h1>
          <p className="text-sm text-text-secondary font-body mt-1">
            Manage inquiries, follow-ups, and sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-bg-surface border border-border-default rounded-md p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-1.5 rounded-sm transition-colors",
                viewMode === 'kanban' ? "bg-bg-elevated text-accent-primary" : "text-text-secondary hover:text-text-primary"
              )}
              title="Kanban Board"
            >
              <KanbanIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-sm transition-colors",
                viewMode === 'list' ? "bg-bg-elevated text-accent-primary" : "text-text-secondary hover:text-text-primary"
              )}
              title="List View"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={() => {
              reset()
              setIsSheetOpen(true)
            }}
            className="bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-ui"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-bg-surface border border-border-default rounded-lg p-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search leads by name or plane interest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-bg-input border-border-default text-xs font-ui"
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[150px]">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || sourceFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="text-text-secondary hover:text-text-primary text-xs self-start lg:self-auto"
          >
            <FilterX className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Main View Area */}
      {loading && filteredLeads.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-text-secondary font-body">Loading leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border-default rounded-lg py-16 px-4 text-center">
          <User className="h-10 w-10 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary font-body font-semibold">No leads found</p>
          <p className="text-xs text-text-muted font-body mt-1 max-w-sm">
            Try adjusting your search query, clearing filters, or create a new lead to start tracking.
          </p>
          <Button
            onClick={() => setIsSheetOpen(true)}
            variant="outline"
            className="border-border-default hover:bg-bg-elevated text-xs font-ui mt-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Create First Lead
          </Button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1400px]">
            {KANBAN_STAGES.map(({ stage, label, color }) => {
              const stageLeads = filteredLeads.filter((l) => l.funnel_stage === stage)
              const isOver = draggedOverStage === stage

              return (
                <div
                  key={stage}
                  className={cn(
                    "flex flex-col w-[260px] rounded-lg bg-bg-surface border transition-colors duration-150 flex-shrink-0 min-h-[500px]",
                    isOver ? "border-accent-primary bg-accent-muted/10" : "border-border-default"
                  )}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDrop={(e) => handleDrop(e, stage)}
                  onDragLeave={() => setDraggedOverStage(null)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-bg-surface rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", color)} />
                      <span className="font-ui text-xs font-semibold uppercase tracking-wider text-text-primary">
                        {label}
                      </span>
                    </div>
                    <span className="bg-bg-elevated text-text-secondary font-body text-[10px] px-2 py-0.5 rounded-full border border-border-subtle">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                    {stageLeads.map((lead) => {
                      const overdue = isOverdue(lead.follow_up_date) && lead.funnel_stage !== 'delivered'
                      const today = isDueToday(lead.follow_up_date) && lead.funnel_stage !== 'delivered'

                      return (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className={cn(
                            "cursor-grab active:cursor-grabbing hover:border-border-strong bg-bg-elevated border-border-default transition-all shadow-sm duration-150",
                            overdue && "border-l-[3px] border-l-status-red"
                          )}
                        >
                          <CardContent className="p-3 space-y-2.5">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-ui text-xs font-semibold text-text-primary hover:text-accent-primary transition-colors truncate">
                                {lead.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 border font-ui uppercase font-medium",
                                  PRIORITIES.find(p => p.value === lead.priority)?.color
                                )}
                              >
                                {lead.priority}
                              </Badge>
                            </div>

                            {/* Details */}
                            <div className="space-y-1">
                              {lead.plane_interest && (
                                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-body">
                                  <Plane className="h-3 w-3 flex-shrink-0 text-text-muted" />
                                  <span className="truncate">{lead.plane_interest}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-body">
                                <span className="text-[10px] uppercase font-ui tracking-wider text-text-muted">Source:</span>
                                <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                              </div>
                            </div>

                            {/* Footer / Follow-up */}
                            {lead.follow_up_date && lead.funnel_stage !== 'delivered' && (
                              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                                <span className="text-[9px] font-ui text-text-muted uppercase">Follow-up:</span>
                                <Badge
                                  className={cn(
                                    "text-[9px] py-0 px-1.5 font-body border",
                                    overdue && "bg-status-red/10 text-status-red border-status-red/20",
                                    today && "bg-status-yellow/10 text-status-yellow border-status-yellow/20",
                                    !overdue && !today && "bg-bg-surface text-text-secondary border-border-subtle"
                                  )}
                                >
                                  {formatLocalDate(lead.follow_up_date, 'dd/MM')}
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-bg-surface text-text-secondary text-[10px] uppercase tracking-wider font-ui font-semibold">
                  <th className="p-4">Name</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Interest</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body text-xs">
                {filteredLeads.map((lead) => {
                  const overdue = isOverdue(lead.follow_up_date) && lead.funnel_stage !== 'delivered'
                  const today = isDueToday(lead.follow_up_date) && lead.funnel_stage !== 'delivered'

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className={cn(
                        "hover:bg-bg-elevated/40 cursor-pointer transition-colors",
                        overdue && "bg-status-red/[0.02]"
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {overdue && (
                            <span className="h-1.5 w-1.5 rounded-full bg-status-red animate-pulse" title="Overdue follow-up" />
                          )}
                          <span className="font-ui font-medium text-text-primary">{lead.name}</span>
                        </div>
                        {lead.phone && (
                          <span className="text-[10px] text-text-muted mt-0.5 block">{lead.phone}</span>
                        )}
                      </td>
                      <td className="p-4 capitalize">{lead.source.replace('_', ' ')}</td>
                      <td className="p-4">
                        {lead.plane_interest || '-'}
                        {lead.frame_type && (
                          <span className="text-[10px] text-text-muted capitalize block mt-0.5">{lead.frame_type} Frame</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-[10px] bg-bg-elevated border-border-default font-ui capitalize text-text-primary">
                          {lead.funnel_stage.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] uppercase px-2 font-ui",
                            PRIORITIES.find(p => p.value === lead.priority)?.color
                          )}
                        >
                          {lead.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {lead.follow_up_date ? (
                          <Badge
                            className={cn(
                              "text-[10px] font-body font-normal border",
                              overdue && "bg-status-red/10 text-status-red border-status-red/20",
                              today && "bg-status-yellow/10 text-status-yellow border-status-yellow/20",
                              !overdue && !today && "bg-bg-elevated text-text-secondary border-border-subtle"
                            )}
                          >
                            {formatLocalDate(lead.follow_up_date, 'dd/MM/yyyy')} {lead.follow_up_type ? `(${lead.follow_up_type.replace('_', ' ')})` : ''}
                          </Badge>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Slide-out Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-bg-surface border-l border-border-default text-text-primary overflow-y-auto w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-border-subtle">
            <SheetTitle className="font-ui text-lg text-text-primary flex items-center justify-between">
              <span>Create New Lead</span>
              <button
                onClick={() => setIsSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary rounded-md p-1 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary font-body">
              Fill in all fields to add this customer inquiry.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 font-ui text-xs">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-text-secondary uppercase tracking-wider text-[10px]">Customer Name *</Label>
              <Input
                id="name"
                placeholder="Ahmed Al Mansouri"
                {...register('name')}
                className="bg-bg-input border-border-default text-xs"
              />
              {errors.name?.message && (
                <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.name.message)}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-text-secondary uppercase tracking-wider text-[10px]">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+971 50 XXXXXXX"
                {...register('phone')}
                className="bg-bg-input border-border-default text-xs"
              />
            </div>

            {/* Source */}
            <div className="space-y-1">
              <Label htmlFor="source" className="text-text-secondary uppercase tracking-wider text-[10px]">Lead Source *</Label>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="bg-bg-input border-border-default text-xs">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.source?.message && (
                <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.source.message)}</p>
              )}
            </div>

            {/* Specific Ad & Detail */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="source_ad" className="text-text-secondary uppercase tracking-wider text-[10px]">Ad / Campaign</Label>
                <Input
                  id="source_ad"
                  placeholder="e.g. ad_carousel_1"
                  {...register('source_ad')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="source_detail" className="text-text-secondary uppercase tracking-wider text-[10px]">Attribution Detail</Label>
                <Input
                  id="source_detail"
                  placeholder="e.g. organic search"
                  {...register('source_detail')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
            </div>

            {/* Plane Interest & Frame Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="plane_interest" className="text-text-secondary uppercase tracking-wider text-[10px]">Plane/Airliner Interest</Label>
                <Input
                  id="plane_interest"
                  placeholder="Emirates B777"
                  {...register('plane_interest')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="frame_type" className="text-text-secondary uppercase tracking-wider text-[10px]">Frame Variant</Label>
                <Controller
                  control={control}
                  name="frame_type"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Frame" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        <SelectItem value="none">Not Sure Yet</SelectItem>
                        <SelectItem value="standard">Standard (249 AED)</SelectItem>
                        <SelectItem value="custom">Custom (300 AED)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Stage & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="funnel_stage" className="text-text-secondary uppercase tracking-wider text-[10px]">Funnel Stage</Label>
                <Controller
                  control={control}
                  name="funnel_stage"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        {KANBAN_STAGES.map((ks) => (
                          <SelectItem key={ks.stage} value={ks.stage}>{ks.label}</SelectItem>
                        ))}
                        <SelectItem value="cold">Cold (Ghosted)</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="priority" className="text-text-secondary uppercase tracking-wider text-[10px]">Priority Level</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Follow Up Date & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="follow_up_date" className="text-text-secondary uppercase tracking-wider text-[10px]">Follow-up Date</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  {...register('follow_up_date')}
                  className="bg-bg-input border-border-default text-xs text-text-primary cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="follow_up_type" className="text-text-secondary uppercase tracking-wider text-[10px]">Follow-up Type</Label>
                <Controller
                  control={control}
                  name="follow_up_type"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        <SelectItem value="none">None</SelectItem>
                        {FOLLOW_UP_TYPES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-text-secondary uppercase tracking-wider text-[10px]">Inquiry Notes</Label>
              <Textarea
                id="notes"
                placeholder="Initial comments or custom requests..."
                rows={3}
                {...register('notes')}
                className="bg-bg-input border-border-default text-xs"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-semibold"
              >
                {isSubmitting ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
