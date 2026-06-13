import { useState, useRef, useCallback } from 'react'
import { runAgentPipeline } from '../lib/agents/orchestrator'
import type {
  AgentSession,
  AnalystOutput,
  StrategistOutput,
  CopywriterOutput,
  PlannerOutput,
  CopywriterCaption,
  PlannerDay,
} from '../lib/agents/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentStep = 'analyst' | 'strategist' | 'copywriter' | 'planner'
type StepStatus = 'idle' | 'running' | 'done' | 'error'

interface StepState {
  status: StepStatus
  error?: string
}

interface ScreenshotFile {
  id: string
  file: File
  base64: string
  label: string
  preview: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AGENT_STEPS: { key: AgentStep; name: string; role: string; icon: string; color: string }[] = [
  { key: 'analyst', name: 'The Analyst', role: 'Data Interpreter', icon: '📊', color: '#3B7FE8' },
  { key: 'strategist', name: 'The Strategist', role: 'Growth Strategist', icon: '🧠', color: '#A855F7' },
  { key: 'copywriter', name: 'The Copywriter', role: 'Caption & Hook Writer', icon: '✍️', color: '#22C55E' },
  { key: 'planner', name: 'The Planner', role: 'Content Calendar Builder', icon: '📅', color: '#EAB308' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AgentProgressBar({ steps }: { steps: Record<AgentStep, StepState> }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <p className="text-xs font-ui font-medium tracking-widest uppercase text-text-secondary mb-4">
        Agent Pipeline
      </p>
      <div className="space-y-3">
        {AGENT_STEPS.map((agent, idx) => {
          const state = steps[agent.key]
          const isRunning = state.status === 'running'
          const isDone = state.status === 'done'
          const isError = state.status === 'error'
          const isIdle = state.status === 'idle'

          return (
            <div key={agent.key} className="flex items-center gap-3">
              {/* Step indicator */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{
                  background: isDone
                    ? '#22C55E20'
                    : isRunning
                    ? `${agent.color}20`
                    : isError
                    ? '#EF444420'
                    : '#1A1D24',
                  border: `1.5px solid ${
                    isDone
                      ? '#22C55E'
                      : isRunning
                      ? agent.color
                      : isError
                      ? '#EF4444'
                      : '#2A2F3E'
                  }`,
                }}
              >
                {isDone && <span className="text-xs text-status-green">✓</span>}
                {isRunning && (
                  <span
                    className="block w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: agent.color }}
                  />
                )}
                {isError && <span className="text-xs text-status-red">✕</span>}
                {isIdle && (
                  <span className="text-xs font-ui text-text-muted">{idx + 1}</span>
                )}
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-ui font-medium text-text-primary">
                    {agent.icon} {agent.name}
                  </span>
                  <span className="text-xs font-body text-text-secondary">— {agent.role}</span>
                </div>
              </div>

              {/* Status label */}
              <div className="text-xs font-body flex-shrink-0">
                {isDone && <span className="text-status-green">Complete</span>}
                {isRunning && <span style={{ color: agent.color }}>Running…</span>}
                {isError && <span className="text-status-red">{state.error || 'Failed'}</span>}
                {isIdle && <span className="text-text-muted">Waiting</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnalystResult({ data }: { data: AnalystOutput }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Platform</p>
          <p className="text-sm font-body text-text-primary capitalize">{data.platform.replace('_', ' ')}</p>
        </div>
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Period</p>
          <p className="text-sm font-body text-text-primary">{data.period}</p>
        </div>
      </div>
      {Object.keys(data.metrics).length > 0 && (
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Key Metrics</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.metrics).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-xs font-body text-text-secondary capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-sm font-headline text-text-primary">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        {data.top_performing.length > 0 && (
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-xs font-ui tracking-widest uppercase text-status-green mb-2">✓ What Worked</p>
            <ul className="space-y-1">
              {data.top_performing.map((item, i) => (
                <li key={i} className="text-xs font-body text-text-primary flex gap-2">
                  <span className="text-status-green mt-0.5">▸</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.underperforming.length > 0 && (
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-xs font-ui tracking-widest uppercase text-status-red mb-2">✕ What Didn't</p>
            <ul className="space-y-1">
              {data.underperforming.map((item, i) => (
                <li key={i} className="text-xs font-body text-text-primary flex gap-2">
                  <span className="text-status-red mt-0.5">▸</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StrategistResult({ data }: { data: StrategistOutput }) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-elevated rounded-lg p-3">
        <p className="text-xs font-ui tracking-widest uppercase text-status-purple mb-2">Weekly Focus</p>
        <p className="text-sm font-body text-text-primary italic">"{data.weekly_focus}"</p>
      </div>
      <div className="bg-bg-elevated rounded-lg p-3">
        <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Priority Actions</p>
        <ol className="space-y-1 list-none">
          {data.priority_actions.map((action, i) => (
            <li key={i} className="flex gap-2 text-xs font-body text-text-primary">
              <span className="text-accent-primary font-headline">{i + 1}.</span>{action}
            </li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Content Pillars</p>
          <ul className="space-y-1">
            {data.content_pillars.map((pillar, i) => (
              <li key={i} className="text-xs font-body text-text-primary flex gap-2">
                <span className="text-status-purple">●</span>{pillar}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Avoid</p>
          <ul className="space-y-1">
            {data.avoid.map((item, i) => (
              <li key={i} className="text-xs font-body text-text-secondary flex gap-2">
                <span className="text-status-red">✕</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {data.boost_recommendation.should_boost && (
        <div className="bg-accent-muted border border-accent-primary/30 rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-accent-primary mb-1">Boost Recommendation</p>
          <p className="text-xs font-body text-text-primary">{data.boost_recommendation.which_content}</p>
          <p className="text-xs font-body text-text-secondary mt-1">Budget: <span className="text-status-green font-headline">AED {data.boost_recommendation.budget_aed.toFixed(2)}</span></p>
        </div>
      )}
    </div>
  )
}

function CopywriterResult({ data }: { data: CopywriterOutput }) {
  const [expanded, setExpanded] = useState<number | null>(0)

  const contentTypeColor: Record<string, string> = {
    carousel: '#3B7FE8',
    single_image: '#22C55E',
    reel: '#A855F7',
    story: '#EAB308',
  }

  return (
    <div className="space-y-3">
      {data.captions.map((caption: CopywriterCaption, i: number) => (
        <div key={i} className="bg-bg-elevated rounded-lg border border-border-default overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-bg-input transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-ui px-2 py-0.5 rounded uppercase tracking-wide"
                style={{
                  color: contentTypeColor[caption.content_type] || '#8B92A8',
                  background: `${contentTypeColor[caption.content_type] || '#8B92A8'}15`,
                }}
              >
                {caption.content_type}
              </span>
              <span className="text-sm font-body text-text-primary truncate max-w-xs">
                {caption.hook}
              </span>
            </div>
            <span className="text-text-muted text-xs font-body">{expanded === i ? '▲' : '▼'}</span>
          </button>

          {expanded === i && (
            <div className="px-3 pb-3 space-y-2 border-t border-border-subtle">
              <div className="mt-2">
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Hook</p>
                <p className="text-sm font-body text-text-primary font-medium">{caption.hook}</p>
              </div>
              <div>
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Body</p>
                <p className="text-xs font-body text-text-primary whitespace-pre-line">{caption.body}</p>
              </div>
              <div>
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">CTA</p>
                <p className="text-xs font-body text-accent-primary">{caption.cta}</p>
              </div>
              <div>
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Image Direction</p>
                <p className="text-xs font-body text-text-secondary italic">{caption.image_direction}</p>
              </div>
              <div>
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">Hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {caption.hashtags.map((tag, ti) => (
                    <span key={ti} className="text-xs font-body text-accent-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PlannerResult({ data }: { data: PlannerOutput }) {
  const platformColor: Record<string, string> = {
    instagram: '#A855F7',
    facebook_page: '#3B7FE8',
    both: '#22C55E',
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-elevated rounded-lg p-3">
        <p className="text-xs font-ui tracking-widest uppercase text-status-yellow mb-1">Week Theme</p>
        <p className="text-sm font-body text-text-primary italic">"{data.week_theme}"</p>
      </div>

      {/* Calendar */}
      <div className="bg-bg-elevated rounded-lg p-3">
        <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-3">7-Day Calendar</p>
        <div className="space-y-2">
          {data.calendar.map((day: PlannerDay, i: number) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border-subtle last:border-0">
              <div className="flex-shrink-0 w-20">
                <p className="text-xs font-ui font-medium text-text-primary">{day.day}</p>
                <p className="text-xs font-body text-text-muted">{day.date}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-ui px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{
                      color: platformColor[day.platform] || '#8B92A8',
                      background: `${platformColor[day.platform] || '#8B92A8'}15`,
                    }}
                  >
                    {day.platform.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-body text-text-secondary capitalize">{day.content_type.replace('_', ' ')}</span>
                  {day.boost && (
                    <span className="text-xs font-ui text-status-yellow px-1.5 py-0.5 rounded bg-status-yellow/10">
                      BOOST {day.boost_budget_aed ? `AED ${day.boost_budget_aed}` : ''}
                    </span>
                  )}
                </div>
                {day.notes && (
                  <p className="text-xs font-body text-text-muted mt-1">{day.notes}</p>
                )}
              </div>
              <div className="text-xs font-body text-text-muted flex-shrink-0">
                Cap #{day.caption_index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action items */}
      {data.action_items.length > 0 && (
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Action Items</p>
          <ul className="space-y-1.5">
            {data.action_items.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs font-body text-text-primary">
                <span className="text-status-yellow mt-0.5">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Materials needed */}
      {data.materials_needed.length > 0 && (
        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">Materials Needed</p>
          <ul className="space-y-1">
            {data.materials_needed.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs font-body text-text-secondary">
                <span className="text-text-muted">◦</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Agency() {
  const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [apiKeyOverride, setApiKeyOverride] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const [stepStates, setStepStates] = useState<Record<AgentStep, StepState>>({
    analyst: { status: 'idle' },
    strategist: { status: 'idle' },
    copywriter: { status: 'idle' },
    planner: { status: 'idle' },
  })

  const [results, setResults] = useState<{
    analyst?: AnalystOutput
    strategist?: StrategistOutput
    copywriter?: CopywriterOutput
    planner?: PlannerOutput
  }>({})

  const [activeResultTab, setActiveResultTab] = useState<AgentStep>('analyst')
  const [hasRun, setHasRun] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setStepStatus = useCallback(
    (step: AgentStep, status: StepStatus, error?: string) => {
      setStepStates(prev => ({ ...prev, [step]: { status, error } }))
    },
    []
  )

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return
    const newScreenshots: ScreenshotFile[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const base64 = await fileToBase64(file)
      newScreenshots.push({
        id: uid(),
        file,
        base64,
        label: file.name.replace(/\.[^.]+$/, ''),
        preview: base64,
      })
    }
    setScreenshots(prev => [...prev, ...newScreenshots])
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      await handleFileChange(e.dataTransfer.files)
    },
    []
  )

  const updateLabel = (id: string, label: string) => {
    setScreenshots(prev =>
      prev.map(s => (s.id === id ? { ...s, label } : s))
    )
  }

  const removeScreenshot = (id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id))
  }

  const handleRun = async () => {
    if (screenshots.length === 0 || isRunning) return

    setIsRunning(true)
    setHasRun(true)
    setResults({})
    setStepStates({
      analyst: { status: 'idle' },
      strategist: { status: 'idle' },
      copywriter: { status: 'idle' },
      planner: { status: 'idle' },
    })

    const session: AgentSession = {
      screenshots: screenshots.map(s => ({ base64: s.base64, label: s.label })),
    }

    const STEPS: AgentStep[] = ['analyst', 'strategist', 'copywriter', 'planner']
    let currentStepIndex = 0

    try {
      // Set first step to running immediately
      setStepStatus(STEPS[0], 'running')

      await runAgentPipeline(
        session,
        (step, data) => {
          // Mark current step done
          setStepStatus(step, 'done')
          setResults(prev => ({ ...prev, [step]: data }))

          // Advance to next step
          currentStepIndex = STEPS.indexOf(step) + 1
          if (currentStepIndex < STEPS.length) {
            setStepStatus(STEPS[currentStepIndex], 'running')
          }
          // Show tab for just-completed step
          setActiveResultTab(step)
        },
        apiKeyOverride || undefined
      )
    } catch (err) {
      const failedStep = STEPS[currentStepIndex]
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setStepStatus(failedStep, 'error', msg.slice(0, 80))
    } finally {
      setIsRunning(false)
    }
  }

  const resetPipeline = () => {
    setHasRun(false)
    setResults({})
    setStepStates({
      analyst: { status: 'idle' },
      strategist: { status: 'idle' },
      copywriter: { status: 'idle' },
      planner: { status: 'idle' },
    })
  }

  const isComplete = Object.values(stepStates).every(s => s.status === 'done')
  const hasError = Object.values(stepStates).some(s => s.status === 'error')

  const resultTabs: { key: AgentStep; label: string; icon: string }[] = [
    { key: 'analyst', label: 'Analyst', icon: '📊' },
    { key: 'strategist', label: 'Strategist', icon: '🧠' },
    { key: 'copywriter', label: 'Copywriter', icon: '✍️' },
    { key: 'planner', label: 'Planner', icon: '📅' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
            🤖 AI Content Agency
          </h1>
          <p className="text-sm font-body text-text-secondary mt-1">
            4-agent pipeline: upload analytics screenshots → get a full week's content strategy.
          </p>
        </div>
        {hasRun && (
          <button
            type="button"
            onClick={resetPipeline}
            className="text-xs font-ui text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong rounded px-3 py-1.5 transition-colors"
          >
            New Run
          </button>
        )}
      </div>

      {!hasRun ? (
        /* ── Upload UI ──────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Screenshot uploader */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="border-2 border-dashed border-border-default rounded-lg p-8 text-center hover:border-accent-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3">📸</div>
              <p className="text-sm font-ui font-medium text-text-primary">
                Drop analytics screenshots here
              </p>
              <p className="text-xs font-body text-text-secondary mt-1">
                or click to browse — PNG, JPG, WEBP supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => handleFileChange(e.target.files)}
              />
            </div>

            {/* Uploaded screenshots */}
            {screenshots.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-ui tracking-widest uppercase text-text-secondary">
                  Screenshots ({screenshots.length})
                </p>
                {screenshots.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-bg-surface rounded-lg p-3 border border-border-default"
                  >
                    <img
                      src={s.preview}
                      alt={s.label}
                      className="w-14 h-10 object-cover rounded border border-border-subtle flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={s.label}
                      onChange={e => updateLabel(s.id, e.target.value)}
                      placeholder="Context label (e.g. Instagram Insights – May)"
                      className="flex-1 bg-bg-input border border-border-default rounded px-2 py-1 text-xs font-body text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(s.id)}
                      className="text-text-muted hover:text-status-red transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls panel */}
          <div className="space-y-4">
            {/* API Key override */}
            <div className="bg-bg-surface border border-border-default rounded-lg p-4">
              <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">
                API Key Override
              </p>
              <p className="text-xs font-body text-text-muted mb-3">
                Leave blank to use <code className="text-accent-primary">VITE_GEMINI_API_KEY</code> from env.
              </p>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyOverride}
                  onChange={e => setApiKeyOverride(e.target.value)}
                  placeholder="AQ.Ab8..."
                  className="w-full bg-bg-input border border-border-default rounded px-3 py-2 text-xs font-body text-text-primary focus:outline-none focus:border-accent-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary text-xs"
                >
                  {showApiKey ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Agent info */}
            <div className="bg-bg-surface border border-border-default rounded-lg p-4">
              <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-3">
                Agent Pipeline
              </p>
              <div className="space-y-2">
                {AGENT_STEPS.map((a, i) => (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="text-base">{a.icon}</span>
                    <div>
                      <p className="text-xs font-ui font-medium text-text-primary">{a.name}</p>
                      <p className="text-xs font-body text-text-muted">{a.role}</p>
                    </div>
                    {i < AGENT_STEPS.length - 1 && (
                      <span className="ml-auto text-text-muted text-xs">↓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button
              type="button"
              onClick={handleRun}
              disabled={screenshots.length === 0 || isRunning}
              className="w-full py-3 rounded-lg text-sm font-ui font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: screenshots.length > 0 ? '#3B7FE8' : '#1E3A6E',
                color: '#F1F3F7',
              }}
            >
              {isRunning ? 'Running Pipeline…' : `Run Agency Pipeline (${screenshots.length} screenshot${screenshots.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      ) : (
        /* ── Results UI ─────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: progress */}
          <div className="space-y-4">
            <AgentProgressBar steps={stepStates} />

            {/* Screenshots summary */}
            <div className="bg-bg-surface border border-border-default rounded-lg p-4">
              <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-2">
                Input ({screenshots.length})
              </p>
              <div className="space-y-1">
                {screenshots.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <img
                      src={s.preview}
                      alt={s.label}
                      className="w-8 h-6 object-cover rounded border border-border-subtle flex-shrink-0"
                    />
                    <span className="text-xs font-body text-text-secondary truncate">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {isComplete && (
              <div className="bg-status-green/10 border border-status-green/30 rounded-lg p-3 text-center">
                <p className="text-sm font-ui font-medium text-status-green">✓ Pipeline Complete</p>
                <p className="text-xs font-body text-text-secondary mt-1">All agents finished successfully.</p>
              </div>
            )}

            {hasError && (
              <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-3 text-center">
                <p className="text-sm font-ui font-medium text-status-red">Pipeline Error</p>
                <p className="text-xs font-body text-text-secondary mt-1">One or more agents failed. Check the step above.</p>
              </div>
            )}
          </div>

          {/* Right: results tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-bg-surface rounded-lg p-1 border border-border-default">
              {resultTabs.map(tab => {
                const isDone = stepStates[tab.key].status === 'done'
                const isActive = activeResultTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => isDone && setActiveResultTab(tab.key)}
                    disabled={!isDone}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-ui font-medium transition-colors duration-150 ${
                      isActive && isDone
                        ? 'bg-bg-elevated text-text-primary'
                        : isDone
                        ? 'text-text-secondary hover:text-text-primary'
                        : 'text-text-muted cursor-not-allowed'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="bg-bg-surface border border-border-default rounded-lg p-4">
              {/* Loading state */}
              {stepStates[activeResultTab].status === 'running' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mb-3" />
                  <p className="text-sm font-ui text-text-secondary">
                    {AGENT_STEPS.find(a => a.key === activeResultTab)?.name} is working…
                  </p>
                </div>
              )}

              {/* Idle / waiting state */}
              {stepStates[activeResultTab].status === 'idle' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl mb-2">
                    {AGENT_STEPS.find(a => a.key === activeResultTab)?.icon}
                  </span>
                  <p className="text-sm font-ui text-text-muted">Waiting for previous agent…</p>
                </div>
              )}

              {/* Error state */}
              {stepStates[activeResultTab].status === 'error' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl mb-2">⚠️</span>
                  <p className="text-sm font-ui text-status-red font-medium">Agent Failed</p>
                  <p className="text-xs font-body text-text-secondary mt-1 max-w-xs">
                    {stepStates[activeResultTab].error}
                  </p>
                </div>
              )}

              {/* Done — show results */}
              {stepStates[activeResultTab].status === 'done' && results[activeResultTab] && (
                <>
                  {activeResultTab === 'analyst' && results.analyst && (
                    <AnalystResult data={results.analyst} />
                  )}
                  {activeResultTab === 'strategist' && results.strategist && (
                    <StrategistResult data={results.strategist} />
                  )}
                  {activeResultTab === 'copywriter' && results.copywriter && (
                    <CopywriterResult data={results.copywriter} />
                  )}
                  {activeResultTab === 'planner' && results.planner && (
                    <PlannerResult data={results.planner} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
