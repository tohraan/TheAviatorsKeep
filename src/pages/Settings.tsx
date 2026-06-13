import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EditableListProps {
  label: string
  description: string
  items: string[]
  onSave: (items: string[]) => Promise<void>
}

interface EditablePriceProps {
  label: string
  description: string
  value: string
  prefix?: string
  onSave: (value: string) => Promise<void>
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border-default">
      <span className="text-xl">{icon}</span>
      <h2 className="text-sm font-ui font-semibold tracking-widest uppercase text-text-secondary">
        {title}
      </h2>
    </div>
  )
}

function SaveButton({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="px-4 py-1.5 rounded text-xs font-ui font-medium transition-all duration-200"
      style={{
        background: saved ? '#22C55E' : '#3B7FE8',
        color: '#F1F3F7',
        opacity: saving ? 0.6 : 1,
      }}
    >
      {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
    </button>
  )
}

function EditablePrice({ label, description, value, prefix = 'AED', onSave }: EditablePriceProps) {
  const [local, setLocal] = useState(value)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  const handleSave = async () => {
    const num = parseFloat(local)
    if (isNaN(num) || num <= 0) return
    setSaving(true)
    await onSave(num.toFixed(2))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-ui font-medium text-text-primary">{label}</p>
          <p className="text-xs font-body text-text-secondary mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-body text-text-secondary">{prefix}</span>
          <input
            type="number"
            value={local}
            onChange={e => { setLocal(e.target.value); setSaved(false) }}
            className="w-24 bg-bg-input border border-border-default rounded px-3 py-1.5 text-sm font-headline text-text-primary focus:outline-none focus:border-accent-primary text-right"
            min="0"
            step="0.01"
          />
          <SaveButton onClick={handleSave} saving={saving} saved={saved} />
        </div>
      </div>
    </div>
  )
}

function EditableList({ label, description, items, onSave }: EditableListProps) {
  const [localItems, setLocalItems] = useState<string[]>(items)
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocalItems(items) }, [items])

  const addItem = () => {
    const trimmed = newItem.trim()
    if (!trimmed || localItems.includes(trimmed)) return
    setLocalItems(prev => [...prev, trimmed])
    setNewItem('')
    setSaved(false)
  }

  const removeItem = (item: string) => {
    setLocalItems(prev => prev.filter(i => i !== item))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(localItems)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-ui font-medium text-text-primary">{label}</p>
          <p className="text-xs font-body text-text-secondary mt-0.5">{description}</p>
        </div>
        <SaveButton onClick={handleSave} saving={saving} saved={saved} />
      </div>

      {/* Current items */}
      <div className="flex flex-wrap gap-2">
        {localItems.map(item => (
          <div
            key={item}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-default bg-bg-elevated text-xs font-body text-text-primary"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(item)}
              className="text-text-muted hover:text-status-red transition-colors leading-none"
            >
              ×
            </button>
          </div>
        ))}
        {localItems.length === 0 && (
          <p className="text-xs font-body text-text-muted italic">No items yet.</p>
        )}
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={`Add new ${label.toLowerCase().replace(/s$/, '')}…`}
          className="flex-1 bg-bg-input border border-border-default rounded px-3 py-1.5 text-xs font-body text-text-primary focus:outline-none focus:border-accent-primary"
        />
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 rounded text-xs font-ui text-accent-primary border border-accent-primary/40 hover:bg-accent-muted transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { settings, loading, error, fetchSettings, updateSetting } = useSettingsStore()

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const parseJsonList = (key: string, fallback: string[]): string[] => {
    try {
      return JSON.parse(settings[key] ?? '[]')
    } catch {
      return fallback
    }
  }

  const saveList = async (key: string, items: string[]) => {
    await updateSetting(key, JSON.stringify(items))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <span className="text-3xl mb-3">⚠️</span>
        <p className="text-sm font-ui text-status-red font-medium">Failed to load settings</p>
        <p className="text-xs font-body text-text-secondary mt-1">{error}</p>
        <button
          onClick={fetchSettings}
          className="mt-4 text-xs font-ui text-accent-primary border border-accent-primary/40 px-3 py-1.5 rounded hover:bg-accent-muted transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
          ⚙️ Settings
        </h1>
        <p className="text-sm font-body text-text-secondary mt-1">
          Configure pricing, airlines, lead sources, and materials. Changes are saved to the database instantly.
        </p>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <SectionHeader title="Pricing" icon="💰" />
        <EditablePrice
          label="Standard Frame Price"
          description="Default price for a standard Emirates/Etihad/Qatar shadow box frame."
          value={settings['price_standard'] ?? '249.00'}
          onSave={v => updateSetting('price_standard', v)}
        />
        <EditablePrice
          label="Custom Frame Price"
          description="Default price for a custom-configured shadow box frame."
          value={settings['price_custom'] ?? '300.00'}
          onSave={v => updateSetting('price_custom', v)}
        />
      </div>

      {/* Airlines */}
      <div className="space-y-3">
        <SectionHeader title="Airlines" icon="✈️" />
        <EditableList
          label="Airlines"
          description="Airlines available for selection when creating orders and leads."
          items={parseJsonList('airlines', ['Emirates', 'Etihad', 'Saudi', 'Qatar', 'FlyDubai'])}
          onSave={items => saveList('airlines', items)}
        />
      </div>

      {/* Lead Sources */}
      <div className="space-y-3">
        <SectionHeader title="Lead Sources" icon="📱" />
        <EditableList
          label="Lead Sources"
          description="Where leads come from. Used in the Add Lead form."
          items={parseJsonList('lead_sources', ['facebook_marketplace', 'facebook_page', 'instagram', 'other'])}
          onSave={items => saveList('lead_sources', items)}
        />
      </div>

      {/* Materials */}
      <div className="space-y-3">
        <SectionHeader title="Materials" icon="📦" />
        <EditableList
          label="Materials Checklist"
          description="Items tracked per order. These appear in the Order Detail materials checklist."
          items={parseJsonList('material_list', ['box_frame', 'model_plane', 'printout_plaque', 'frame_extension', 'nail', 'pvc_tape'])}
          onSave={items => saveList('material_list', items)}
        />
      </div>

      {/* App Info */}
      <div className="space-y-3">
        <SectionHeader title="About" icon="ℹ️" />
        <div className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-2">
          {[
            ['Product', 'SkyFrame CRM v1.0'],
            ['Operator', 'Single user · Dubai, UAE'],
            ['Currency', 'AED (United Arab Emirates Dirham)'],
            ['Timezone', 'GST — UTC+4 (Gulf Standard Time)'],
            ['Database', 'Supabase (PostgreSQL)'],
            ['AI Engine', 'Google Gemini 2.0 Flash'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
              <span className="text-xs font-ui text-text-secondary">{k}</span>
              <span className="text-xs font-body text-text-primary">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
