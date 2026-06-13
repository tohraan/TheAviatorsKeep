import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAgencyStore } from '../store/agencyStore'
import { supabase } from '../../lib/supabase'
import type { ContentSession } from '../types/agency.types'
import { OutputCard } from '../components/OutputCard'
import { Card, CardContent } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { ArrowLeft, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { formatLocalDate } from '../../lib/utils'

export default function ContentSessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { startContentSession } = useAgencyStore()
  const [session, setSession] = useState<ContentSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchSession = async () => {
      const { data } = await supabase
        .from('agency_content_sessions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) setSession(data as ContentSession)
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
    { name: 'CMO', status: session.cmo_output ? 'complete' : isRunning ? 'running' : 'pending' },
    { name: 'Content Manager', status: session.content_manager_output ? 'complete' : session.cmo_output && isRunning ? 'running' : 'pending' },
    { name: 'Reel Agent', status: session.reel_output ? 'complete' : session.content_manager_output && isRunning ? 'running' : 'pending' },
    { name: 'Carousel Agent', status: session.carousel_output ? 'complete' : session.reel_output && isRunning ? 'running' : 'pending' },
    { name: 'FB Post Agent', status: session.fb_post_output ? 'complete' : session.carousel_output && isRunning ? 'running' : 'pending' },
  ]

  const getStatusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-status-green" />
    if (status === 'running') return <Loader2 className="h-4 w-4 text-status-purple animate-spin" />
    if (status === 'failed') return <XCircle className="h-4 w-4 text-status-red" />
    return <Circle className="h-4 w-4 text-border-default" />
  }

  const parseCMO = () => {
    try { return session.cmo_output as any } catch { return null }
  }
  const parseCM = () => {
    try { return session.content_manager_output as any } catch { return null }
  }
  const parseArrayOutput = (output: any) => {
    try {
      if (!output) return []
      if (Array.isArray(output)) return output
      if (output.captions && Array.isArray(output.captions)) return output.captions
      return [output]
    } catch {
      return []
    }
  }

  const cmo = parseCMO()
  const cm = parseCM()
  const reels = parseArrayOutput(session.reel_output)
  const carousels = parseArrayOutput(session.carousel_output)
  const fbPosts = parseArrayOutput(session.fb_post_output)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agency/content')} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-ui font-semibold text-text-primary flex items-center gap-2">
            {session.session_label || 'Unnamed Session'}
            {isRunning && <span className="flex h-2.5 w-2.5 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-purple opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-purple"></span></span>}
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            Week of {session.week_of ? formatLocalDate(session.week_of) : '-'} · Created {formatLocalDate(session.created_at.split('T')[0])}
          </p>
        </div>
      </div>

      {isRunning || session.status === 'failed' || session.status === 'partial' ? (
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
                  {agent.status === 'running' && <span className="text-xs text-status-purple italic">Processing...</span>}
                </div>
              ))}
            </div>
            {session.status === 'failed' && (
              <div className="mt-6 flex flex-col items-start gap-4">
                <div className="p-3 bg-status-red/10 border border-status-red/20 rounded text-status-red text-xs font-body flex items-center w-full gap-2">
                  <XCircle className="h-4 w-4" /> Pipeline execution failed. See logs for details.
                </div>
                <Button 
                  onClick={() => {
                    setSession({ ...session, status: 'running' })
                    startContentSession(session.id)
                  }}
                  className="bg-status-purple hover:bg-status-purple/90 text-white font-ui text-xs"
                >
                  Retry Pipeline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="cmo" className="w-full">
          <TabsList className="bg-bg-surface border border-border-default h-12 w-full justify-start px-2 gap-2">
            <TabsTrigger value="cmo" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">CMO Brief</TabsTrigger>
            <TabsTrigger value="plan" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">7-Day Plan</TabsTrigger>
            <TabsTrigger value="reels" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">Reels ({reels.length})</TabsTrigger>
            <TabsTrigger value="carousels" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">Carousels ({carousels.length})</TabsTrigger>
            <TabsTrigger value="fb" className="font-ui text-xs data-[state=active]:bg-status-purple data-[state=active]:text-white">FB Posts ({fbPosts.length})</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="cmo" className="space-y-4 m-0">
              {cmo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Weekly Theme</div>
                        <div className="text-sm font-body text-text-primary font-medium">{cmo.week_theme}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Key Message</div>
                        <div className="text-sm font-body text-text-primary">{cmo.key_message}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Pillars</div>
                        <div className="text-sm font-body text-text-primary">
                          <span className="text-status-purple font-medium">Primary:</span> {cmo.primary_pillar}<br/>
                          <span className="text-text-muted">Secondary:</span> {cmo.secondary_pillar}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-bg-surface border-border-default">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Brief for Content Manager</div>
                        <div className="text-sm font-body text-text-primary italic border-l-2 border-status-purple pl-3">{cmo.content_manager_brief}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest mb-1">Pull Back On</div>
                        <div className="text-sm font-body text-status-orange">{cmo.pull_back_on}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-text-muted text-xs font-body">No CMO output found.</div>
              )}
            </TabsContent>

            <TabsContent value="plan" className="m-0">
              {cm && cm.days ? (
                <div className="space-y-4">
                  <div className="bg-bg-surface border border-border-default rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm font-body text-text-primary">{cm.week_summary}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {cm.days.map((day: any, i: number) => (
                      <Card key={i} className="bg-bg-surface border-border-default">
                        <CardContent className="p-4 space-y-3">
                          <div className="border-b border-border-subtle pb-2">
                            <div className="text-xs font-ui font-bold text-text-primary uppercase tracking-wide">{day.day}</div>
                            <div className="text-[10px] font-body text-text-secondary">{day.date}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-ui font-bold text-text-muted tracking-widest">Format</div>
                            <div className="text-xs font-body text-text-primary">{day.format}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-ui font-bold text-text-muted tracking-widest">Pillar</div>
                            <div className="text-xs font-body text-text-primary">{day.content_pillar}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-ui font-bold text-text-muted tracking-widest">Airline</div>
                            <div className="text-xs font-body text-status-purple">{day.airline}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-text-muted text-xs font-body">No 7-Day Plan found.</div>
              )}
            </TabsContent>

            <TabsContent value="reels" className="space-y-6 m-0">
              {reels.length > 0 ? reels.map((r: any, i: number) => (
                <OutputCard 
                  key={i} 
                  hook={r.hook} 
                  body={r.body || r.caption} 
                  cta={r.cta} 
                  imageDirection={r.image_direction || r.video_direction || r.visuals} 
                />
              )) : <div className="text-text-muted text-xs font-body">No Reels output found.</div>}
            </TabsContent>

            <TabsContent value="carousels" className="space-y-6 m-0">
              {carousels.length > 0 ? carousels.map((c: any, i: number) => (
                <OutputCard 
                  key={i} 
                  hook={c.hook} 
                  body={c.body || c.caption} 
                  cta={c.cta} 
                  imageDirection={c.image_direction || c.slides_description || c.visuals} 
                />
              )) : <div className="text-text-muted text-xs font-body">No Carousels output found.</div>}
            </TabsContent>

            <TabsContent value="fb" className="space-y-6 m-0">
              {fbPosts.length > 0 ? fbPosts.map((f: any, i: number) => (
                <OutputCard 
                  key={i} 
                  hook={f.hook} 
                  body={f.body || f.caption} 
                  cta={f.cta} 
                  imageDirection={f.image_direction || f.visuals} 
                />
              )) : <div className="text-text-muted text-xs font-body">No FB Posts output found.</div>}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  )
}
