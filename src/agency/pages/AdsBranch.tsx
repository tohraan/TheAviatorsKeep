import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAgencyStore } from '../store/agencyStore'
import { formatLocalDate } from '../../lib/utils'
import { Megaphone, ImagePlus, FileClock, ChevronRight } from 'lucide-react'

export default function AdsBranch() {
  const navigate = useNavigate()
  const { adsSessions, fetchAdsSessions, createAdsSession, startAdsSession } = useAgencyStore()
  
  const [sessionLabel, setSessionLabel] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [textContext, setTextContext] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAdsSessions()
  }, [fetchAdsSessions])

  const handleLaunch = async () => {
    if (!sessionLabel || !periodStart || !periodEnd) {
      alert('Please provide a session label and both start/end dates.')
      return
    }

    setIsSubmitting(true)

    const id = await createAdsSession({
      session_label: sessionLabel,
      period_start: periodStart,
      period_end: periodEnd,
      text_context: textContext,
      screenshot_urls: [] // Mocking screenshots for v1
    })

    if (id) {
      await startAdsSession(id)
      navigate(`/agency/ads/${id}`)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
            Ads Branch
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            Analyze ad performance, refine strategy, and generate high-converting copy.
          </p>
        </div>
      </div>

      {/* New Session Panel */}
      <Card className="bg-bg-surface border-border-default shadow-sm border-t-2 border-t-status-purple">
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-sm font-ui font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-status-purple" />
            New Ads Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-text-secondary uppercase tracking-wider">Session Label</Label>
              <Input
                placeholder="e.g. Q3 Retargeting Analysis"
                value={sessionLabel}
                onChange={e => setSessionLabel(e.target.value)}
                className="bg-bg-input border-border-default text-xs font-ui focus-visible:ring-status-purple"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-text-secondary uppercase tracking-wider">Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="bg-bg-input border-border-default text-xs font-ui focus-visible:ring-status-purple text-text-primary cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-text-secondary uppercase tracking-wider">Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="bg-bg-input border-border-default text-xs font-ui focus-visible:ring-status-purple text-text-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-[10px] text-text-secondary uppercase tracking-wider block border-b border-border-subtle pb-1">
              Data Input
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2 space-y-2 border border-border-default bg-bg-elevated rounded-md p-3">
                <div className="flex items-center gap-1.5 text-xs font-ui font-medium text-text-primary">
                  <FileClock className="h-3.5 w-3.5 text-status-purple" /> Type Context & Metrics
                </div>
                <Textarea
                  placeholder="Paste key metrics or context (e.g. Spent 500 AED, got 2 sales. Retargeting isn't converting like last month.)"
                  value={textContext}
                  onChange={e => setTextContext(e.target.value)}
                  className="bg-bg-input border-border-default text-xs min-h-[100px] resize-none focus-visible:ring-status-purple"
                />
              </div>

              <div className="space-y-4">
                <div className="border border-border-default bg-bg-elevated rounded-md p-3 h-full flex flex-col items-center justify-center cursor-pointer hover:bg-bg-surface transition-colors border-dashed min-h-[100px]">
                  <ImagePlus className="h-5 w-5 text-text-muted mb-1" />
                  <span className="text-[10px] font-ui text-text-secondary">Upload Ads Manager Screenshots</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleLaunch}
              disabled={isSubmitting}
              className="bg-status-purple hover:bg-status-purple/90 text-white font-ui font-semibold tracking-wide w-full md:w-auto"
            >
              {isSubmitting ? 'Launching...' : '🚀 LAUNCH ADS PIPELINE'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ads Sessions Log */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-ui font-bold text-text-secondary uppercase tracking-widest pl-1">
          Recent Sessions
        </h2>
        
        {adsSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border-default rounded-lg py-12 px-4 text-center bg-bg-surface">
            <Megaphone className="h-8 w-8 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary font-body font-semibold">No ads sessions.</p>
            <p className="text-xs text-text-muted font-body mt-1">Start one above.</p>
          </div>
        ) : (
          <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-default bg-bg-elevated text-text-secondary text-[10px] uppercase tracking-wider font-ui font-semibold">
                    <th className="p-3 pl-4">Date</th>
                    <th className="p-3">Session Label</th>
                    <th className="p-3">Period Start</th>
                    <th className="p-3">Period End</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body text-xs">
                  {adsSessions.map((session) => (
                    <tr 
                      key={session.id} 
                      className="hover:bg-bg-elevated/40 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/agency/ads/${session.id}`)}
                    >
                      <td className="p-3 pl-4 text-text-secondary">
                        {formatLocalDate(session.created_at?.split('T')[0] || '')}
                      </td>
                      <td className="p-3 font-medium text-text-primary">
                        {session.session_label || 'Unnamed Session'}
                      </td>
                      <td className="p-3 text-text-secondary">
                        {session.period_start ? formatLocalDate(session.period_start) : '-'}
                      </td>
                      <td className="p-3 text-text-secondary">
                        {session.period_end ? formatLocalDate(session.period_end) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui border ${
                          session.status === 'complete' ? 'bg-status-green/10 text-status-green border-status-green/20' :
                          session.status === 'running' ? 'bg-status-purple/10 text-status-purple border-status-purple/20 animate-pulse' :
                          session.status === 'failed' ? 'bg-status-red/10 text-status-red border-status-red/20' :
                          'bg-bg-elevated text-text-secondary border-border-subtle'
                        }`}>
                          {session.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <ChevronRight className="h-4 w-4 text-text-muted inline-block group-hover:text-status-purple transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
