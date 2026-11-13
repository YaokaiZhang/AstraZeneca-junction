// 3.5 County action brief: biggest gap, where it happens, three ranked actions. Printable.
import type { ReactNode } from 'react'
import { Btn, Display, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { COUNTIES, type County } from '../../data/counties'
import { capacity, eur, fmt, metricValue, national, overloadYear, pct, projection, queueSlope, NAT, type CapacityInputs } from './model'
import { TOWNS, fitModel, verdict } from './towns'

const STRIP = ['Screening', 'Visit', 'Referral', 'Scan', 'Diagnosis', 'Planning', 'Treatment'] as const
type Stage = (typeof STRIP)[number]

export interface Action {
  id: string
  score: number
  title: string
  detail: string
  why: string
  gap: string
  stamp: string
  stages: Stage[]
  badge: ReactNode
}
export interface BriefData { actions: Action[]; top: Action; stamp: string; stats: { label: string; value: string; badge: ReactNode }[] }

const bowelFit = fitModel('bowel')
const natGrowth = COUNTIES.reduce((s, c) => { const p = projection(c, 'all'); return s + p[10] / p[0] - 1 }, 0) / COUNTIES.length

export function buildBrief(c: County, cap: CapacityInputs): BriefData {
  const natLate = national('lung', 'late')
  const lungLate = c.cancers.lung.lateShare
  const cp = capacity(c, cap)
  const helpTowns = TOWNS.filter((t) => t.county === c.id && verdict(t.turnout.bowel, bowelFit.predicted.get(t.id)!, bowelFit.sd) === 'help')
  const lowTowns = [...TOWNS.filter((t) => t.county === c.id)]
    .sort((a, b) => (a.turnout.bowel - bowelFit.predicted.get(a.id)!) - (b.turnout.bowel - bowelFit.predicted.get(b.id)!))
  const proj = projection(c, 'all')
  const growth = proj[10] / proj[0] - 1
  const oy = overloadYear(proj, 0.15)
  const slope = queueSlope(c)
  const fat = (k: 'pancreas' | 'liver') => metricValue(c, k, 'fatality').v - national(k, 'fatality')
  const plFat = (fat('pancreas') + fat('liver')) / 2

  const actions: Action[] = [
    {
      id: 'lung', score: (lungLate - natLate) / 0.03 + (c.smoking - NAT.smoking) / 1.5,
      title: 'Lung CT screening pilot',
      detail: `${fmt(cp.eligible)} eligible · ${fmt(cp.ct)} CT/yr · ${eur(cp.cost)}/yr`,
      why: `Late stage ${pct(lungLate)} vs FI ${pct(natLate)} · smoking ${c.smoking}% vs ${fmt(NAT.smoking, 1)}%`,
      gap: `Lung cancer found late: ${pct(lungLate)}`, stamp: 'Late lung', stages: ['Screening', 'Visit'],
      badge: <SourceBadge id="ourModel" kind="estimate" how="Rule: late-stage share above national + smoking above national. Cost from the capacity planner settings." />,
    },
    {
      id: 'bowel', score: (NAT.bowelTurnout - c.bowelTurnout) / 2 + helpTowns.length * 0.8,
      title: 'Reminder + second kit',
      detail: helpTowns.length ? `Start in ${helpTowns.map((t) => t.name).join(', ')}` : `Start in ${lowTowns.slice(0, 2).map((t) => t.name).join(', ')}`,
      why: `Bowel turnout ${c.bowelTurnout}% vs FI ${fmt(NAT.bowelTurnout, 1)}%${helpTowns.length ? ` · ${helpTowns.length} town${helpTowns.length > 1 ? 's' : ''} below prediction` : ''}`,
      gap: `Bowel screening turnout: ${c.bowelTurnout}%`, stamp: 'Low turnout', stages: ['Screening'],
      badge: <SourceBadge id="sotkanetScreening" kind="estimate" how={`Rule: turnout below national + towns more than 1.5 SD below the model (${bowelFit.formula}).`} />,
    },
    {
      id: 'diag', score: slope / 0.4 + (growth - natGrowth) / 0.04 + (oy ? (2036 - oy) / 4 : 0),
      title: 'Add diagnostic capacity',
      detail: `Scan + specialist slots for +${pct(growth)} cases by 2035${oy ? ` · overload ${oy}` : ''}`,
      why: `Queue >90 d ${c.queueTrend[0]} → ${c.queueTrend[3]} /10k`,
      gap: `Queue ${slope > 0 ? 'rising' : 'flat'}, cases +${pct(growth)} by 2035`, stamp: oy ? `Overload ${oy}` : slope > 0 ? 'Queue rising' : 'Capacity',
      stages: ['Referral', 'Scan', 'Diagnosis'],
      badge: <SourceBadge id="ourModel" kind="estimate" how="Rule: rising specialist queue (Sotkanet 3336) + ageing projection above average." />,
    },
    {
      id: 'fast', score: plFat / 0.04,
      title: 'Fast-track for vague symptoms',
      detail: 'Direct CT referral from health centres for weight loss + new diabetes / jaundice',
      why: `Pancreas + liver deaths÷cases ${plFat >= 0 ? '+' : '−'}${fmt(Math.abs(plFat) * 100, 0)} pts vs FI`,
      gap: 'Pancreas & liver found too late', stamp: 'Fatal late', stages: ['Visit', 'Referral'],
      badge: <SourceBadge id="ourModel" kind="estimate" how="Rule: pooled 2020–24 deaths ÷ cases above national for pancreas and liver." />,
    },
    {
      id: 'dates', score: 1.2,
      title: 'Record the three dates',
      detail: 'Referral received · diagnosis · treatment start',
      why: 'No public cancer waiting times',
      gap: 'Referral → treatment time unknown', stamp: 'Data gap', stages: ['Referral', 'Scan', 'Diagnosis', 'Planning', 'Treatment'],
      badge: <SourceBadge id="waitGap" kind="gap" />,
    },
  ]
  actions.sort((a, b) => b.score - a.score)
  const top3 = actions.slice(0, 3)
  return {
    actions: top3,
    top: top3[0],
    stamp: top3[0].stamp,
    stats: [
      { label: 'Residents', value: fmt(c.population), badge: <SourceBadge id="statfinPop" kind="direct" /> },
      { label: 'Lung late', value: pct(lungLate), badge: <SourceBadge id="cancerRegistry" kind="direct" /> },
      { label: 'Lung D/C', value: fmt(metricValue(c, 'lung', 'fatality').v, 2), badge: <SourceBadge id="ourModel" kind="estimate" how="deaths ÷ new cases" /> },
      { label: 'Bowel turnout', value: `${c.bowelTurnout}%`, badge: <SourceBadge id="sotkanetScreening" kind="direct" /> },
      { label: 'Smoking', value: `${c.smoking}%`, badge: <SourceBadge id="sotkanetRisk" kind="direct" /> },
      { label: 'Cases 2035', value: `+${pct(growth)}`, badge: <SourceBadge id="ourModel" kind="estimate" how="Ageing projection, all four cancers" /> },
    ],
  }
}

export function Brief({ brief, county, print }: { brief: BriefData; county: County; print?: boolean }) {
  const hot = new Set(brief.top.stages)
  return (
    <div className={cx('p-6 sm:p-10', print ? 'text-ink' : 'pt-16')} style={print ? { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label>County action brief · 2 min</Label>
          <Display a={county.name} b="in brief" className="!text-4xl sm:!text-5xl mt-2 break-words" />
        </div>
        <Stamp tone="terra" rotate={10} className="mt-2">{brief.stamp}</Stamp>
      </div>

      <div className={cx('mt-8 rounded-lg p-5 bg-terra text-paper', !print && 'shadow-xl -rotate-1')}>
        <Label className="!opacity-80">Biggest gap</Label>
        <p className="font-serif text-3xl leading-tight mt-1">{brief.top.gap}</p>
        <p className="font-type text-[11px] uppercase tracking-wider mt-2 flex items-center gap-2">{brief.top.why} {brief.top.badge}</p>
      </div>

      <div className="mt-6">
        <Label>Where in the pathway</Label>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {STRIP.map((s) => (
            <div key={s} className="min-w-0">
              <div className={cx('h-2 rounded-full', hot.has(s) ? 'bg-terra' : 'bg-black/10')} />
              <p className={cx('font-type text-[8px] sm:text-[9px] uppercase tracking-wide mt-1 truncate', hot.has(s) ? '' : 'opacity-50')}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="tear mt-6 pt-5">
        <Label>Three actions, ranked</Label>
        <ol className="mt-3 space-y-4">
          {brief.actions.map((a, i) => (
            <li key={a.id} className="flex gap-4">
              <span className={cx('w-9 h-9 rounded-full flex items-center justify-center font-serif text-lg shrink-0', i === 0 ? 'bg-ink text-mustard' : 'border border-ink')}>{i + 1}</span>
              <div className="min-w-0">
                <p className="font-serif text-2xl leading-tight flex items-center gap-2">{a.title} {a.badge}</p>
                <p className="font-type text-xs mt-1">{a.detail}</p>
                <p className="font-type text-[10px] uppercase tracking-wider opacity-60 mt-1">{a.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="tear mt-6 pt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {brief.stats.map((s) => (
          <div key={s.label}>
            <Label>{s.label}</Label>
            <p className="font-serif text-2xl leading-none mt-1 flex items-center gap-1.5">{s.value}{s.badge}</p>
          </div>
        ))}
      </div>

      <div className="tear mt-6 pt-4 flex items-center justify-between gap-4">
        <span className="font-type text-[9px] uppercase tracking-wider opacity-60">Demo values · county totals only</span>
        {!print && <Btn onClick={() => window.print()}>Print brief</Btn>}
      </div>
    </div>
  )
}
