import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/card'
import { useAgencyStore } from '../store/agencyStore'
import { seedSOPsIfEmpty } from '../lib/seedSOPs'
import { Rocket, Megaphone, Settings, Users, ArrowRight, BrainCircuit } from 'lucide-react'
import { formatLocalDate } from '../../lib/utils'

export default function AgencyDashboard() {
  const navigate = useNavigate()
  const { contentSessions, adsSessions, fetchContentSessions, fetchAdsSessions } = useAgencyStore()
  const [seeding, setSeeding] = useState(true)

  useEffect(() => {
    const init = async () => {
      await seedSOPsIfEmpty()
      setSeeding(false)
      fetchContentSessions()
      fetchAdsSessions()
    }
    init()
  }, [fetchContentSessions, fetchAdsSessions])

  if (seeding) return <div className="p-8 text-center text-text-secondary font-body text-xs">Initializing Agency Knowledge...</div>

  const activeContent = contentSessions.filter(s => s.status === 'running')
  const activeAds = adsSessions.filter(s => s.status === 'running')

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-status-purple" />
            Media Agency Dashboard
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            Your 8-agent AI team for content strategy, creation, and performance marketing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Content Branch Card */}
        <Card className="bg-bg-surface border-border-default hover:border-status-purple/50 transition-colors cursor-pointer" onClick={() => navigate('/agency/content')}>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-status-purple/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-status-purple" />
              </div>
              {activeContent.length > 0 && (
                <span className="flex h-2.5 w-2.5 relative mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-purple opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-purple"></span>
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-ui font-bold text-text-primary tracking-wide">Content Branch</h2>
              <p className="text-xs font-body text-text-secondary mt-1">5 Agents (CMO, CM, Reel, Carousel, FB). Generate weekly strategy and social copy.</p>
            </div>
            <div className="flex items-center text-status-purple text-xs font-ui font-semibold uppercase tracking-wider pt-2 border-t border-border-subtle">
              Launch Pipeline <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Ads Branch Card */}
        <Card className="bg-bg-surface border-border-default hover:border-status-purple/50 transition-colors cursor-pointer" onClick={() => navigate('/agency/ads')}>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-status-purple/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-status-purple" />
              </div>
              {activeAds.length > 0 && (
                <span className="flex h-2.5 w-2.5 relative mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-purple opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-purple"></span>
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-ui font-bold text-text-primary tracking-wide">Ads Branch</h2>
              <p className="text-xs font-body text-text-secondary mt-1">3 Agents (Analyst, Media Mgr, Copywriter). Analyze metrics and generate variants.</p>
            </div>
            <div className="flex items-center text-status-purple text-xs font-ui font-semibold uppercase tracking-wider pt-2 border-t border-border-subtle">
              Launch Pipeline <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* SOP Manager Card */}
        <Card className="bg-bg-surface border-border-default hover:border-status-purple/50 transition-colors cursor-pointer" onClick={() => navigate('/agency/sops')}>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-status-purple/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-status-purple" />
              </div>
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-6 w-6 rounded-full bg-bg-elevated border-2 border-bg-surface flex items-center justify-center text-[8px] font-ui font-bold text-text-secondary">
                    <Users className="h-3 w-3" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-base font-ui font-bold text-text-primary tracking-wide">SOP Manager</h2>
              <p className="text-xs font-body text-text-secondary mt-1">Manage the instructions, tone, and strict rules for all 8 AI agents in the system.</p>
            </div>
            <div className="flex items-center text-text-muted text-xs font-ui font-semibold uppercase tracking-wider pt-2 border-t border-border-subtle group-hover:text-text-primary">
              Manage Agents <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="space-y-3">
          <h2 className="text-sm font-ui font-bold text-text-secondary uppercase tracking-widest pl-1 border-b border-border-subtle pb-2">
            Recent Content Sessions
          </h2>
          {contentSessions.slice(0, 3).map(s => (
            <div key={s.id} className="bg-bg-surface border border-border-default p-3 rounded-md flex justify-between items-center cursor-pointer hover:bg-bg-elevated transition-colors" onClick={() => navigate(`/agency/content/${s.id}`)}>
              <div>
                <div className="text-xs font-ui font-medium text-text-primary">{s.session_label || 'Unnamed Session'}</div>
                <div className="text-[10px] font-body text-text-secondary">{formatLocalDate(s.created_at.split('T')[0])}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui border ${s.status === 'complete' ? 'bg-status-green/10 text-status-green border-status-green/20' : s.status === 'running' ? 'bg-status-purple/10 text-status-purple border-status-purple/20 animate-pulse' : 'bg-status-red/10 text-status-red border-status-red/20'}`}>
                {s.status.toUpperCase()}
              </span>
            </div>
          ))}
          {contentSessions.length === 0 && <div className="text-xs font-body text-text-muted italic pl-1">No sessions yet.</div>}
        </div>
        
        <div className="space-y-3">
          <h2 className="text-sm font-ui font-bold text-text-secondary uppercase tracking-widest pl-1 border-b border-border-subtle pb-2">
            Recent Ads Sessions
          </h2>
          {adsSessions.slice(0, 3).map(s => (
            <div key={s.id} className="bg-bg-surface border border-border-default p-3 rounded-md flex justify-between items-center cursor-pointer hover:bg-bg-elevated transition-colors" onClick={() => navigate(`/agency/ads/${s.id}`)}>
              <div>
                <div className="text-xs font-ui font-medium text-text-primary">{s.session_label || 'Unnamed Ads Session'}</div>
                <div className="text-[10px] font-body text-text-secondary">{formatLocalDate(s.created_at.split('T')[0])}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui border ${s.status === 'complete' ? 'bg-status-green/10 text-status-green border-status-green/20' : s.status === 'running' ? 'bg-status-purple/10 text-status-purple border-status-purple/20 animate-pulse' : 'bg-status-red/10 text-status-red border-status-red/20'}`}>
                {s.status.toUpperCase()}
              </span>
            </div>
          ))}
          {adsSessions.length === 0 && <div className="text-xs font-body text-text-muted italic pl-1">No sessions yet.</div>}
        </div>
      </div>
    </div>
  )
}
