import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAgencyStore } from '../store/agencyStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Settings, Save, RotateCcw } from 'lucide-react'
import { SOP } from '../types/agency.types'
import { DEFAULT_SOPS } from '../lib/defaultSOPs'

export default function SOPManager() {
  const { sops, fetchSOPs, updateSOP, resetSOP } = useAgencyStore()
  const [activeTab, setActiveTab] = useState<string>('')
  const [editingSOP, setEditingSOP] = useState<Partial<SOP>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSOPs()
  }, [fetchSOPs])

  useEffect(() => {
    if (sops.length > 0 && !activeTab) {
      setActiveTab(sops[0].id)
      setEditingSOP(sops[0])
    }
  }, [sops, activeTab])

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    const sop = sops.find(s => s.id === id)
    if (sop) setEditingSOP(sop)
  }

  const handleSave = async () => {
    if (!activeTab || !editingSOP.id) return
    setIsSaving(true)
    await updateSOP(editingSOP.id, editingSOP)
    setIsSaving(false)
  }

  const handleReset = async () => {
    if (!activeTab || !editingSOP.agent_name) return
    if (!window.confirm("Are you sure you want to reset this SOP to its original default? All your custom instructions will be lost.")) return
    
    const defaultSop = DEFAULT_SOPS.find(s => s.agent_name === editingSOP.agent_name)
    if (!defaultSop) return

    setIsSaving(true)
    await resetSOP(activeTab, defaultSop)
    const refreshed = sops.find(s => s.id === activeTab)
    if (refreshed) setEditingSOP(refreshed) // This might need a re-fetch wait, but store handles fetch.
    setTimeout(() => {
      window.location.reload() // simple way to ensure state is fresh for v1
    }, 500)
  }

  if (sops.length === 0) return <div className="p-8 text-center text-text-secondary font-body text-xs">Loading SOPs...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
            SOP Manager
          </h1>
          <p className="text-xs font-body text-text-secondary mt-0.5">
            Tweak the instructions, tone, and rules for your AI agents.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="text-text-secondary border-border-default hover:bg-bg-elevated hover:text-text-primary h-9 font-ui text-xs"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Default
          </Button>
          <Button 
            className="bg-status-purple hover:bg-status-purple/90 text-white h-9 font-ui text-xs"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card className="bg-bg-surface border-border-default shadow-sm border-t-2 border-t-status-purple">
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-sm font-ui font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <Settings className="h-4 w-4 text-status-purple" />
            Agent Operating Procedures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex">
            <div className="w-48 md:w-64 border-r border-border-subtle min-h-[500px]">
              <TabsList className="flex flex-col h-auto bg-transparent p-0 w-full rounded-none">
                {sops.map((sop) => (
                  <TabsTrigger 
                    key={sop.id} 
                    value={sop.id}
                    className="w-full justify-start px-4 py-3 rounded-none border-b border-border-subtle font-ui text-xs text-text-secondary data-[state=active]:bg-bg-elevated data-[state=active]:text-status-purple data-[state=active]:border-r-2 data-[state=active]:border-r-status-purple hover:bg-bg-elevated/50 transition-colors"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold tracking-wide uppercase">{sop.agent_name.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] font-body text-text-muted">v{sop.version}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto max-h-[700px]">
              {sops.map((sop) => (
                <TabsContent key={sop.id} value={sop.id} className="m-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-ui font-semibold text-text-primary capitalize tracking-wide">{sop.agent_name.replace(/_/g, ' ')}</h3>
                    <p className="text-xs font-body text-text-secondary mt-1">{sop.role}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-text-secondary uppercase tracking-wider">Tone Guidelines</Label>
                      <Textarea 
                        className="bg-bg-input border-border-default text-xs min-h-[80px] font-body text-text-primary focus-visible:ring-status-purple"
                        value={editingSOP.tone_guidelines || ''}
                        onChange={(e) => setEditingSOP({...editingSOP, tone_guidelines: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-text-secondary uppercase tracking-wider">Platform Rules / Constraints</Label>
                      <Textarea 
                        className="bg-bg-input border-border-default text-xs min-h-[80px] font-body text-text-primary focus-visible:ring-status-purple"
                        value={editingSOP.platform_rules || ''}
                        onChange={(e) => setEditingSOP({...editingSOP, platform_rules: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-text-secondary uppercase tracking-wider">What Good Looks Like</Label>
                      <Textarea 
                        className="bg-bg-input border-border-default text-xs min-h-[80px] font-body text-text-primary focus-visible:ring-status-purple"
                        value={editingSOP.what_good_looks_like || ''}
                        onChange={(e) => setEditingSOP({...editingSOP, what_good_looks_like: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5 pt-4 border-t border-border-subtle">
                      <Label className="text-[10px] text-status-orange uppercase tracking-wider flex justify-between">
                        <span>Advanced: Full System Prompt Injection</span>
                        <span className="text-text-muted normal-case">Edit with caution</span>
                      </Label>
                      <Textarea 
                        className="bg-[#0A0C10] border-border-default text-xs min-h-[300px] font-body text-text-muted focus-visible:ring-status-purple"
                        value={editingSOP.full_sop || ''}
                        onChange={(e) => setEditingSOP({...editingSOP, full_sop: e.target.value})}
                      />
                      <p className="text-[10px] text-text-muted font-body">This is the raw SOP file text provided to the agent as overarching context.</p>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
