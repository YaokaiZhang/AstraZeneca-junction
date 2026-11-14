// 3.5 County action brief: biggest gap, where it happens, three ranked actions. Printable.
import type { ReactNode } from 'react'
import { Btn, Display, Label, SourceBadge, cx } from '../../components/ui'
import { COUNTIES, type County, type RadarCancerId } from '../../data/counties'
import { RISK, cancerLabel, fmt, metricValue, national, overloadYear, pct, projection, queueRising, queueSlope, radarFor, stepInfo, weakestSentence, NAT, type StepId } from './model'
import { stepBadge } from './Radar'
import { PROGRAMMES, TOWNS, fitModel, verdict, type Programme } from './towns'

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
export interface BriefData {
  actions: Action[]
  top: Action
  stamp: string
  /** biggest gap, from the detection radar (3.1): the weakest step for the chosen cancer */
  gap: { cancer: RadarCancerId; step: StepId; text: string; why: string; stages: Stage[]; badge: ReactNode }
  stats: { label: string; value: string; badge: ReactNode }[]
}

/** Where each radar step sits on the care-pathway strip. */
const STEP_STAGES: Record<StepId, Stage[]> = {
  risk: ['Screening', 'Visit'],
  screen: ['Screening'],
  late: ['Visit', 'Referral', 'Scan', 'Diagnosis'],
  survival: ['Planning', 'Treatment'],
}
/** Which action answers which weakest step (gets a bonus in the ranking). */
const STEP_ACTION = (step: StepId, k: RadarCancerId): string =>
  step === 'risk' ? (k === 'lung' ? 'lung' : 'risk')
  : step === 'screen' ? 'remind'
  : step === 'late' ? (k === 'lung' ? 'lung' : k === 'pancreas' || k === 'liver' ? 'fast' : 'remind')
  : 'diag'

const FITS = { bowel: fitModel('bowel'), breast: fitModel('breast'), cervical: fitModel('cervical') } as const
const natGrowth = COUNTIES.reduce((s, c) => { const p = projection(c, 'all'); return s + p[10] / p[0] - 1 }, 0) / COUNTIES.length

export function buildBrief(c: County, k: RadarCancerId): BriefData {
  const natLate = national('lung', 'late')
  const lungLate = c.cancers.lung.lateShare
  const rad = radarFor(c, k)
  const lungRad = radarFor(c, 'lung')
  const weak = stepInfo(rad.weakest)
  // reminder action targets the programme of the chosen cancer (bowel when it has none)
  const prog: Programme = (PROGRAMMES.find((p) => p.id === k)?.id ?? 'bowel')
  const progLabel = PROGRAMMES.find((p) => p.id === prog)!.label
  const fit = FITS[prog]
  const turnout = prog === 'bowel' ? c.bowelTurnout : prog === 'breast' ? c.breastTurnout : c.cervicalTurnout
  const natTurnout = prog === 'bowel' ? NAT.bowelTurnout : prog === 'breast' ? NAT.breastTurnout : NAT.cervicalTurnout
  const helpTowns = TOWNS.filter((t) => t.county === c.id && verdict(t.turnout[prog], fit.predicted.get(t.id)!, fit.sd) === 'help')
  const lowTowns = [...TOWNS.filter((t) => t.county === c.id)]
    .sort((a, b) => (a.turnout[prog] - fit.predicted.get(a.id)!) - (b.turnout[prog] - fit.predicted.get(b.id)!))
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
      detail: `${fmt(lungRad.highRisk)} high-risk people ${RISK.lung.ages} · start with the self-check, then CT`,
      why: `Late stage ${pct(lungLate)} vs FI ${pct(natLate)} · smoking ${c.smoking}% vs ${fmt(NAT.smoking, 1)}%`,
      gap: `Lung cancer found late: ${pct(lungLate)}`, stamp: 'Late lung', stages: ['Screening', 'Visit'],
      badge: <SourceBadge id="ourModel" kind="estimate" demo={false} how="Rule: spread share (non-localized, of known stage) above national + smoking above national. High-risk count from the detection radar (population 50–74 × smoking prevalence)." />,
    },
    {
      id: 'remind', score: (natTurnout - turnout) / 2 + helpTowns.length * 0.8,
      title: 'Reminder + second kit',
      detail: helpTowns.length ? `Start in ${helpTowns.map((t) => t.name).join(', ')}` : `Start in ${lowTowns.slice(0, 2).map((t) => t.name).join(', ')}`,
      why: `${progLabel} turnout ${turnout}% vs FI ${fmt(natTurnout, 1)}%${helpTowns.length ? ` · ${helpTowns.length} town${helpTowns.length > 1 ? 's' : ''} below prediction` : ''}`,
      gap: `${progLabel} screening turnout: ${turnout}%`, stamp: 'Low turnout', stages: ['Screening'],
      badge: <SourceBadge id="sotkanetScreening" kind="estimate" demo={false} how={`Rule: turnout below national + towns more than 1.5 SD below the model (${fit.formula}).`} />,
    },
    {
      id: 'risk', score: rad.steps.risk.z! * 1.2,
      title: 'Find the high-risk people',
      detail: `${fmt(rad.highRisk)} ${RISK[k].who} at high risk for ${cancerLabel(k).toLowerCase()} · self-check in the app, then a doctor visit`,
      why: `${pct(rad.steps.risk.v!)} of ${RISK[k].who} at risk vs FI ${pct(rad.steps.risk.nat!)}`,
      gap: `Many at high risk: ${fmt(rad.highRisk)}`, stamp: 'Many at risk', stages: ['Screening', 'Visit'],
      badge: stepBadge('risk', k, rad),
    },
    {
      id: 'diag', score: (slope ?? 0) / 5 + (growth - natGrowth) / 0.04 + (oy ? (2036 - oy) / 4 : 0),
      title: 'Add diagnostic capacity',
      detail: `Scan + specialist slots for ${growth >= 0 ? '+' : '−'}${pct(Math.abs(growth))} cases by 2035${oy ? ` · overload ${oy}` : ''}`,
      why: c.queueTrend ? `Waited > 6 months ${fmt(c.queueTrend[0], 1)} → ${fmt(c.queueTrend[3], 1)} per 10k, 2022–25` : 'Waiting-list trend not published for this county',
      gap: `Queue ${slope == null ? 'unknown' : queueRising(c) ? 'rising' : 'not rising'}, cases ${growth >= 0 ? '+' : '−'}${pct(Math.abs(growth))} by 2035`, stamp: oy ? `Overload ${oy}` : queueRising(c) ? 'Queue rising' : 'Capacity',
      stages: ['Referral', 'Scan', 'Diagnosis'],
      badge: <SourceBadge id="ourModel" kind="estimate" demo={false} how="Rule: rising specialist waiting list (Sotkanet 3336, 2022–25 trend) + ageing projection (Statistics Finland 14wx) above the county average." />,
    },
    {
      id: 'fast', score: plFat / 0.04,
      title: 'Fast-track for vague symptoms',
      detail: 'Direct CT referral from health centres for weight loss + new diabetes / jaundice',
      why: `Pancreas + liver deaths÷cases ${plFat >= 0 ? '+' : '−'}${fmt(Math.abs(plFat) * 100, 0)} pts vs FI`,
      gap: 'Pancreas & liver found too late', stamp: 'Fatal late', stages: ['Visit', 'Referral'],
      badge: <SourceBadge id="ourModel" kind="estimate" demo={false} how="Rule: Cancer Registry deaths ÷ cases 2020–24 above national for pancreas and liver." />,
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
  // the radar's weakest step decides the first action; the rest keep their own ranking
  const match = STEP_ACTION(rad.weakest, k)
  const best = Math.max(...actions.map((a) => a.score))
  for (const a of actions) if (a.id === match) a.score = best + 1
  actions.sort((a, b) => b.score - a.score)
  const top3 = actions.slice(0, 3)
  return {
    actions: top3,
    top: top3[0],
    stamp: weak.stamp,
    gap: {
      cancer: k, step: rad.weakest, stages: STEP_STAGES[rad.weakest],
      text: `${cancerLabel(k)}: biggest gap at step ${weak.n}, ${weak.label.toLowerCase()}`,
      why: weakestSentence(rad, k),
      badge: stepBadge(rad.weakest, k, rad),
    },
    stats: [
      { label: `High risk · ${cancerLabel(k)}`, value: fmt(rad.highRisk), badge: stepBadge('risk', k, rad) },
      { label: 'Residents', value: fmt(c.population), badge: <SourceBadge id="statfinProjection" kind="direct" demo={false} how="Residents in 2025, population projection 2024 (table 14wx)" /> },
      { label: 'Lung spread', value: pct(lungLate), badge: <SourceBadge id="cancerRegistry" kind="direct" demo={false} how={`Non-localized share of lung cases with known stage, 2021–25 (preliminary). Stage unknown for ${pct(c.cancers.lung.unknownStage)}.`} /> },
      { label: 'Lung deaths / case', value: fmt(metricValue(c, 'lung', 'fatality').v, 2), badge: <SourceBadge id="ourModel" kind="estimate" demo={false} how="Cancer Registry deaths ÷ new cases, 2020–24" /> },
      { label: 'Bowel turnout', value: `${c.bowelTurnout}%`, badge: <SourceBadge id="sotkanetScreening" kind="direct" demo={false} how="2024, share of invited who attended (Sotkanet 6103)" /> },
      { label: 'Cases 2035', value: `${growth >= 0 ? '+' : '−'}${pct(Math.abs(growth))}`, badge: <SourceBadge id="ourModel" kind="estimate" demo={false} how="Cancer Registry cases 2020–24 × the change in people under and over 75 to 2035 (Statistics Finland 14wx), all four cancers." /> },
    ],
  }
}

export function Brief({ brief, county, print }: { brief: BriefData; county: County; print?: boolean }) {
  const hot = new Set(brief.gap.stages)
  return (
    <div className={cx('p-6 sm:p-10', print ? 'text-ink' : 'pt-16')} style={print ? { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } : undefined}>
      <Display a={county.name} b="in brief" className="!text-4xl sm:!text-5xl break-words" />

      <div className={cx('mt-8 rounded-lg p-5 bg-terra text-paper', !print && 'shadow-xl -rotate-1')}>
        <p className="font-serif text-3xl leading-tight">{brief.gap.text}</p>
        <p className="font-type text-[15px] uppercase tracking-wider mt-2 flex flex-wrap items-center gap-2 opacity-90">{brief.gap.why.replace(/^[^:]+:\s*/, '')} {brief.gap.badge}</p>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-7 gap-1">
          {STRIP.map((s) => (
            <div key={s} className="min-w-0">
              <div className={cx('h-2 rounded-full', hot.has(s) ? 'bg-terra' : 'bg-black/10')} />
              <p className={cx('font-type text-sm uppercase tracking-wide mt-1 truncate', hot.has(s) ? '' : 'opacity-70')}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="tear mt-6 pt-5">
        <Label>Do next</Label>
        <ol className="mt-3 space-y-4">
          {brief.actions.map((a, i) => (
            <li key={a.id} className="flex gap-4">
              <span className={cx('w-9 h-9 rounded-full flex items-center justify-center font-serif text-lg shrink-0', i === 0 ? 'bg-ink text-mustard' : 'border border-ink')}>{i + 1}</span>
              <div className="min-w-0">
                <p className="font-serif text-2xl leading-tight flex items-center gap-2">{a.title} {a.badge}</p>
                <p className="font-type text-sm mt-1 opacity-80">{a.detail}</p>
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

      {!print && (
        <div className="tear mt-6 pt-4 flex justify-end">
          <Btn onClick={() => window.print()}>Print brief</Btn>
        </div>
      )}
    </div>
  )
}
