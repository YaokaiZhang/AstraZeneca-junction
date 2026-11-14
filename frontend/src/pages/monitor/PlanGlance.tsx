// Small print-friendly charts for the one-page plan, shared by all three programmes. Every chart also carries its
// numbers as text and an aria-label, so nothing depends on reading the bars (and greyscale printing still works:
// status is also written out, and reference marks are lines, not colours).
import { cx } from '../../components/ui'

export type Unit = '%' | 'months' | 'days' | ''
export interface GlanceStep {
  label: string
  value: number | null
  finland: number
  unit: Unit
  /** behind = past our warning line; check = figure exists but should not be compared (see note) */
  status: 'ok' | 'behind' | 'missing' | 'check'
  /** official goal marker (attendance: 80%) */
  goal?: number
  note?: string
}
export interface GlanceBar { label: string; value: number; tone: 'now' | 'fix' | 'alt' | 'target' }
export interface Glance {
  steps: GlanceStep[]
  /** before → after for "What it achieves" */
  change?: { title: string; unit: Unit; kind: 'estimate' | 'target'; bars: GlanceBar[] }
  /** "What it takes": bars in one unit */
  takes?: { title: string; unit: string; bars: { label: string; value: number }[] }
  /** "How you'll know": each measure with the value it should reach, where we compute one */
  measures: { text: string; target?: string }[]
}

const GREEN = '#5F8A70', TERRA = '#C65D3B'
const fmt = (v: number, unit: Unit) => (unit === '%' ? `${v.toFixed(1)}%` : unit === 'months' ? `${v.toFixed(1)} mo` : unit === 'days' ? `${Math.round(v)} d` : Math.round(v).toLocaleString('en-GB'))
const STATUS: Record<GlanceStep['status'], string> = { ok: 'on track', behind: 'behind', missing: 'no data', check: 'check data' }

/** The three steps as bullet bars: county value, Finland tick, goal marker. */
export function StepsStrip({ steps, county }: { steps: GlanceStep[]; county: string }) {
  return (
    <div className="grid grid-cols-3 gap-3" role="list" aria-label={`${county} against Finland, 2024`}>
      {steps.map((s) => {
        const pct = s.unit === '%'
        const lo = pct ? Math.min(50, Math.floor(Math.min(s.value ?? 100, s.finland) / 10) * 10 - 10) : 0
        const hi = pct ? 100 : Math.max(s.value ?? 0, s.finland) * 1.25 || 1
        const x = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`
        const fill = s.status === 'behind' ? TERRA : s.status === 'ok' ? GREEN : '#9A9A93'
        const text = `${s.label}: ${s.value == null ? 'no data' : fmt(s.value, s.unit)}, Finland ${fmt(s.finland, s.unit)}${s.goal ? `, goal ${s.goal}%` : ''}, ${STATUS[s.status]}`
        return (
          <div key={s.label} role="listitem" aria-label={text} className="min-w-0">
            <p className="text-[11px] leading-tight opacity-75 min-h-[2lh]">{s.label}</p>
            <p className={cx('font-type uppercase text-[9px] tracking-wider mt-0.5', s.status === 'behind' ? 'text-terra' : s.status === 'ok' ? 'text-[#2F5A44]' : 'opacity-60')}>{STATUS[s.status]}</p>
            <p className="font-serif text-[20px] leading-none mt-0.5">{s.value == null ? '–' : fmt(s.value, s.unit)}</p>
            <div className="relative h-2.5 mt-1.5 rounded-sm bg-black/[.08]" aria-hidden>
              {s.value != null && <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: x(s.value), background: fill }} />}
              <div className="absolute -top-1 -bottom-1 w-[2px] bg-ink" style={{ left: x(s.finland) }} />
              {s.goal && <div className="absolute -top-1 -bottom-1 w-0 border-l-2 border-dashed border-[#2F5A44]" style={{ left: x(s.goal) }} />}
            </div>
            <p className="text-[9.5px] opacity-65 mt-1 leading-tight">▏Finland {fmt(s.finland, s.unit)}{s.goal ? ` · ┆ goal ${s.goal}%` : ''}{s.note ? ` · ${s.note}` : ''}</p>
          </div>
        )
      })}
    </div>
  )
}

const TONE: Record<GlanceBar['tone'], string> = { now: '#9A9A93', fix: GREEN, alt: '#B9CBBE', target: '#E0B44A' }

/** Horizontal bars on one scale, value written at the end of each. */
export function Bars({ bars, unit, label }: { bars: { label: string; value: number; tone?: GlanceBar['tone'] }[]; unit: Unit | string; label: string }) {
  const max = Math.max(...bars.map((b) => b.value), 0.0001)
  const u = (v: number) => (unit === '%' || unit === 'months' || unit === 'days' || unit === '' ? fmt(v, unit as Unit) : `${Math.round(v * 10) / 10 < 10 ? (Math.round(v * 10) / 10).toLocaleString('en-GB') : Math.round(v).toLocaleString('en-GB')} ${unit}`)
  return (
    <div className="space-y-1" role="img" aria-label={`${label}: ${bars.map((b) => `${b.label} ${u(b.value)}`).join('; ')}`}>
      {bars.map((b) => (
        <div key={b.label} className="grid grid-cols-[5.2rem_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
          <span className="leading-tight opacity-80">{b.label}</span>
          <span className="block min-w-0">
            <span className="block h-2.5 rounded-sm" style={{ width: `${Math.max(2, (b.value / max) * 100)}%`, background: TONE[b.tone ?? 'fix'] }} />
          </span>
          <span className="font-medium whitespace-nowrap text-right">{u(b.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Measures({ items }: { items: Glance['measures'] }) {
  return (
    <ul className="space-y-1 text-[12.5px] leading-snug">
      {items.map((m) => (
        <li key={m.text} className="flex items-start justify-between gap-2">
          <span>{m.text}</span>
          {m.target && <span className="shrink-0 font-medium text-[#2F5A44] whitespace-nowrap">→ {m.target}</span>}
        </li>
      ))}
    </ul>
  )
}
