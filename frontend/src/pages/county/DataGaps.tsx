// 3.4 Missing-data map and starter plan.
import { useEffect, useState } from 'react'
import { Card, Display, Label, SourceBadge, cx, toast } from '../../components/ui'
import { CANCERS, countyById } from '../../data/counties'
import { PATHWAY, type StepId } from '../../data/pathway'
import type { SourceKind } from '../../data/sources'
import { useStore } from '../../lib/store'
import { baseRecords, fmt, pct } from './model'
import type { TabProps } from './index'

type Cell = { k: SourceKind | 'na'; src?: string; how?: string }
const COLS = ['How many', 'How long', 'By county']
const ROWS: { stage: string; cells: Cell[] }[] = [
  { stage: 'Screening', cells: [{ k: 'direct', src: 'sotkanetScreening' }, { k: 'na' }, { k: 'direct', src: 'sotkanetScreening' }] },
  { stage: 'First visit', cells: [{ k: 'estimate', src: 'ourModel', how: 'Primary-care visits are counted, not by suspected cancer.' }, { k: 'gap', src: 'waitGap' }, { k: 'estimate', src: 'ourModel' }] },
  { stage: 'Referral', cells: [{ k: 'estimate', src: 'sotkanetQueue', how: 'All specialist referrals; not cancer-specific.' }, { k: 'gap', src: 'waitGap' }, { k: 'estimate', src: 'sotkanetQueue' }] },
  { stage: 'Scan', cells: [{ k: 'estimate', src: 'sotkanetQueue' }, { k: 'estimate', src: 'sotkanetQueue', how: 'Only “waiting > 90 days” for all specialties.' }, { k: 'direct', src: 'sotkanetQueue' }] },
  { stage: 'Diagnosis', cells: [{ k: 'direct', src: 'cancerRegistry' }, { k: 'gap', src: 'waitGap' }, { k: 'direct', src: 'cancerRegistry' }] },
  { stage: 'Planning', cells: [{ k: 'gap', src: 'waitGap' }, { k: 'gap', src: 'waitGap' }, { k: 'gap', src: 'waitGap' }] },
  { stage: 'Treatment', cells: [{ k: 'estimate', src: 'cancerRegistry', how: 'Registry records first treatment type, not its date.' }, { k: 'gap', src: 'waitGap' }, { k: 'gap', src: 'waitGap' }] },
  { stage: 'Survival', cells: [{ k: 'direct', src: 'nordcan' }, { k: 'na' }, { k: 'estimate', src: 'ourModel', how: 'Deaths ÷ cases; official survival only for 5 regions.' }] },
]
const CELL_CLS: Record<SourceKind | 'na', string> = {
  direct: 'bg-ink text-paper',
  estimate: 'bg-mustard text-ink',
  gap: 'bg-terra text-paper',
  mentor: 'bg-moss text-paper',
  na: 'bg-transparent text-ink/30 border border-dashed border-black/15',
}
const CELL_TXT: Record<SourceKind | 'na', string> = { direct: 'Direct', estimate: 'Estimate', gap: 'Gap', mentor: 'Mentor', na: '—' }

const PLAN: { id: StepId; label: string }[] = [
  { id: 'referral', label: 'Referral received' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'treatment', label: 'Treatment start' },
]
const LS = 'county-starter-v1'
function loadPlan(): Record<string, StepId[]> {
  try { return JSON.parse(localStorage.getItem(LS) ?? '{}') } catch { return {} }
}

export function DataGaps({ countyId }: TabProps) {
  const county = countyById(countyId)!
  const [plan, setPlan] = useState<Record<string, StepId[]>>(loadPlan)
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(plan)) } catch { /* private mode */ } }, [plan])
  const ticked = plan[countyId] ?? []
  const toggle = (id: StepId) => {
    const next = ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id]
    setPlan({ ...plan, [countyId]: next })
    if (next.length === 3 && ticked.length === 2) toast(`${county.name}: plan ready`)
  }

  const stats = useStore((s) => s.sharing.stats)
  const dates = useStore((s) => s.pathway.dates)
  const myCounty = useStore((s) => s.profile.county)
  const hasDates = Object.values(dates).some(Boolean)
  const you = stats && hasDates && (!myCounty || myCounty === countyId)
  const records = baseRecords(county) + (you ? 1 : 0)
  const yearlyCases = CANCERS.reduce((s, c) => s + county.cancers[c.id].cases, 0)

  const target = PATHWAY.filter((s) => ['scan', 'diagnosis', 'mdt', 'treatment'].includes(s.id)).reduce((s, x) => s + (x.targetDays ?? 0), 0)
  const gi = PATHWAY.findIndex((s) => s.id === 'referral'), ge = PATHWAY.findIndex((s) => s.id === 'treatment')

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="What we" b="don’t count" />
      </div>

      {/* the big gap */}
      <Card tone="terra" tilt={-1} className="clip relative mt-8 p-6 sm:p-8">
        <p className="font-serif text-4xl sm:text-5xl leading-[0.95]">Referral<span className="italic"> → treatment</span></p>
        <p className="font-type text-[13px] uppercase tracking-wider mt-3 flex items-center gap-2 opacity-90">No public waiting time <SourceBadge id="waitGap" kind="gap" /></p>
        {/* pathway strip */}
        <div className="mt-8 grid grid-cols-6 gap-1 sm:gap-2">
          {PATHWAY.map((s, i) => {
            const inGap = i > gi && i <= ge
            return (
              <div key={s.id} className="min-w-0">
                <div className={cx('h-2 rounded-full', inGap ? 'bg-paper/25 border border-dashed border-paper' : 'bg-paper')} />
                <p className={cx('font-type text-[11px] sm:text-xs uppercase tracking-wider mt-2 truncate', !inGap && 'opacity-70')}>{s.short}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <Label className="!opacity-80">Target</Label>
            <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-2">≈ {target} d <SourceBadge id="thlTargets" kind="estimate" how={`Sum of step targets scan → treatment: ${PATHWAY.filter((s) => ['scan', 'diagnosis', 'mdt', 'treatment'].includes(s.id)).map((s) => s.targetDays).join(' + ')} days (to verify). Strategy goal 3 sets the target.`} /></p>
          </div>
          <div>
            <Label className="!opacity-80">Measured</Label>
            <p className="font-serif text-4xl leading-none mt-1 italic">nothing</p>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start">
        {/* measure grid */}
        <Card tone="stone" tilt={0.5} className="p-4 sm:p-6 min-w-0">
          <div className="grid grid-cols-[minmax(0,6rem)_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2 items-center">
            <span />
            {COLS.map((c) => <span key={c} className="label text-center !text-[11px]">{c}</span>)}
            {ROWS.map((r) => (
              <Row key={r.stage} stage={r.stage} cells={r.cells} hot={r.stage === 'Referral' || r.stage === 'Treatment' || r.stage === 'Diagnosis' || r.stage === 'Planning'} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 font-type text-xs uppercase tracking-wider">
            {(['direct', 'estimate', 'gap'] as const).map((k) => {
              const n = ROWS.flatMap((r) => r.cells).filter((c) => c.k === k).length
              return <span key={k} className={cx('px-2 py-1 rounded-full', CELL_CLS[k])}>{CELL_TXT[k]} {n}</span>
            })}
          </div>
        </Card>

        {/* starter plan */}
        <Card tone="ink" tilt={-1.2} className="relative p-6">
          <p className="font-serif text-4xl leading-none">Record <span className="italic">three dates</span></p>
          <ol className="mt-5 space-y-2">
            {PLAN.map((p, i) => {
              const on = ticked.includes(p.id)
              const mine = !!dates[p.id]
              return (
                <li key={p.id}>
                  <button onClick={() => toggle(p.id)} role="checkbox" aria-checked={on}
                    className="w-full flex items-center gap-3 py-2 border-b border-paper/15 text-left group">
                    <span className={cx('w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors',
                      on ? 'bg-mustard border-mustard text-ink' : 'border-paper/50 group-hover:border-mustard')}>{on ? '✓' : i + 1}</span>
                    <span className={cx('font-serif text-xl flex-1', on && 'line-through decoration-mustard/70')}>{p.label}</span>
                    {mine && <span className="font-type text-[11px] uppercase tracking-wider text-mustard">you ✓</span>}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <Label className="!opacity-70">Shared by patients</Label>
              <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-1.5">
                {fmt(records)} <SourceBadge id="demoPatients" kind="estimate" how="Simulated opt-in records from the patient pathway clock, + 1 if this browser shared its dates for statistics." />
              </p>
              {you && <span className="inline-block mt-2 font-type text-xs uppercase tracking-wider bg-mustard text-ink px-2 py-0.5 rounded-full">+1 you</span>}
            </div>
            <div>
              <Label className="!opacity-70">Of yearly cases</Label>
              <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-1.5">
                {pct(records / yearlyCases, 1)} <SourceBadge id="ourModel" kind="estimate" how={`${fmt(records)} records ÷ ${fmt(yearlyCases)} new lung, bowel, pancreas and liver cases a year`} />
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ stage, cells, hot }: { stage: string; cells: Cell[]; hot?: boolean }) {
  return (
    <>
      <span className={cx('font-serif text-base sm:text-lg leading-tight truncate', hot && 'italic')}>{stage}</span>
      {cells.map((c, i) => (
        <span key={i} className={cx('relative h-9 rounded-md flex items-center justify-center gap-1.5 font-type text-[11px] sm:text-xs uppercase tracking-wider', CELL_CLS[c.k])}>
          {c.k === 'na' ? '—' : c.src && <SourceBadge id={c.src} kind={c.k} how={c.how} className="[&>button]:ring-1 [&>button]:ring-white/70" />}
        </span>
      ))}
    </>
  )
}
