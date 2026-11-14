// "Better / worse than Finland" marker for the evidence tables. Words and an arrow, not colour alone, so it reads in
// print and greyscale. Only for figures where the direction is clear; counts and call-back/referral rates get a
// grey "for context", and figures with a data caveat get "check data" instead of a verdict.
import { cx } from '../../components/ui'

export interface Cmp {
  county: number | null
  finland: number
  /** which direction is good */
  better: 'higher' | 'lower'
  unit: 'pts' | 'months'
  /** a data caveat: do not call it better or worse */
  check?: boolean
}

/** Within this distance of Finland counts as "about the same". */
export const SAME = { pts: 0.5, months: 0.1 } as const

export function vsFinland(c: Cmp): { kind: 'better' | 'worse' | 'same' | 'check' | 'none'; text: string } {
  if (c.county == null) return { kind: 'none', text: 'no data' }
  if (c.check) return { kind: 'check', text: 'check data' }
  const d = Math.round((c.county - c.finland) * 10) / 10
  if (Math.abs(d) <= SAME[c.unit]) return { kind: 'same', text: '≈ about the same' }
  const good = c.better === 'higher' ? d > 0 : d < 0
  const size = c.unit === 'pts' ? `${Math.abs(d).toFixed(1)} pts ${d > 0 ? 'higher' : 'lower'}` : `${Math.abs(d).toFixed(1)} mo ${d > 0 ? 'longer' : 'shorter'}`
  return { kind: good ? 'better' : 'worse', text: `${good ? '▲ better' : '▼ worse'} · ${size}` }
}

export function VsFinland({ cmp }: { cmp?: Cmp }) {
  if (!cmp) return <span className="text-[12px] opacity-45">for context</span>
  const v = vsFinland(cmp)
  return (
    <span className={cx('inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[12.5px] font-medium',
      v.kind === 'better' ? 'bg-[#E2EDE6] text-[#2F5A44]' : v.kind === 'worse' ? 'bg-terra/15 text-[#9A3F22]' : 'border border-black/25 opacity-75')}>
      {v.text}
    </span>
  )
}
