// Section 1: the chain and where it leaks. Three steps against the national figure; people lost at each.
import type { ReactNode } from 'react'
import { Card, Label, SourceBadge, cx } from '../../components/ui'
import { SCREENING, SCREENING_FI, rankIn, trend, type ScreeningRow } from './data'
import { STEP_META, THRESHOLDS, flags, losses, n0, n1, type Step } from './model'

const SRC = <SourceBadge id="bowelScreening2024" kind="direct" demo={false} />
const SRC_ROUNDS = <SourceBadge id="bowelScreeningRounds" kind="direct" demo={false} />

/** Three rounds as a tiny line plus the three numbers. */
function Trend({ id, k }: { id: string; k: 'participationPct' | 'colonoscopyOfPositivesPct' }) {
  const t = trend(id)
  if (t.length < 2) return null
  const vs = t.map((p) => p[k])
  const lo = Math.min(...vs) - 1, hi = Math.max(...vs) + 1
  const W = 54, H = 18
  const pts = vs.map((v, i) => `${(i / (vs.length - 1)) * W},${H - ((v - lo) / (hi - lo)) * H}`).join(' ')
  return (
    <div className="mt-3 flex items-center gap-3 font-type text-[13px] tracking-wider" aria-label={`Trend: ${t.map((p) => `${p.year} ${n1(p[k])}%`).join(', ')}`}>
      <svg width={W} height={H} className="overflow-visible shrink-0" aria-hidden>
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" opacity={0.8} />
        {vs.map((v, i) => <circle key={i} cx={(i / (vs.length - 1)) * W} cy={H - ((v - lo) / (hi - lo)) * H} r={i === vs.length - 1 ? 2.6 : 1.8} fill="currentColor" />)}
      </svg>
      <span className="flex flex-wrap gap-x-2.5 opacity-80">
        {t.map((p) => <span key={p.year}><span className="opacity-60">{p.year}</span> {n1(p[k])}</span>)}
      </span>
      {SRC_ROUNDS}
    </div>
  )
}

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

/** What the three rounds say about colonoscopy after a positive test. */
function TrendNote({ r }: { r: ScreeningRow }) {
  const fi = trend('finland')
  const ranks = [2022, 2023, 2024].map((y) => rankIn(y, r.id, 'colonoscopyOfPositivesPct'))
  const of = ranks[0].of
  return (
    <p className="mt-2 font-sans text-[15px] opacity-70 max-w-4xl">
      Colonoscopy after a positive test, nationally: {fi.map((p, i) => <span key={p.year}>{i ? (i === fi.length - 1 ? ' and ' : ', ') : ''}{n1(p.colonoscopyOfPositivesPct)}% ({p.year})</span>)}.
      {' '}So the 2024 figure is probably partly reports still to come in. {r.name} placed {ranks.map((x) => ord(x.rank)).join(', ').replace(/, ([^,]*)$/, ' and $1')} of {of} counties in 2022, 2023 and 2024 (1st = highest).
    </p>
  )
}


/** The one-sentence diagnosis at the top of the page. Built from the numbers only. */
export function headline(r: ScreeningRow): ReactNode {
  const f = flags(r)
  const l = losses(r)
  const parts: ReactNode[] = []
  if (f.referral) parts.push(<><span className="italic text-terra">{n0(r.noColonoscopy)} people</span> tested positive and never had a colonoscopy.</>)
  if (f.capacity) parts.push(<>{f.referral ? 'Those who did waited' : 'People who test positive wait'} <span className="italic text-terra">{n1(r.medianMonths)} months</span>, against {n1(SCREENING_FI.medianMonths)} nationally.</>)
  if (f.detection) parts.push(<><span className="italic text-terra">{n0(l.detection.lost)}</span> of {n0(r.invited)} invited never sent the kit back.</>)
  if (!parts.length) {
    // nothing flagged: name the step furthest from the national figure
    const gaps = [
      { s: 'detection', g: (SCREENING_FI.participationPct - r.participationPct) / SCREENING_FI.participationPct },
      { s: 'referral', g: (SCREENING_FI.colonoscopyOfPositivesPct - r.colonoscopyOfPositivesPct) / SCREENING_FI.colonoscopyOfPositivesPct },
      { s: 'capacity', g: (r.medianMonths - SCREENING_FI.medianMonths) / SCREENING_FI.medianMonths },
    ].sort((a, b) => b.g - a.g)[0]
    return <>No step is below the line in {r.name}. {gaps.g > 0
      ? <>Closest to it: <span className="italic">{STEP_META[gaps.s as Step].short.toLowerCase()}</span>, still {n0(gaps.s === 'detection' ? l.detection.lost : gaps.s === 'referral' ? r.noColonoscopy : l.capacity.lost)} people.</>
      : <>Every step is at or better than the national figure.</>}</>
  }
  return <>{parts.map((p, i) => <span key={i}>{p} </span>)}</>
}

function Bar({ v, fi, line, max, invert }: { v: number; fi: number; line: number; max: number; invert?: boolean }) {
  const pc = (x: number) => `${Math.min(100, (x / max) * 100)}%`
  return (
    <div className="relative h-2 rounded-full bg-black/10 mt-4 mb-6">
      <div className="absolute inset-y-0 left-0 rounded-full bg-current opacity-90" style={{ width: pc(v) }} />
      <div className="absolute -top-1.5 -bottom-1.5 w-px bg-current opacity-60" style={{ left: pc(fi) }} />
      <span className="absolute top-3 -translate-x-1/2 font-type text-[13px] uppercase tracking-wider opacity-70 whitespace-nowrap" style={{ left: pc(fi) }}>FI</span>
      <div className="absolute -top-1 -bottom-1 w-0 border-l border-dashed border-current opacity-50" style={{ left: pc(line) }} title={invert ? 'flag above this' : 'flag below this'} />
    </div>
  )
}

function StepCard({ step, r }: { step: Step; r: ScreeningRow }) {
  const weak = flags(r)[step]
  const l = losses(r)[step]
  const m = STEP_META[step]
  const fi = SCREENING_FI
  const val = step === 'detection' ? r.participationPct : step === 'referral' ? r.colonoscopyOfPositivesPct : r.medianMonths
  const nat = step === 'detection' ? fi.participationPct : step === 'referral' ? fi.colonoscopyOfPositivesPct : fi.medianMonths
  const unit = step === 'capacity' ? 'months' : '%'
  const lostText = step === 'detection' ? 'invited never returned the kit'
    : step === 'referral' ? 'positives never had a colonoscopy'
    : 'people waiting at any time (est.)'
  const vsText = step === 'capacity' ? `more than a ${n1(fi.medianMonths)}-month wait would hold` : 'more than at the national rate'
  return (
    <Card tone={weak ? 'terra' : 'paper'} className="p-5 sm:p-6 flex flex-col min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="!opacity-70">{m.n} · {m.who}</Label>
          <p className="font-serif text-2xl leading-tight mt-1">{m.title}</p>
        </div>
        <span className={cx('font-type text-[13px] uppercase tracking-widest px-2 py-1 rounded-full border shrink-0', weak ? 'border-paper/60' : 'border-black/20 opacity-70')}>
          {weak ? 'Leaks' : 'Holds'}
        </span>
      </div>
      <p className="mt-4 font-serif text-6xl leading-none flex items-baseline gap-2">
        {n1(val)}<span className="font-type text-sm opacity-70">{unit}</span>{SRC}
      </p>
      <p className="font-type text-sm uppercase tracking-wider opacity-75 mt-1">Finland {n1(nat)}{unit === '%' ? '%' : ' mo'}</p>
      {step !== 'capacity' && <Trend id={r.id} k={step === 'detection' ? 'participationPct' : 'colonoscopyOfPositivesPct'} />}
      <Bar v={val} fi={nat} line={THRESHOLDS[step]} max={step === 'capacity' ? 4.5 : 100} invert={step === 'capacity'} />
      <div className={cx('mt-auto pt-3 border-t', weak ? 'border-paper/30' : 'border-black/10')}>
        <p className="font-serif text-3xl leading-none">{n0(l.lost)}</p>
        <p className="font-sans text-[15px] leading-snug opacity-85 mt-1">{lostText}</p>
        {l.vsNational >= 0.5 && <p className="font-type text-sm uppercase tracking-wider mt-2 opacity-90">{n0(l.vsNational)} {vsText}</p>}
      </div>
    </Card>
  )
}

export function Chain({ r }: { r: ScreeningRow }) {
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4 lg:gap-5 relative">
        {(['detection', 'referral', 'capacity'] as Step[]).map((s) => <StepCard key={s} step={s} r={r} />)}
      </div>
      {/* the funnel, as counts */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2 font-type text-sm uppercase tracking-wider">
        {[
          [r.invited, 'invited'], [r.participated, 'returned kit'], [r.testPositive, 'tested positive'],
          [r.colonoscopyDone, 'colonoscopy'], [r.cancers, 'cancers found'], [r.precursors, 'precursors found'],
        ].map(([v, t], i) => (
          <span key={t} className="flex items-baseline gap-2">
            {i > 0 && <span className="opacity-40">{i === 5 ? '+' : '→'}</span>}
            <span className="font-serif text-2xl normal-case tracking-normal">{n0(v as number)}</span>
            <span className="opacity-70">{t}</span>
          </span>
        ))}
        <span className="ml-1">{SRC}</span>
      </div>
      <p className="mt-2 font-sans text-[15px] opacity-70">
        Red when kit return &lt; {THRESHOLDS.detection}%, colonoscopy after a positive test &lt; {THRESHOLDS.referral}%, or median wait &gt; {THRESHOLDS.capacity} months. Dashed tick = that line.
      </p>
      <TrendNote r={r} />
    </div>
  )
}

/** Evidence: how the two steps with a history changed over three rounds, and where the county ranks. No repeat of the tiles. */
export function HowItChanged({ r }: { r: ScreeningRow }) {
  const t = trend(r.id)
  const fi = trend('finland')
  const rank = (k: 'participationPct' | 'colonoscopyOfPositivesPct') => rankIn(2024, r.id, k)
  const waitSorted = [...SCREENING].sort((a, b) => a.medianMonths - b.medianMonths)
  const waitRank = waitSorted.findIndex((x) => x.id === r.id) + 1
  const rows: { label: string; vals: (string | null)[]; fi: string; rank: string }[] = [
    { label: 'Sent the kit back', vals: t.map((p) => `${n1(p.participationPct)}%`), fi: `${n1(SCREENING_FI.participationPct)}%`, rank: `${ord(rank('participationPct').rank)} of ${rank('participationPct').of}` },
    { label: 'Had the follow-up colonoscopy', vals: t.map((p) => `${n1(p.colonoscopyOfPositivesPct)}%`), fi: `${n1(SCREENING_FI.colonoscopyOfPositivesPct)}%`, rank: `${ord(rank('colonoscopyOfPositivesPct').rank)} of ${rank('colonoscopyOfPositivesPct').of}` },
    { label: 'Wait for the colonoscopy', vals: [null, null, `${n1(r.medianMonths)} months`], fi: `${n1(SCREENING_FI.medianMonths)} months`, rank: `${ord(waitRank)} of ${waitSorted.length}` },
  ]
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] font-sans text-[15px] border-collapse">
          <thead>
            <tr className="text-left text-[13px] opacity-60">
              <th className="font-normal py-2 pr-4">{r.name}</th><th className="font-normal">2022</th><th className="font-normal">2023</th><th className="font-normal">2024</th>
              <th className="font-normal">Finland 2024</th><th className="font-normal">Rank 2024</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.label} className="border-t border-black/10">
                <td className="py-3 pr-4">{x.label}</td>
                {x.vals.map((v, i) => <td key={i} className={cx('font-serif text-xl', i === 2 && 'text-terra')}>{v ?? <span className="opacity-30">·</span>}</td>)}
                <td className="opacity-70">{x.fi}</td>
                <td className="opacity-70">{x.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 font-sans text-[15px] leading-relaxed opacity-80 max-w-4xl">
        Rank 1 is the best county. In 2024, of {n0(r.invited)} people invited in {r.name}, {n0(r.testPositive)} tested positive, {n0(r.colonoscopyDone)} had the colonoscopy and {n0(r.cancers)} cancers were found.
        {' '}Nationally, follow-up after a positive test fell from {n1(fi[1]?.colonoscopyOfPositivesPct ?? 0)}% in 2023 to {n1(SCREENING_FI.colonoscopyOfPositivesPct)}% in 2024, so the 2024 figures are probably partly reports that had not come in yet.
        {' '}Waits were only published for 2024.
      </p>
      <p className="mt-2 font-sans text-[13px] opacity-55 flex items-center gap-2">Source: Finnish Cancer Registry, bowel cancer screening statistics 2022, 2023 and 2024. {SRC_ROUNDS}</p>
    </div>
  )
}
