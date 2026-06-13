import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Calendar,
  Phone,
  MessageCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
  AlertTriangle,
  Plane,
  Plus,
  Send,
  X
} from 'lucide-react'
import { useLeadsStore } from '@/stores/leadsStore'
import { useOrdersStore } from '@/stores/ordersStore'
import { leadSchema, orderSchema } from '@/lib/schemas'
import type { LeadNote } from '@/types'
import { formatGST, formatLocalDate, cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const STAGES = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'booking_paid', label: 'Booking Paid' },
  { value: 'in_production', label: 'In Production' },
  { value: 'ready_pending', label: 'Ready (Pending)' },
  { value: 'balance_paid', label: 'Balance Paid' },
  { value: 'shipping_paid', label: 'Shipping Paid' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cold', label: 'Cold (Ghosted)' },
  { value: 'lost', label: 'Lost' }
]

const SOURCES = [
  { value: 'facebook_marketplace', label: 'FB Marketplace' },
  { value: 'facebook_page', label: 'FB Page' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'other', label: 'Other' }
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-text-muted bg-bg-elevated border-border-subtle' },
  { value: 'normal', label: 'Normal', color: 'text-text-secondary bg-bg-surface border-border-default' },
  { value: 'high', label: 'High', color: 'text-status-orange bg-status-orange/10 border-status-orange/20 font-semibold' },
  { value: 'urgent', label: 'Urgent', color: 'text-status-red bg-status-red/10 border-status-red/20 font-semibold' }
]

const FOLLOW_UP_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'hot_gone_cold', label: 'Hot Gone Cold' },
  { value: 'price_ghost', label: 'Price Ghost' },
  { value: 'unread', label: 'Unread' },
  { value: 'post_delivery', label: 'Post Delivery' }
]

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    selectedLead,
    notes,
    loading,
    error,
    fetchLeadById,
    updateLead,
    deleteLead,
    fetchNotes,
    addNote
  } = useLeadsStore()

  const { addOrder } = useOrdersStore()

  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [noteType, setNoteType] = useState<LeadNote['type']>('general')
  const [noteText, setNoteText] = useState('')
  const [noteFilter, setNoteFilter] = useState<string>('all')

  // Follow-up quick inputs
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpType, setFollowUpType] = useState<string>('general')

  useEffect(() => {
    if (id) {
      fetchLeadById(id)
      fetchNotes(id)
    }
  }, [id, fetchLeadById, fetchNotes])

  // Set local state once lead loaded
  useEffect(() => {
    if (selectedLead) {
      setFollowUpDate(selectedLead.follow_up_date || '')
      setFollowUpType(selectedLead.follow_up_type || 'general')
    }
  }, [selectedLead])

  // React Hook Form for Edit
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(leadSchema),
  })

  // Open Edit Sheet pre-populated
  const handleOpenEdit = () => {
    if (selectedLead) {
      reset({
        name: selectedLead.name,
        phone: selectedLead.phone || '',
        source: selectedLead.source,
        source_ad: selectedLead.source_ad || '',
        source_detail: selectedLead.source_detail || '',
        plane_interest: selectedLead.plane_interest || '',
        frame_type: selectedLead.frame_type || null,
        notes: selectedLead.notes || '',
        funnel_stage: selectedLead.funnel_stage,
        priority: selectedLead.priority,
        follow_up_date: selectedLead.follow_up_date || null,
        follow_up_type: selectedLead.follow_up_type as any || null
      })
      setIsEditSheetOpen(true)
    }
  }

  const onEditSubmit = async (data: any) => {
    if (id) {
      try {
        await updateLead(id, data as any)
        setIsEditSheetOpen(false)
      } catch (e) {
        // Handled by store
      }
    }
  }

  // React Hook Form for Order Registration
  const {
    register: registerOrder,
    handleSubmit: handleOrderSubmit,
    setValue: setOrderValue,
    control: orderControl,
    reset: resetOrder,
    formState: { errors: orderErrors, isSubmitting: isOrderSubmitting }
  } = useForm<any>({
    resolver: zodResolver(orderSchema),
  })

  const handleOpenCreateOrder = () => {
    if (selectedLead) {
      resetOrder({
        lead_id: selectedLead.id,
        frame_type: selectedLead.frame_type || 'standard',
        airline: selectedLead.plane_interest || '',
        plane_model: '',
        plaque_color: 'Gold',
        price_aed: selectedLead.frame_type === 'custom' ? 300 : 249,
        custom_notes: selectedLead.notes || ''
      })
      setIsOrderSheetOpen(true)
    }
  }

  const onCreateOrderSubmit = async (data: any) => {
    if (id) {
      try {
        await addOrder(data as any, id)
        setIsOrderSheetOpen(false)
        await fetchLeadById(id)
        await fetchNotes(id)
      } catch (e) {
        // handled
      }
    }
  }

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteLead(id)
        setIsDeleteOpen(false)
        navigate('/leads')
      } catch (e) {
        // Handled by store
      }
    }
  }

  const handleSaveFollowUp = async () => {
    if (id) {
      try {
        const updates = {
          follow_up_date: followUpDate === '' ? null : followUpDate,
          follow_up_type: followUpDate === '' ? null : followUpType
        }
        await updateLead(id, updates as any)
        // Log a system note of follow-up scheduler change
        const noteMsg = followUpDate
          ? `Follow-up scheduled for ${formatLocalDate(followUpDate)} (${followUpType.replace('_', ' ')})`
          : 'Follow-up date cleared'
        await addNote(id, noteMsg, 'system')
      } catch (e) {
        // handled
      }
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !id) return
    try {
      await addNote(id, noteText, noteType)
      setNoteText('')
    } catch (err) {
      // handled
    }
  }

  if (loading && !selectedLead) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary font-body">Loading lead details...</p>
      </div>
    )
  }

  if (!selectedLead) {
    return (
      <div className="flex flex-col items-center justify-center border border-border-default rounded-lg py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-status-red mb-3" />
        <p className="text-sm text-text-secondary font-body font-semibold">Lead not found</p>
        <Link to="/leads" className="text-accent-primary hover:underline font-ui text-xs mt-3 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
        </Link>
      </div>
    )
  }

  // Sanitized phone for WhatsApp link
  const cleanPhone = selectedLead.phone ? selectedLead.phone.replace(/[^0-9]/g, '') : ''
  const whatsAppLink = cleanPhone ? `https://wa.me/${cleanPhone}` : ''

  // Overdue calculation
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const isOverdue = selectedLead.follow_up_date && selectedLead.follow_up_date < getTodayStr() && selectedLead.funnel_stage !== 'delivered'
  const isDueToday = selectedLead.follow_up_date && selectedLead.follow_up_date === getTodayStr() && selectedLead.funnel_stage !== 'delivered'

  // Filter notes
  const filteredNotes = notes.filter(n => noteFilter === 'all' || n.type === noteFilter)

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/leads"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-ui tracking-wide text-text-primary">
                {selectedLead.name}
              </h1>
              <Badge className={cn("text-[9px] font-ui uppercase font-medium", PRIORITIES.find(p => p.value === selectedLead.priority)?.color)}>
                {selectedLead.priority}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary font-body mt-0.5">
              Funnel Stage: <span className="text-text-primary capitalize">{selectedLead.funnel_stage.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          <Button
            variant="outline"
            onClick={handleOpenEdit}
            className="border-border-default hover:bg-bg-elevated text-text-secondary hover:text-text-primary text-xs font-ui"
          >
            <Edit className="h-4 w-4 mr-2" /> Edit Lead
          </Button>

          {/* Delete Dialog */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-border-default hover:border-status-red hover:bg-status-red/5 text-text-secondary hover:text-status-red text-xs font-ui"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-bg-surface border border-border-default text-text-primary">
              <DialogHeader>
                <DialogTitle className="font-ui text-text-primary">Delete Lead Profile</DialogTitle>
                <DialogDescription className="text-xs font-body text-text-secondary">
                  Are you sure you want to delete the profile for <strong className="text-text-primary">{selectedLead.name}</strong>? This action is permanent and will remove all call/chat notes timeline files.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="text-text-secondary text-xs">
                  Cancel
                </Button>
                <Button onClick={handleDelete} className="bg-status-red hover:bg-red-600 text-text-primary text-xs">
                  Yes, Delete Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Orders List & Create Order */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedLead.orders && selectedLead.orders.length > 0 ? (
              selectedLead.orders.map((order) => (
                <Link key={order.id} to={`/orders/${order.id}`}>
                  <Button className="bg-status-green hover:bg-green-600 text-text-primary text-[10px] font-ui h-8 px-2">
                    <ExternalLink className="h-3 w-3 mr-1" /> Order #{order.id.substring(0, 5)}
                  </Button>
                </Link>
              ))
            ) : selectedLead.has_order && selectedLead.order_id ? (
              // Fallback for before we fetched the array
              <Link to={`/orders/${selectedLead.order_id}`}>
                <Button className="bg-status-green hover:bg-green-600 text-text-primary text-[10px] font-ui h-8 px-2">
                  <ExternalLink className="h-3 w-3 mr-1" /> View Order
                </Button>
              </Link>
            ) : null}

            <Button
              onClick={handleOpenCreateOrder}
              className="bg-accent-primary hover:bg-accent-hover text-text-primary text-[10px] font-ui h-8 px-2"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Order
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Profile & Follow up details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Details Card */}
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary">
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Phone and Quick actions */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Phone Number</span>
                {selectedLead.phone ? (
                  <div className="flex items-center justify-between">
                    <span className="font-body text-text-primary text-sm font-semibold">{selectedLead.phone}</span>
                    <div className="flex items-center gap-1">
                      {whatsAppLink && (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 px-2 items-center gap-1 rounded bg-status-green/10 border border-status-green/20 hover:bg-status-green/20 text-status-green text-[10px] font-ui transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      )}
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="flex h-7 w-7 items-center justify-center rounded bg-status-blue/10 border border-status-blue/20 hover:bg-status-blue/20 text-status-blue transition-colors"
                        title="Call Customer"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="text-text-muted italic">No phone provided</span>
                )}
              </div>

              {/* Attribution */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Lead Source</span>
                  <span className="font-ui text-text-primary capitalize font-medium">
                    {selectedLead.source.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Ad Campaign</span>
                  <span className="font-body text-text-primary">
                    {selectedLead.source_ad || <span className="text-text-muted italic">None</span>}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Attribution Details</span>
                <span className="font-body text-text-primary">
                  {selectedLead.source_detail || <span className="text-text-muted italic">No detail notes</span>}
                </span>
              </div>

              {/* Product Interests */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                <div>
                  <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Product Variant</span>
                  <Badge variant="outline" className="text-[10px] font-ui border-border-default bg-bg-elevated mt-1 capitalize text-text-primary">
                    {selectedLead.frame_type ? `${selectedLead.frame_type} frame` : 'Unspecified'}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Aviation Interest</span>
                  <div className="flex items-center gap-1 font-body text-text-primary mt-1">
                    {selectedLead.plane_interest ? (
                      <>
                        <Plane className="h-3 w-3 text-text-secondary flex-shrink-0" />
                        <span className="truncate">{selectedLead.plane_interest}</span>
                      </>
                    ) : (
                      <span className="text-text-muted italic">No airliner interest</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Contact */}
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Last Reached</span>
                <span className="font-body text-text-primary">
                  {selectedLead.last_contacted_at ? (
                    formatGST(selectedLead.last_contacted_at, 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-text-muted italic">Never logged contact</span>
                  )}
                </span>
              </div>

              {/* Raw inquiry notes */}
              {selectedLead.notes && (
                <div className="pt-2 border-t border-border-subtle">
                  <span className="text-[10px] uppercase font-ui text-text-secondary tracking-wider block">Customer Brief</span>
                  <p className="font-body text-text-secondary mt-1 p-2 bg-bg-input rounded border border-border-subtle whitespace-pre-wrap leading-relaxed">
                    {selectedLead.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Scheduler Card */}
          <Card className="bg-bg-surface border-border-default">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary flex items-center justify-between">
                <span>Follow-up Action</span>
                {selectedLead.follow_up_date && selectedLead.funnel_stage !== 'delivered' && (
                  <Badge
                    className={cn(
                      "text-[9px] py-0 border",
                      isOverdue && "bg-status-red/10 text-status-red border-status-red/20",
                      isDueToday && "bg-status-yellow/10 text-status-yellow border-status-yellow/20",
                      !isOverdue && !isDueToday && "bg-bg-elevated text-text-secondary border-border-subtle"
                    )}
                  >
                    {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Scheduled'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-ui">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fu_date" className="text-text-secondary uppercase tracking-wider text-[10px]">Follow-up Date</Label>
                  <Input
                    id="fu_date"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="bg-bg-input border-border-default text-xs text-text-primary cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fu_type" className="text-text-secondary uppercase tracking-wider text-[10px]">Reason Category</Label>
                  <Select value={followUpType} onValueChange={setFollowUpType}>
                    <SelectTrigger className="bg-bg-input border-border-default text-xs">
                      <SelectValue placeholder="Reason type" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-elevated border-border-default text-text-primary font-ui text-xs">
                      {FOLLOW_UP_TYPES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSaveFollowUp}
                className="w-full bg-accent-muted hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 text-xs font-ui"
              >
                <Calendar className="h-4 w-4 mr-2" /> Save Follow-up Target
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Timeline & Notes logger */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-bg-surface border-border-default flex flex-col h-full">
            <CardHeader className="border-b border-border-subtle pb-3">
              <CardTitle className="text-xs uppercase font-ui tracking-wider text-text-secondary flex items-center justify-between">
                <span>Notes & Communication Logs</span>
                <div className="flex bg-bg-elevated border border-border-default rounded p-0.5 text-[10px]">
                  {['all', 'general', 'whatsapp', 'call', 'system'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setNoteFilter(filter)}
                      className={cn(
                        "px-2 py-0.5 rounded capitalize",
                        noteFilter === filter ? "bg-bg-surface text-accent-primary font-medium" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 space-y-6">
              {/* Add Note Logger form */}
              <form onSubmit={handleAddNote} className="space-y-3 p-3 bg-bg-elevated border border-border-default rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-ui tracking-wider text-text-secondary font-semibold">Log interaction or comments</span>
                  {/* Select type */}
                  <div className="flex items-center gap-1">
                    {(['general', 'whatsapp', 'call'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="ghost"
                        onClick={() => setNoteType(type)}
                        className={cn(
                          "h-6 px-2 text-[10px] rounded capitalize transition-all",
                          noteType === type
                            ? type === 'whatsapp'
                              ? "bg-status-green/10 text-status-green border border-status-green/20"
                              : type === 'call'
                                ? "bg-status-blue/10 text-status-blue border border-status-blue/20"
                                : "bg-text-secondary/10 text-text-primary border border-border-strong"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {type === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
                        {type === 'call' && <Phone className="h-3 w-3 mr-1" />}
                        {type === 'general' && <FileText className="h-3 w-3 mr-1" />}
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    placeholder={
                      noteType === 'whatsapp'
                        ? 'Type details of WhatsApp exchange...'
                        : noteType === 'call'
                          ? 'Summarize customer phone discussion...'
                          : 'Log personal comments or inquiries detail...'
                    }
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="bg-bg-input border-border-default text-xs w-full pr-10 resize-none font-body"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!noteText.trim()}
                    className="absolute right-2 bottom-2 h-7 w-7 bg-accent-primary hover:bg-accent-hover text-text-primary rounded-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>

              {/* Notes timeline display */}
              <div className="relative border-l border-border-subtle pl-4 ml-2.5 space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {filteredNotes.length === 0 ? (
                  <div className="py-8 text-center text-text-muted italic font-body text-xs">
                    No timeline notes matching this filter
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const isSystem = note.type === 'system'
                    const isWA = note.type === 'whatsapp'
                    const isCall = note.type === 'call'

                    return (
                      <div key={note.id} className="relative group text-xs">
                        {/* Timeline icon indicator */}
                        <div
                          className={cn(
                            "absolute -left-[27px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-bg-surface",
                            isSystem && "border-border-default text-text-secondary",
                            isWA && "border-status-green/30 text-status-green bg-status-green/5",
                            isCall && "border-status-blue/30 text-status-blue bg-status-blue/5",
                            note.type === 'general' && "border-border-strong text-text-primary"
                          )}
                        >
                          {isSystem && <Clock className="h-3 w-3" />}
                          {isWA && <MessageCircle className="h-3 w-3" />}
                          {isCall && <Phone className="h-3 w-3" />}
                          {note.type === 'general' && <FileText className="h-3 w-3" />}
                        </div>

                        {/* Note card container */}
                        <div className="bg-bg-surface/50 border border-border-subtle hover:border-border-default rounded p-3 transition-colors">
                          <div className="flex items-center justify-between text-[10px] text-text-secondary font-body mb-1">
                            <span className="font-semibold capitalize tracking-wide font-ui text-text-secondary">
                              {note.type} Note
                            </span>
                            <span>{formatGST(note.created_at, 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          <p className={cn(
                            "font-body leading-relaxed whitespace-pre-wrap",
                            isSystem ? "text-text-muted italic text-[11px]" : "text-text-primary"
                          )}>
                            {note.note}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Lead Slide-out Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="bg-bg-surface border-l border-border-default text-text-primary overflow-y-auto w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-border-subtle">
            <SheetTitle className="font-ui text-lg text-text-primary flex items-center justify-between">
              <span>Edit Lead Profile</span>
              <button
                onClick={() => setIsEditSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary rounded-md p-1 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary font-body">
              Make changes to customer profile parameters.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 py-4 font-ui text-xs">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="edit_name" className="text-text-secondary uppercase tracking-wider text-[10px]">Customer Name *</Label>
              <Input
                id="edit_name"
                {...register('name')}
                className="bg-bg-input border-border-default text-xs"
              />
              {errors.name?.message && (
                <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.name.message)}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="edit_phone" className="text-text-secondary uppercase tracking-wider text-[10px]">Phone Number</Label>
              <Input
                id="edit_phone"
                {...register('phone')}
                className="bg-bg-input border-border-default text-xs"
              />
            </div>

            {/* Source */}
            <div className="space-y-1">
              <Label htmlFor="edit_source" className="text-text-secondary uppercase tracking-wider text-[10px]">Lead Source *</Label>
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

            {/* Ad Campaign & Detail */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_source_ad" className="text-text-secondary uppercase tracking-wider text-[10px]">Ad / Campaign</Label>
                <Input
                  id="edit_source_ad"
                  {...register('source_ad')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_source_detail" className="text-text-secondary uppercase tracking-wider text-[10px]">Attribution Detail</Label>
                <Input
                  id="edit_source_detail"
                  {...register('source_detail')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
            </div>

            {/* Plane Interest & Frame Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_plane_interest" className="text-text-secondary uppercase tracking-wider text-[10px]">Plane Interest</Label>
                <Input
                  id="edit_plane_interest"
                  {...register('plane_interest')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_frame_type" className="text-text-secondary uppercase tracking-wider text-[10px]">Frame Variant</Label>
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
                        <SelectItem value="other">Other (Custom Price)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Funnel Stage & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_funnel_stage" className="text-text-secondary uppercase tracking-wider text-[10px]">Funnel Stage</Label>
                <Controller
                  control={control}
                  name="funnel_stage"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary font-ui text-xs">
                        {STAGES.map((ks) => (
                          <SelectItem key={ks.value} value={ks.value}>{ks.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_priority" className="text-text-secondary uppercase tracking-wider text-[10px]">Priority Level</Label>
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

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="edit_notes" className="text-text-secondary uppercase tracking-wider text-[10px]">Customer Brief</Label>
              <Textarea
                id="edit_notes"
                rows={3}
                {...register('notes')}
                className="bg-bg-input border-border-default text-xs font-body"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-semibold"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Order Slide-out Sheet */}
      <Sheet open={isOrderSheetOpen} onOpenChange={setIsOrderSheetOpen}>
        <SheetContent className="bg-bg-surface border-l border-border-default text-text-primary overflow-y-auto w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-border-subtle">
            <SheetTitle className="font-ui text-lg text-text-primary flex items-center justify-between">
              <span>Register Order for Lead</span>
              <button
                onClick={() => setIsOrderSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary rounded-md p-1 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary font-body">
              This initiates production checksheets and payment milestones.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleOrderSubmit(onCreateOrderSubmit)} className="space-y-4 py-4 font-ui text-xs">
            {/* Airline */}
            <div className="space-y-1">
              <Label htmlFor="order_airline" className="text-text-secondary uppercase tracking-wider text-[10px]">Airline *</Label>
              <Input
                id="order_airline"
                placeholder="Emirates, Etihad, Qatar, etc."
                {...registerOrder('airline')}
                className="bg-bg-input border-border-default text-xs"
              />
              {orderErrors.airline?.message && (
                <p className="text-status-red text-[11px] font-body mt-0.5">{String(orderErrors.airline.message)}</p>
              )}
            </div>

            {/* Model & Plaque Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="order_model" className="text-text-secondary uppercase tracking-wider text-[10px]">Plane Model</Label>
                <Input
                  id="order_model"
                  placeholder="e.g. B777 / A380"
                  {...registerOrder('plane_model')}
                  className="bg-bg-input border-border-default text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="order_plaque" className="text-text-secondary uppercase tracking-wider text-[10px]">Plaque Engraving Color</Label>
                <Controller
                  control={orderControl}
                  name="plaque_color"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'Gold'}>
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Plaque Color" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        <SelectItem value="Gold">Gold Engraving</SelectItem>
                        <SelectItem value="Silver">Silver Engraving</SelectItem>
                        <SelectItem value="Black">Black Engraving</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Frame Variant & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="order_frame" className="text-text-secondary uppercase tracking-wider text-[10px]">Frame Variant *</Label>
                <Controller
                  control={orderControl}
                  name="frame_type"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        // Auto price sets only if not 'other'
                        if (val !== 'other') {
                          setOrderValue('price_aed', val === 'custom' ? 300 : 249)
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Frame Variant" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        <SelectItem value="standard">Standard (249 AED)</SelectItem>
                        <SelectItem value="custom">Custom (300 AED)</SelectItem>
                        <SelectItem value="other">Other (Custom Price)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="order_price" className="text-text-secondary uppercase tracking-wider text-[10px]">Price (AED) *</Label>
                <Input
                  id="order_price"
                  type="number"
                  {...registerOrder('price_aed')}
                  className="bg-bg-input border-border-default text-xs font-semibold text-text-primary"
                />
                {orderErrors.price_aed?.message && (
                  <p className="text-status-red text-[11px] font-body mt-0.5">{String(orderErrors.price_aed.message)}</p>
                )}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1">
              <Label htmlFor="order_notes" className="text-text-secondary uppercase tracking-wider text-[10px]">Custom Engraving / Notes</Label>
              <Textarea
                id="order_notes"
                placeholder="Include custom flight details, plaque text, or frame extension comments..."
                rows={3}
                {...registerOrder('custom_notes')}
                className="bg-bg-input border-border-default text-xs font-body"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOrderSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isOrderSubmitting}
                className="bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-semibold"
              >
                {isOrderSubmitting ? 'Registering...' : 'Confirm Order'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
