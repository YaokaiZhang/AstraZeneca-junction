// Every county at a glance: map coloured by how many steps leak, and a ranking by people lost after a positive test.
import { useState } from 'react'
import { Card, Label, cx } from '../../components/ui'
import { FinlandMap } from '../../components/FinlandMap'
import { Seg } from '../county/bits'
import { SCREENING, screeningById } from './data'
import { STEPS, flags, losses, n0, n1, weakCount, type Step, STEP_META } from './model'

const LEAK_FILL = ['#D1D1C9', '#FFC233', '#E0875F', '#C65D3B']
const PLAIN: Record<Step, string> = { detection: 'kits', referral: 'follow-up', capacity: 'wait' }

/**
 * Map coloured by how many of the three steps are behind. Bowel by default; breast and cervical pass their own
 * count and hover text (countOf / tipOf).
 */
export function LeakMap({ selected, onSelect, className, countOf, tipOf }: {
  selected: string; onSelect: (id: string) => void; className?: string
  countOf?: (id: string) => number | null; tipOf?: (id: string) => string | null
}) {
  return (
    <div className={className}>
      <FinlandMap selected={selected} onSelect={onSelect} label="Finland by number of leaking steps"
        style={(c) => {
          if (countOf) { const n = countOf(c.id); return { fill: n == null ? '#eee' : LEAK_FILL[Math.min(3, n)] } }
          const r = screeningById(c.id); return { fill: r ? LEAK_FILL[weakCount(r)] : '#eee' }
        }}
        tooltip={(c) => {
          if (tipOf) return tipOf(c.id)
          const r = screeningById(c.id)
          if (!r) return null
          const f = flags(r)
          const red = STEPS.filter((s) => f[s])
          return red.length ? `Behind: ${red.map((s) => PLAIN[s]).join(', ')}` : 'On track'
        }} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-[13px] opacity-80">
        {LEAK_FILL.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c }} />{i === 0 ? 'On track' : `${i} step${i > 1 ? 's' : ''} behind`}</span>
        ))}
      </div>
    </div>
  )
}

type Metric = 'referral' | 'detection' | 'capacity'
const METRICS: { id: Metric; label: string }[] = [
  { id: 'referral', label: 'No colonoscopy' },
  { id: 'detection', label: 'Kit not returned' },
  { id: 'capacity', label: 'Wait' },
]

export function Ranking({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [m, setM] = useState<Metric>('referral')
  // people lost beyond the national rate (detection, referral) or the median wait (capacity)
  const val = (id: string) => {
    const r = screeningById(id)!
    return m === 'capacity' ? r.medianMonths : losses(r)[m].vsNational
  }
  const rows = [...SCREENING].sort((a, b) => val(b.id) - val(a.id))
  const max = Math.max(...rows.map((r) => val(r.id)), 0.1)
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-1">
        <Label>Counties ranked</Label>
        <Seg items={METRICS} value={m} onChange={setM} />
      </div>
      <p className="font-sans text-[14px] opacity-70 mb-3">
        {m === 'capacity' ? 'Median months from positive test to colonoscopy.' : `People lost beyond the national rate, 2024. ${m === 'referral' ? 'Positives with no recorded colonoscopy.' : 'Invited who never returned the kit.'}`}
      </p>
      <ol className="space-y-0.5">
        {rows.map((r, i) => {
          const v = val(r.id)
          const f = flags(r)
          return (
            <li key={r.id}>
              <button onClick={() => onSelect(r.id)}
                className={cx('w-full grid grid-cols-[1.6rem_minmax(0,9.5rem)_1fr_3.6rem_2.6rem] items-center gap-2 py-1 px-1 rounded text-left hover:bg-black/5', r.id === selected && 'bg-mustard/40')}>
                <span className="font-type text-[13px] opacity-60">{i + 1}</span>
                <span className="font-sans text-[14px] truncate">{r.name}</span>
                <span className="relative h-2 rounded-full bg-black/[.06]">
                  <span className={cx('absolute inset-y-0 left-0 rounded-full', f[m as Step] ? 'bg-terra' : 'bg-ink/60')} style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className="font-serif text-lg text-right">{m === 'capacity' ? `${n1(v)}` : n0(v)}</span>
                <span className="flex gap-0.5 justify-end" aria-label={`${weakCount(r)} leaking steps`}>
                  {STEPS.map((s) => <span key={s} className={cx('w-2 h-2 rounded-full', f[s] ? 'bg-terra' : 'bg-stone')} title={STEP_META[s].short} />)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="font-type text-[13px] uppercase tracking-wider opacity-60 mt-3">Dots: detection · referral · capacity (red = leaks)</p>
    </Card>
  )
}
