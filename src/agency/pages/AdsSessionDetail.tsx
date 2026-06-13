import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { AdsSession } from '../types/agency.types'
import { OutputCard } from '../components/OutputCard'
import { Card, CardContent } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { ArrowLeft, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { formatLocalDate } from '../../lib/utils'

export default function AdsSessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<AdsSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchSession = async () => {
      const { data } = await supabase
        .from('agency_ads_sessions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) setSession(data as AdsSession)
      setLoading(false)
    }

    fetchSession()

    // Poll if running
    const interval = setInterval(() => {
      if (session?.status === 'running') {
        fetchSession()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [id, session?.status])

  if (loading) return <div className="p-8 text-center text-text-secondary font-body text-xs">Loading session...</div>
  if (!session) return <div className="p-8 text-center text-status-red font-body text-xs">Session not found.</div>

  const isRunning = session.status === 'running'
  
  // Pipeline state derived from outputs
  const agents = [
    { name: 'Ad Analyst', status: session.ad_analyst_output ? 'complete' : isRunning ? 'running' : 'pending' },
    { name: 'Paid Media Manager', status: session.paid_media_manager_output ? 'complete' : session.ad_analyst_output && isRunning ? 'running' : 'pending' },
    { name: 'Ad Copywriter', status: session.ad_copywriter_output ? 'complete' : session.paid_media_manager_output && isRunning ? 'running' : 'pending' },
  ]

  const getStatusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-status-green" />
    if (status === 'running') return <Loader2 className="h-4 w-4 text-status-purple animate-spin" />
    if (status === 'failed') return <XCircle className="h-4 w-4 text-status-red" />
    return <Circle className="h-4 w-4 text-border-default" />
  }

  const parseAnalyst = () => {
    try { return session.ad_analyst_output as any } catch { return null }
  }
  const parseManager = () => {
    try { return session.paid_media_manager_output as any } catch { return null }
  }
  const parseCopy = () => {
    try {
      const out = session.ad_copywriter_output as any
      if (!out) return []
      if (Array.isArray(out)) return out
      if (out.variations && Array.isArray(out.variations)) return out.variations
      if (out.copies && Array.isArray(out.copies)) return out.copies
      return [out]
    } catch {
      return []
    }
  }

  const analyst = parseAnalyst()
  const manager = parseManager()
  const copyVariations = parseCopy()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agency/ads')} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-ui font-semibold text-text-primary flex items-center gap-2">
            {session.session_label || 'Unnamed Ads Session'}
            {isRunning && <span className="flex h-2.5 w-2.5 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-purple opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-purple"></span></span>}
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            {session.period_start ? formatLocalDate(session.period_start) : '-'} to {session.period_end ? formatLocalDate(session.period_end) : '-'}
          </p>
        </div>
      </div>

      {isRunning || session.status === 'failed' ? (
        <Card className="bg-bg-surface border-border-default">
          <CardContent className="p-6">
            <h3 className="text-sm font-ui font-bold text-text-primary uppercase tracking-widest mb-6">Agent Pipeline Progress</h3>
            <div className="space-y-4">
              {agents.map((agent, i) => (
                <div key={i} className="flex items-center gap-3">
                  {getStatusIcon(agent.status)}
                  <span className={`text-sm font-body ${agent.status === 'complete' ? 'text-text-primary' : agent.status === 'running' ? 'text-status-purple font-medium' : 'text-text-muted'}`}>
                    {agent.name}
                  </span>
                  {agent.status === 'running' && <span className="text-xs text-status-purple italic">Analyzing data...</span>}
                </div>
              ))}
            </div>
            {session.status === 'failed' && (
              <div className="mt-6 p-3 bg-status-red/10 border border-status-red/20 rounded text-status-red text-xs font-body flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Pipeline execution failed. See logs for details.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="analyst" className="w-full">
          <TabsList className="bg-bg-surface border border-border-default h-12 w-full justify-start px-2 gap-2">
            <TabsTrigger value="analyst" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">Analyst Report</TabsTrigger>
            <TabsTrigger value="manager" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">Media Strategy</TabsTrigger>
            <TabsTrigger value="copy" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">Ad Copy ({copyVariations.length})</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="analyst" className="space-y-4 m-0">
              {analyst ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Platform</div>
                        <div className="text-sm font-body text-text-primary font-medium">{analyst.platform}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Period Analyzed</div>
                        <div className="text-sm font-body text-text-primary">{analyst.period}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-status-green tracking-widest mb-1">Top Performing</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(analyst.top_performing) ? analyst.top_performing.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{analyst.top_performing}</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-status-red tracking-widest mb-1">Underperforming</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(analyst.underperforming) ? analyst.underperforming.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{analyst.underperforming}</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-status-orange tracking-widest mb-1">Audience Signals</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(analyst.audience_signals) ? analyst.audience_signals.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{analyst.audience_signals}</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-text-muted text-xs font-body">No Analyst output found.</div>
              )}
            </TabsContent>

            <TabsContent value="manager" className="space-y-4 m-0">
              {manager ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Priority Actions</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(manager.priority_actions) ? manager.priority_actions.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{manager.priority_actions}</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Content Pillars to Target</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(manager.content_pillars) ? manager.content_pillars.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{manager.content_pillars}</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Boost Recommendation</div>
                        <div className="text-sm font-body text-text-primary">
                          <span className={manager.boost_recommendation?.should_boost ? "text-status-green font-bold" : "text-status-red font-bold"}>
                            {manager.boost_recommendation?.should_boost ? "YES" : "NO"}
                          </span>
                          <p className="mt-1 text-xs">{manager.boost_recommendation?.which_content}</p>
                          {manager.boost_recommendation?.budget_aed && <p className="mt-1 font-bold text-status-purple">Budget: {manager.boost_recommendation.budget_aed} AED</p>}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-status-red tracking-widest mb-1">Avoid Doing</div>
                        <ul className="text-sm font-body text-text-primary list-disc pl-4 space-y-1">
                          {Array.isArray(manager.avoid) ? manager.avoid.map((t: string, i: number) => <li key={i}>{t}</li>) : <li>{manager.avoid}</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-text-muted text-xs font-body">No Media Manager output found.</div>
              )}
            </TabsContent>

            <TabsContent value="copy" className="space-y-6 m-0">
              {copyVariations.length > 0 ? copyVariations.map((c: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="text-xs font-ui font-bold text-text-secondary uppercase tracking-widest">Variation {c.version_number || i + 1} - {c.placement || 'Feed'}</h3>
                  <OutputCard 
                    hook={c.hook} 
                    body={c.body} 
                    cta={c.cta} 
                    imageDirection={c.rationale || c.target_audience} 
                  />
                </div>
              )) : <div className="text-text-muted text-xs font-body">No Ad Copy output found.</div>}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  )
}
