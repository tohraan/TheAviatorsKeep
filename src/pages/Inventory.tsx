import { useEffect, useState } from 'react'
import { addHours, format } from 'date-fns'
import { useInventoryStore } from '../stores/inventoryStore'
import type { InventoryItem, InventoryLog } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function gst(utcStr: string) {
  return addHours(new Date(utcStr), 4)
}

const ITEM_ICONS: Record<string, string> = {
  box_frame: '🪟',
  airplane_model: '✈️',
  printout_plaque: '🖨️',
  nail_drill_process: '🔧',
  frame_extension: '📐',
  nail_and_drill: '🔩',
  pvc_tape: '🎞️',
  delivery_box: '📦',
  bubble_wrap: '🫧',
  fragile_sticker: '⚠️',
  delivery_label: '🏷️',
}

function stockColor(item: InventoryItem): string {
  if (item.quantity === 0) return '#EF4444'
  if (item.quantity <= item.min_threshold) return '#EAB308'
  return '#22C55E'
}

function stockLabel(item: InventoryItem): string {
  if (item.quantity === 0) return 'OUT OF STOCK'
  if (item.quantity <= item.min_threshold) return 'LOW STOCK'
  return 'IN STOCK'
}

// ── Adjust Modal ───────────────────────────────────────────────────────────────

function AdjustModal({
  item,
  onClose,
}: {
  item: InventoryItem
  onClose: () => void
}) {
  const { adjustQuantity, setQuantity } = useInventoryStore()
  const [mode, setMode] = useState<'delta' | 'set'>('delta')
  const [delta, setDelta] = useState(0)
  const [setTo, setSetTo] = useState(item.quantity)
  const [reason, setReason] = useState<string>('restock')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    if (mode === 'delta') {
      if (delta === 0) { onClose(); return }
      await adjustQuantity(item.id, item.item_key, delta, reason, note || undefined)
    } else {
      await setQuantity(item.id, item.item_key, setTo, note || undefined)
    }
    setSaving(false)
    onClose()
  }

  const preview = mode === 'delta'
    ? Math.max(0, item.quantity + delta)
    : setTo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-bg-elevated border border-border-default rounded-xl p-6 w-full max-w-sm space-y-5"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ITEM_ICONS[item.item_key] ?? '📦'}</span>
            <div>
              <p className="text-sm font-ui font-semibold text-text-primary">{item.item_name}</p>
              <p className="text-xs font-body text-text-secondary">Current: {item.quantity} {item.unit}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-bg-surface rounded-lg p-1 border border-border-default">
          {[{ key: 'delta', label: '± Adjust' }, { key: 'set', label: 'Set To' }].map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key as 'delta' | 'set')}
              className={`flex-1 py-1.5 rounded text-xs font-ui font-medium transition-colors ${
                mode === m.key ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'delta' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-ui tracking-widest uppercase text-text-secondary block mb-1.5">
                Quantity Change
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDelta(d => d - 1)}
                  className="w-9 h-9 rounded-lg border border-border-default bg-bg-surface text-text-primary hover:bg-bg-elevated transition-colors font-ui text-lg"
                >−</button>
                <input
                  type="number"
                  value={delta}
                  onChange={e => setDelta(parseInt(e.target.value) || 0)}
                  className="flex-1 text-center bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm font-headline text-text-primary focus:outline-none focus:border-accent-primary"
                />
                <button
                  type="button"
                  onClick={() => setDelta(d => d + 1)}
                  className="w-9 h-9 rounded-lg border border-border-default bg-bg-surface text-text-primary hover:bg-bg-elevated transition-colors font-ui text-lg"
                >+</button>
              </div>
              <p className="text-xs font-body text-text-secondary mt-1.5 text-center">
                {item.quantity} → <span className="font-medium" style={{ color: preview === 0 ? '#EF4444' : '#22C55E' }}>{preview}</span> {item.unit}
              </p>
            </div>

            <div>
              <label className="text-xs font-ui tracking-widest uppercase text-text-secondary block mb-1.5">Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded px-3 py-2 text-sm font-body text-text-primary focus:outline-none focus:border-accent-primary"
              >
                <option value="restock">Restock / Purchase</option>
                <option value="order_used">Used in Order</option>
                <option value="correction">Manual Correction</option>
                <option value="damaged">Damaged / Waste</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-ui tracking-widest uppercase text-text-secondary block mb-1.5">
                Set Quantity To
              </label>
              <input
                type="number"
                min={0}
                value={setTo}
                onChange={e => setSetTo(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm font-headline text-text-primary focus:outline-none focus:border-accent-primary"
              />
              <p className="text-xs font-body text-text-secondary mt-1.5 text-center">
                {item.quantity} → <span className="font-medium" style={{ color: setTo === 0 ? '#EF4444' : '#22C55E' }}>{setTo}</span> {item.unit}
              </p>
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-xs font-ui tracking-widest uppercase text-text-secondary block mb-1.5">
            Note <span className="normal-case font-body">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Purchased from Dragon Models"
            className="w-full bg-bg-input border border-border-default rounded px-3 py-2 text-xs font-body text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-ui text-text-secondary border border-border-default hover:bg-bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-ui font-medium text-white transition-colors"
            style={{ background: saving ? '#1E3A6E' : '#3B7FE8' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inventory Card ─────────────────────────────────────────────────────────────

function InventoryCard({
  item,
  isBottleneck,
  onAdjust,
}: {
  item: InventoryItem
  isBottleneck: boolean
  onAdjust: (item: InventoryItem) => void
}) {
  const color = stockColor(item)
  const label = stockLabel(item)
  // Frames this item can support given units_per_frame
  const framesYield = item.units_per_frame > 0
    ? Math.floor(item.quantity / item.units_per_frame)
    : item.quantity
  const pct = item.min_threshold > 0
    ? Math.min(100, (framesYield / (item.min_threshold * 3)) * 100)
    : 100

  return (
    <div
      className="bg-bg-surface border rounded-lg p-4 flex flex-col gap-3 relative transition-all duration-200 hover:border-border-strong"
      style={{
        borderColor: isBottleneck && item.quantity === 0 ? '#EF444440' : '#2A2F3E',
        borderLeft: isBottleneck ? `3px solid ${color}` : undefined,
      }}
    >
      {/* Outsourced badge */}
      {item.is_outsourced && (
        <div className="absolute top-3 right-3">
          <span className="text-xs font-ui px-1.5 py-0.5 rounded" style={{ background: '#A855F715', color: '#A855F7' }}>
            OUTSOURCED
          </span>
        </div>
      )}

      {/* Item info */}
      <div className="flex items-start gap-2">
        <span className="text-2xl flex-shrink-0">{ITEM_ICONS[item.item_key] ?? '📦'}</span>
        <div className="min-w-0">
          <p className="text-sm font-ui font-medium text-text-primary leading-tight pr-16">
            {item.item_name}
          </p>
          {item.notes && (
            <p className="text-xs font-body text-text-muted truncate mt-0.5">{item.notes}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-headline leading-none" style={{ color }}>
            {item.quantity}
          </p>
          <p className="text-xs font-body text-text-secondary mt-0.5">{item.unit}</p>
        </div>
        <div className="text-right space-y-1">
          <span
            className="text-xs font-ui px-2 py-0.5 rounded-full block"
            style={{ color, background: `${color}15` }}
          >
            {label}
          </span>
          {item.units_per_frame > 1 && (
            <span
              className="text-xs font-ui px-2 py-0.5 rounded-full block"
              style={{ color: '#A855F7', background: '#A855F715' }}
              title={`${item.units_per_frame} ${item.unit} consumed per frame`}
            >
              ×{item.units_per_frame}/frame
            </span>
          )}
          <p className="text-xs font-body text-text-muted">
            Min: {item.min_threshold}
          </p>
        </div>
      </div>

      {/* Frames yield (only show if units_per_frame > 1) */}
      {item.units_per_frame > 1 && (
        <div
          className="rounded px-2 py-1.5 text-center"
          style={{ background: `${color}10`, border: `1px solid ${color}30` }}
        >
          <p className="text-xs font-body text-text-secondary">
            <span className="font-headline text-base" style={{ color }}>{framesYield}</span>
            {' '}frames from this stock
          </p>
        </div>
      )}

      {/* Stock bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1E2230' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {/* Cost */}
      {item.cost_per_unit != null && (
        <p className="text-xs font-body text-text-muted">
          AED {item.cost_per_unit.toFixed(2)} / {item.unit}
        </p>
      )}

      {/* Adjust button */}
      <button
        type="button"
        onClick={() => onAdjust(item)}
        className="w-full py-1.5 rounded text-xs font-ui font-medium border border-border-default hover:bg-bg-elevated hover:border-border-strong transition-colors text-text-secondary hover:text-text-primary"
      >
        Adjust Stock
      </button>
    </div>
  )
}

// ── Log Table ──────────────────────────────────────────────────────────────────

function LogTable({ log }: { log: InventoryLog[] }) {
  if (log.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <span className="text-3xl mb-2">📋</span>
        <p className="text-sm font-ui text-text-muted">No stock changes logged yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-body">
        <thead>
          <tr className="border-b border-border-default">
            {['Time (GST)', 'Item', 'Change', 'Reason', 'Note'].map(h => (
              <th key={h} className="text-left py-2 px-3 font-ui tracking-widest uppercase text-text-secondary text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {log.map(entry => (
            <tr key={entry.id} className="hover:bg-bg-elevated transition-colors">
              <td className="py-2 px-3 text-text-muted whitespace-nowrap">
                {format(gst(entry.created_at), 'dd MMM, HH:mm')}
              </td>
              <td className="py-2 px-3 text-text-primary">
                {ITEM_ICONS[entry.item_key] ?? '📦'} {entry.item_key.replace(/_/g, ' ')}
              </td>
              <td className="py-2 px-3 font-headline text-sm">
                <span style={{ color: entry.change >= 0 ? '#22C55E' : '#EF4444' }}>
                  {entry.change >= 0 ? '+' : ''}{entry.change}
                </span>
              </td>
              <td className="py-2 px-3 text-text-secondary capitalize">
                {entry.reason?.replace(/_/g, ' ') ?? '—'}
              </td>
              <td className="py-2 px-3 text-text-muted">{entry.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Inventory() {
  const {
    items,
    log,
    loading,
    error,
    maxFrames,
    lowStockItems,
    bottlenecks,
    fetchInventory,
    fetchLog,
  } = useInventoryStore()

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [activeTab, setActiveTab] = useState<'stock' | 'log'>('stock')

  useEffect(() => {
    fetchInventory()
    fetchLog()
  }, [fetchInventory, fetchLog])

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-ui text-status-red">{error}</p>
        <button
          onClick={fetchInventory}
          className="text-xs font-ui text-accent-primary border border-accent-primary/40 px-3 py-1.5 rounded hover:bg-accent-muted transition-colors"
        >Retry</button>
      </div>
    )
  }

  // Bottleneck item key (limiting production)
  const bottleneckKeys = new Set(bottlenecks.map(b => b.id))

  // Total stock value
  const totalStockValue = items.reduce((sum, i) => {
    if (i.cost_per_unit == null) return sum
    return sum + i.quantity * i.cost_per_unit
  }, 0)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ui font-semibold tracking-wide text-text-primary">
            📦 Inventory
          </h1>
          <p className="text-sm font-body text-text-secondary mt-0.5">
            Raw materials stock — {items.length} items tracked
          </p>
        </div>
      </div>

      {/* ── Headline KPI: Frames capacity ── */}
      <div
        className="rounded-xl p-6 border flex items-center gap-6"
        style={{
          background: maxFrames === 0
            ? '#EF444410'
            : maxFrames <= 3
            ? '#EAB30810'
            : '#22C55E10',
          borderColor: maxFrames === 0
            ? '#EF444440'
            : maxFrames <= 3
            ? '#EAB30840'
            : '#22C55E40',
        }}
      >
        <div>
          <p className="text-xs font-ui tracking-widest uppercase text-text-secondary mb-1">
            Frames You Can Build Right Now
          </p>
          <div className="flex items-end gap-3">
            <p
              className="text-7xl font-headline leading-none"
              style={{
                color: maxFrames === 0 ? '#EF4444' : maxFrames <= 3 ? '#EAB308' : '#22C55E',
              }}
            >
              {maxFrames}
            </p>
            <p className="text-sm font-body text-text-secondary mb-2">complete frames</p>
          </div>
        </div>

        <div className="flex-1 border-l border-border-default pl-6 space-y-1">
          {maxFrames === 0 ? (
            <p className="text-sm font-ui text-status-red">
              ⛔ Production halted — one or more items are out of stock.
            </p>
          ) : maxFrames <= 3 ? (
            <p className="text-sm font-ui text-status-yellow">
              ⚠️ Low capacity — restock soon to avoid halting production.
            </p>
          ) : (
            <p className="text-sm font-ui text-status-green">
              ✓ Sufficient stock to fulfil current pipeline.
            </p>
          )}

          {bottlenecks.length > 0 && maxFrames < 999 && (
            <p className="text-xs font-body text-text-secondary">
              Limiting item{bottlenecks.length > 1 ? 's' : ''}:{' '}
              <span className="text-text-primary">
                {bottlenecks.map(b => b.item_name).join(', ')}
              </span>
            </p>
          )}

          {totalStockValue > 0 && (
            <p className="text-xs font-body text-text-muted">
              Stock value: AED {totalStockValue.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* ── Low stock alert strip ── */}
      {lowStockItems.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 border flex items-start gap-3"
          style={{ background: '#EAB30810', borderColor: '#EAB30840' }}
        >
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-ui font-medium text-status-yellow">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} low or out of stock
            </p>
            <p className="text-xs font-body text-text-secondary mt-0.5">
              {lowStockItems.map(i => `${ITEM_ICONS[i.item_key] ?? ''} ${i.item_name} (${i.quantity})`).join('  ·  ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-bg-surface rounded-lg p-1 border border-border-default w-fit">
        {[{ key: 'stock', label: '🗂 Stock Levels' }, { key: 'log', label: '📋 Change Log' }].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'stock' | 'log')}
            className={`px-4 py-1.5 rounded text-xs font-ui font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Stock grid ── */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => (
            <InventoryCard
              key={item.id}
              item={item}
              isBottleneck={bottleneckKeys.has(item.id)}
              onAdjust={setAdjustingItem}
            />
          ))}
          {items.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📦</span>
              <p className="text-sm font-ui text-text-muted">No inventory items found.</p>
              <p className="text-xs font-body text-text-secondary mt-1">
                Run the <code className="text-accent-primary">inventory_migration.sql</code> in Supabase to seed data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Log tab ── */}
      {activeTab === 'log' && (
        <div className="bg-bg-surface border border-border-default rounded-lg">
          <div className="px-5 py-3 border-b border-border-subtle">
            <p className="text-xs font-ui tracking-widest uppercase text-text-secondary">
              Recent Stock Changes (last 50)
            </p>
          </div>
          <LogTable log={log} />
        </div>
      )}

      {/* ── Adjust modal ── */}
      {adjustingItem && (
        <AdjustModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
        />
      )}
    </div>
  )
}
