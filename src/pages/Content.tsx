import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { startOfWeek, addDays, format, parseISO } from 'date-fns'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus,
  Trash2,
  AlertTriangle,
  Megaphone,
  FilterX,
  Wand2,
  X
} from 'lucide-react'
import { useContentStore } from '@/stores/contentStore'
import { formatLocalDate, cn } from '@/lib/utils'
import type { PostPlatform, PostStatus } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'

// SVG Icons for platforms
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const PLATFORMS: { value: PostPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook_page', label: 'FB Page' },
  { value: 'facebook_marketplace', label: 'FB Marketplace' },
  { value: 'both', label: 'Instagram & FB' }
]

const STATUSES: { value: PostStatus; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'text-text-muted bg-bg-elevated border-border-subtle' },
  { value: 'drafted', label: 'Drafted', color: 'text-status-purple bg-status-purple/10 border-status-purple/20' },
  { value: 'posted', label: 'Posted', color: 'text-status-green bg-status-green/10 border-status-green/20' },
  { value: 'skipped', label: 'Skipped', color: 'text-status-red bg-status-red/10 border-status-red/20' }
]

const CONTENT_TYPES = [
  { value: 'carousel', label: 'Carousel (Multiple Images)' },
  { value: 'single_image', label: 'Single Image' },
  { value: 'reel', label: 'Reel (Short Video)' },
  { value: 'story', label: 'Story' },
  { value: 'listing', label: 'Marketplace Listing' }
]

const postSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  platform: z.enum(['instagram', 'facebook_page', 'facebook_marketplace', 'both']),
  content_type: z.enum(['carousel', 'single_image', 'reel', 'story', 'listing']).optional().nullable(),
  caption: z.string().optional().nullable().transform(val => val === '' ? null : val),
  image_notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  boosted: z.boolean().default(false),
  boost_budget_aed: z.coerce.number().optional().nullable().transform(val => val === 0 ? null : val),
  status: z.enum(['planned', 'drafted', 'posted', 'skipped']).default('planned'),
  performance_notes: z.string().optional().nullable().transform(val => val === '' ? null : val)
})

export default function Content() {
  const navigate = useNavigate()
  const { posts, loading, error, fetchPosts, addPost, updatePost, deletePost } = useContentStore()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      platform: 'instagram',
      content_type: 'carousel',
      caption: '',
      image_notes: '',
      boosted: false,
      boost_budget_aed: null,
      status: 'planned',
      performance_notes: ''
    }
  })

  const isBoosted = watch('boosted')

  const onSubmit = async (data: any) => {
    try {
      await addPost(data as any)
      reset({
        date: new Date().toISOString().split('T')[0],
        platform: 'instagram',
        content_type: 'carousel',
        caption: '',
        image_notes: '',
        boosted: false,
        boost_budget_aed: null,
        status: 'planned',
        performance_notes: ''
      })
      setIsSheetOpen(false)
    } catch (e) {
      // handled
    }
  }

  // Get current week days (Monday - Sunday)
  const getWeekDates = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
  }

  const weekDates = getWeekDates()

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    const matchesPlatform = platformFilter === 'all' || p.platform === platformFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesPlatform && matchesStatus
  })

  const handleStatusChange = async (postId: string, newStatus: string) => {
    await updatePost(postId, { status: newStatus as PostStatus })
  }

  const getPlatformIcon = (platform: PostPlatform) => {
    if (platform === 'instagram') return <InstagramIcon className="h-4 w-4 text-status-purple" />
    if (platform === 'facebook_page' || platform === 'facebook_marketplace') return <FacebookIcon className="h-4 w-4 text-status-blue" />
    return (
      <div className="flex -space-x-1">
        <InstagramIcon className="h-3.5 w-3.5 text-status-purple" />
        <FacebookIcon className="h-3.5 w-3.5 text-status-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-ui tracking-wide">Content & Post Log</h1>
          <p className="text-sm text-text-secondary font-body mt-1">
            Build content schedules, track Facebook boost metrics, and record planned captions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/content/agency">
            <Button variant="outline" className="border-border-default hover:bg-bg-elevated text-xs font-ui text-status-purple border-status-purple/35 hover:border-status-purple/60">
              <Wand2 className="h-4 w-4 mr-2" /> Launch AI Copywriter
            </Button>
          </Link>
          <Button
            onClick={() => {
              reset()
              setIsSheetOpen(true)
            }}
            className="bg-accent-primary hover:bg-accent-hover text-text-primary text-xs font-ui"
          >
            <Plus className="h-4 w-4 mr-2" /> Schedule Post
          </Button>
        </div>
      </div>

      {/* 1. Weekly Content Calendar Strip */}
      <div className="space-y-2">
        <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-text-secondary">
          Content Calendar (This Week)
        </span>
        <div className="grid grid-cols-7 gap-3">
          {weekDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const dayLabel = format(date, 'E')
            const dateNum = format(date, 'd')
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

            const dayPosts = posts.filter((p) => p.date === dateStr)

            return (
              <Card
                key={dateStr}
                className={cn(
                  "bg-bg-surface border-border-default hover:border-border-strong transition-all duration-150",
                  isToday && "border-accent-primary ring-1 ring-accent-primary/20 bg-accent-muted/5"
                )}
              >
                <div className="p-3 flex flex-col h-full min-h-[100px] justify-between">
                  {/* Day Date info */}
                  <div className="flex items-baseline justify-between border-b border-border-subtle pb-1">
                    <span className="text-[10px] font-ui uppercase font-semibold text-text-secondary">
                      {dayLabel}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-body font-semibold",
                        isToday ? "text-accent-primary bg-accent-muted/20 h-5 w-5 rounded-full flex items-center justify-center" : "text-text-primary"
                      )}
                    >
                      {dateNum}
                    </span>
                  </div>

                  {/* Scheduled Items summary */}
                  <div className="flex-1 pt-2 space-y-1.5 overflow-hidden">
                    {dayPosts.length === 0 ? (
                      <span className="text-[9px] text-text-muted italic block pt-1">Empty</span>
                    ) : (
                      dayPosts.map((dp) => (
                        <div
                          key={dp.id}
                          className="flex items-center gap-1.5 p-1 bg-bg-elevated border border-border-subtle rounded text-[9px] font-ui truncate cursor-pointer hover:border-border-strong"
                          onClick={() => navigate(`/content`)}
                          title={`${dp.platform} - ${dp.content_type || 'post'}`}
                        >
                          {getPlatformIcon(dp.platform)}
                          <span className="capitalize text-text-primary truncate max-w-[50px]">
                            {dp.content_type || 'post'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg-surface border border-border-default rounded-lg p-3">
        <div className="w-full sm:w-[180px]">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-bg-input border-border-default text-xs font-ui">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(platformFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setPlatformFilter('all')
              setStatusFilter('all')
            }}
            className="text-text-secondary hover:text-text-primary text-xs self-start sm:self-auto"
          >
            <FilterX className="h-4 w-4 mr-2" /> Reset Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-md p-3 text-status-red text-xs font-body flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Posts Log table */}
      <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-bg-surface text-text-secondary text-[10px] uppercase tracking-wider font-ui font-semibold">
                <th className="p-3">Schedule Date</th>
                <th className="p-3">Platform</th>
                <th className="p-3">Content Type</th>
                <th className="p-3">Boosted?</th>
                <th className="p-3">Caption Preview</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-body text-xs">
              {loading && filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">
                    Loading post log...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted italic">
                    No posts scheduled in the calendar log.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-elevated/20 transition-colors">
                    {/* Date */}
                    <td className="p-3 whitespace-nowrap">
                      {formatLocalDate(p.date)}
                    </td>

                    {/* Platform */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {getPlatformIcon(p.platform)}
                        <span className="capitalize font-ui font-medium">
                          {p.platform === 'both' ? 'Instagram & FB' : p.platform.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* Content type */}
                    <td className="p-3 capitalize">
                      {p.content_type ? p.content_type.replace('_', ' ') : 'Unspecified'}
                    </td>

                    {/* Boost details */}
                    <td className="p-3 font-semibold text-text-primary">
                      {p.boosted && p.boost_budget_aed ? (
                        <div className="flex items-center gap-1 text-status-orange">
                          <Megaphone className="h-3.5 w-3.5" />
                          <span>AED {Number(p.boost_budget_aed).toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted font-normal">-</span>
                      )}
                    </td>

                    {/* Caption Preview */}
                    <td className="p-3 max-w-[240px] truncate text-text-secondary" title={p.caption || ''}>
                      {p.caption ? (
                        p.caption
                      ) : (
                        <span className="text-text-muted italic">No caption generated</span>
                      )}
                      {p.image_notes && (
                        <span className="text-[9px] text-text-muted block mt-0.5 truncate">
                          Img Direction: {p.image_notes}
                        </span>
                      )}
                    </td>

                    {/* Status dropdown selector */}
                    <td className="p-3">
                      <div className="w-[120px]">
                        <Select value={p.status} onValueChange={(val) => handleStatusChange(p.id, val)}>
                          <SelectTrigger className="h-7 bg-bg-elevated border-border-default text-text-primary font-ui text-[10px] py-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-bg-elevated border-border-strong text-text-primary font-ui text-xs">
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deletePost(p.id)}
                        className="text-text-muted hover:text-status-red p-1 rounded hover:bg-bg-elevated transition-colors animate-all"
                        title="Delete Scheduled Post"
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

      {/* Add Post Slide-out Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-bg-surface border-l border-border-default text-text-primary overflow-y-auto w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-border-subtle">
            <SheetTitle className="font-ui text-lg text-text-primary flex items-center justify-between">
              <span>Schedule Social Post</span>
              <button
                onClick={() => setIsSheetOpen(false)}
                className="text-text-secondary hover:text-text-primary rounded-md p-1 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary font-body">
              Log manual drafts or scheduled assets in the content diary.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 font-ui text-xs">
            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="post_date" className="text-text-secondary uppercase tracking-wider text-[10px]">Publish Date *</Label>
              <Input
                id="post_date"
                type="date"
                {...register('date')}
                className="bg-bg-input border-border-default text-xs text-text-primary cursor-pointer font-body"
              />
              {errors.date?.message && (
                <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.date.message)}</p>
              )}
            </div>

            {/* Platform & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="post_platform" className="text-text-secondary uppercase tracking-wider text-[10px]">Target Platform *</Label>
                <Controller
                  control={control}
                  name="platform"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.platform?.message && (
                  <p className="text-status-red text-[11px] font-body mt-0.5">{String(errors.platform.message)}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="post_type" className="text-text-secondary uppercase tracking-wider text-[10px]">Content Type</Label>
                <Controller
                  control={control}
                  name="content_type"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger className="bg-bg-input border-border-default text-xs">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-elevated border-border-default text-text-primary font-ui text-xs">
                        <SelectItem value="none">Not Specified</SelectItem>
                        {CONTENT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Boost details */}
            <div className="p-3 bg-bg-elevated border border-border-default rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="post_boosted" className="text-text-secondary uppercase tracking-wider text-[10px]">
                  Boost / Advertise post?
                </Label>
                <Controller
                  control={control}
                  name="boosted"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              {isBoosted && (
                <div className="space-y-1 pt-2 border-t border-border-subtle">
                  <Label htmlFor="post_budget" className="text-text-secondary uppercase tracking-wider text-[10px]">
                    Boost Budget (AED)
                  </Label>
                  <Input
                    id="post_budget"
                    type="number"
                    placeholder="e.g. 50.00"
                    {...register('boost_budget_aed')}
                    className="bg-bg-input border-border-default text-xs font-body"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label htmlFor="post_status" className="text-text-secondary uppercase tracking-wider text-[10px]">Production Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="bg-bg-input border-border-default text-xs">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-elevated border-border-default text-text-primary">
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Image notes */}
            <div className="space-y-1">
              <Label htmlFor="post_img_notes" className="text-text-secondary uppercase tracking-wider text-[10px]">Image details / Visual guidance</Label>
              <Textarea
                id="post_img_notes"
                placeholder="Describe the photo template, plane model configuration, or graphic design pillars..."
                rows={2}
                {...register('image_notes')}
                className="bg-bg-input border-border-default text-xs"
              />
            </div>

            {/* Caption */}
            <div className="space-y-1">
              <Label htmlFor="post_caption" className="text-text-secondary uppercase tracking-wider text-[10px]">Post Caption & Hooks</Label>
              <Textarea
                id="post_caption"
                placeholder="Type the caption copy, hashtags, and CTA details..."
                rows={4}
                {...register('caption')}
                className="bg-bg-input border-border-default text-xs font-body"
              />
            </div>

            {/* Submit */}
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
                {isSubmitting ? 'Scheduling...' : 'Schedule Post'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
