// 3.1 Detection radar (county side): follow people along four steps (at risk → screened → found late →
// survival) and mark the step where each county loses the most. Tile map + county funnel + ranked list + towns.
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Display, SourceBadge, cx } from '../../components/ui'
import { countyById, type RadarCancerId } from '../../data/counties'
import { Legend, Seg } from './bits'
import { TileMap } from './TileMap'
import {
  POOL_YEARS, RADAR_CANCERS, REAL_RANGE, RISK, STEPS, figures, fmt, formatStep, pct, periodLabel,
  radar, scaleColor, stepInfo, type RadarRow, type StepId,
} from './model'
import { PROGRAMMES, TOWNS } from './towns'
import type { TabProps } from './index'

type ColorBy = 'weakest' | StepId

/** Source badge for one step of one cancer. */
export function stepBadge(s: StepId, k: RadarCancerId, row?: RadarRow) {
  const pooled = POOL_YEARS[k] > 1 ? ` Counts pooled over ${POOL_YEARS[k]} years.` : ''
  const R = RISK[k]
  if (s === 'risk') return (
    <SourceBadge id="sotkanetRisk" kind="estimate"
      how={<>high-risk people = residents (Statistics Finland) × share who are {R.who} × prevalence of {R.factor} (THL Sotkanet 4404, 4411, 4459, 5527).{row ? <><br /><br />{fmt(row.bandPop)} × {pct(row.steps.risk.v!, 1)} = {fmt(row.highRisk)}</> : null}</>} />
  )
  if (s === 'screen') {
    const p = PROGRAMMES.find((x) => x.id === row?.programme || x.id === k)
    if (!p) return <SourceBadge id="screeningRules" kind="gap" how="Finland has no national screening programme for this cancer. Lung CT screening exists only as research pilots." />
    return <SourceBadge id="sotkanetScreening" kind="direct" how={`Share of invited ${R.who} who took part (Sotkanet ${p.indicator}). Missed vs FI = invited × (FI turnout − county turnout).`} />
  }
  if (s === 'late') return <SourceBadge id="cancerRegistry" kind="direct" how={`Share of new cases found at stage III–IV. Extra late vs FI = cases × (county share − FI share).${pooled}`} />
  return <SourceBadge id="ourModel" kind="estimate" how={`deaths (Statistics Finland) ÷ new cases (Cancer Registry). Survival stand-in: official survival exists only for 5 large regions.${pooled}`} />
}

const weakBadge = (
  <SourceBadge id="ourModel" kind="estimate"
    how="Each step is scored against the other 21 counties (standard score, worse = higher). The weakest step is the one with the highest score. Small pooled counts with a wide 95% range count half. Steps without a screening programme are skipped." />
)

/** z → 0..1 for the paper → mustard → terra scale. */
const zt = (z: number | null) => (z == null ? 0 : Math.max(0, Math.min(1, (z + 1.5) / 3.5)))

export function Radar({ countyId, radarCancer: k, setRadarCancer, openBrief, select }: TabProps) {
  const [colorBy, setColorBy] = useState<ColorBy>('weakest')
  const rows = useMemo(() => radar(k), [k])
  const byId = useMemo(() => new Map(rows.map((r) => [r.c.id, r])), [rows])
  const sorted = useMemo(() => [...rows].sort((a, b) => b.weakZ - a.weakZ), [rows])
  const me = byId.get(countyId)!
  const hasProg = me.programme != null
  const by: ColorBy = colorBy === 'screen' && !hasProg ? 'weakest' : colorBy
  const pooled = POOL_YEARS[k] > 1

  return (
    <div>
      <Display a="Where people" b="fall through" />

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Seg items={RADAR_CANCERS} value={k} onChange={setRadarCancer} />
        {pooled && <span className="font-type text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-ink text-paper">{periodLabel(k)}</span>}
      </div>

      <Funnel row={me} k={k} />

      <div className="mt-12 flex flex-wrap items-center gap-2">
        <Seg items={[{ id: 'weakest' as ColorBy, label: 'Weakest step' }, ...STEPS.filter((s) => hasProg || s.id !== 'screen').map((s) => ({ id: s.id as ColorBy, label: `${s.n} ${s.short}` }))]}
          value={by} onChange={setColorBy} />
      </div>

      <div className="mt-5 grid md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        <Card tilt={-1} className="p-4 sm:p-5 max-w-[320px] w-full mx-auto md:mx-0">
          <div className="flex justify-end mb-1">{by === 'weakest' ? weakBadge : stepBadge(by, k)}</div>
          <TileMap
            selected={countyId}
            onSelect={openBrief}
            style={(c) => {
              const r = byId.get(c.id)!
              if (by === 'weakest') return { fill: scaleColor(zt(r.weakZ)), label: String(stepInfo(r.weakest).n) }
              const s = r.steps[by]
              return { fill: scaleColor(zt(s.z)), label: tileLabel(by, s.v), faded: s.wide }
            }}
            tooltip={(c) => {
              const r = byId.get(c.id)!
              return (
                <>
                  <span className="block text-mustard text-sm">Weakest: {stepInfo(r.weakest).n} · {stepInfo(r.weakest).label}</span>
                  {by !== 'weakest' && <span className="block">{stepInfo(by).label}: {formatStep(by, r.steps[by].v)}</span>}
                  <span className="block">{fmt(r.highRisk)} high-risk</span>
                  <span className="block">{fmt(figures(r.c, k).cases * POOL_YEARS[k])} cases {pooled ? '(5 yrs)' : '/ yr'}</span>
                </>
              )
            }}
          />
          <div className="mt-4 space-y-3">
            {by === 'weakest' && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-type text-xs uppercase tracking-wider">
                {STEPS.filter((s) => hasProg || s.id !== 'screen').map((s) => (
                  <span key={s.id} className="flex items-baseline gap-1"><span className="font-serif text-base leading-none">{s.n}</span>{s.short}</span>
                ))}
              </div>
            )}
            <Legend lo={by === 'weakest' ? 'mild' : 'better'} hi={by === 'weakest' ? 'sharp' : 'worse'} wide={by !== 'weakest' && rows.some((r) => r.steps[by].wide)} />
          </div>
        </Card>

        <Card tone="stone" tilt={0.6} className="p-4 sm:p-6 min-w-0">
          <div className="grid grid-cols-[1.4rem_minmax(0,1fr)_6rem_3rem] gap-2 px-2 pb-2 border-b border-black/10 font-type text-[11px] uppercase tracking-wider opacity-70">
            <span />
            <span>County</span>
            <span className="flex items-center gap-1">Weakest {weakBadge}</span>
            <span className="flex items-center justify-end gap-1">Risk {stepBadge('risk', k)}</span>
          </div>
          <ol className="mt-1 space-y-0.5">
            {sorted.map((r, i) => {
              const sel = r.c.id === countyId
              return (
                <li key={r.c.id}>
                  <button onClick={() => select(r.c.id)} onDoubleClick={() => openBrief(r.c.id)}
                    className={cx('w-full grid grid-cols-[1.4rem_minmax(0,1fr)_6rem_3rem] items-center gap-2 py-1.5 px-2 rounded-md text-left transition-colors',
                      sel ? 'bg-mustard shadow' : 'hover:bg-black/5')}>
                    <span className="font-type text-xs opacity-50">{i + 1}</span>
                    <span className="font-serif text-base leading-tight truncate">{r.c.name}</span>
                    <span className={cx('flex items-center gap-1.5 font-type text-xs uppercase tracking-wide whitespace-nowrap', !sel && r.weakest === me.weakest && 'text-terra')}>
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: scaleColor(zt(r.weakZ)) }} />
                      {stepInfo(r.weakest).short}
                    </span>
                    <span className="font-type text-xs text-right tabular-nums opacity-70">{fmtK(r.highRisk)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      <Towns row={me} k={k} />
    </div>
  )
}

const fmtK = (n: number) => (n >= 10_000 ? `${fmt(n / 1000, 0)}k` : n >= 1000 ? `${fmt(n / 1000, 1)}k` : fmt(n))
const tileLabel = (s: StepId, v: number | null) => (v == null ? '' : s === 'survival' ? fmt(v, 2) : pct(v))

/** Short human line for the people lost at the weakest step. */
function lostLine(s: StepId, x: number | null): string | null {
  if (x == null || x <= 0) return null
  const n = fmt(Math.round(x))
  return s === 'risk' ? `+${n} people vs FI rate`
    : s === 'screen' ? `+${n} missed vs FI rate`
    : s === 'late' ? `+${n} late a year vs FI rate`
    : `+${n} deaths a year vs FI rate`
}

const HEADLINE: Record<StepId, [string, string]> = {
  risk: ['Too many', 'at high risk'],
  screen: ['Too few', 'get screened'],
  late: ['Too many', 'found late'],
  survival: ['Too few', 'survive'],
}

/** One county followed along the four steps; the weakest step is the big terra card. */
function Funnel({ row, k }: { row: RadarRow; k: RadarCancerId }) {
  return (
    <Card tilt={-0.3} className="mt-8 p-4 sm:p-6">
      <p className="font-serif text-3xl sm:text-4xl leading-tight">
        {HEADLINE[row.weakest][0]} <span className="italic text-terra">{HEADLINE[row.weakest][1]}</span>
        <span className="align-middle ml-2">{weakBadge}</span>
      </p>

      <ol className="mt-6 grid grid-cols-6 lg:[grid-template-columns:var(--cols)] gap-2 sm:gap-3 items-stretch"
        style={{ '--cols': STEPS.map((s) => (s.id === row.weakest ? '1.4fr' : '1fr')).join(' ') } as CSSProperties}>
        {STEPS.map((s, i) => {
          const st = row.steps[s.id]
          const isWeak = s.id === row.weakest
          const none = st.v == null
          const main: ReactNode = s.id === 'risk' ? fmt(row.highRisk)
            : none ? <span className="italic text-2xl">No programme</span>
            : formatStep(s.id, st.v)
          // bar scaled to the larger of county and Finland, Finland marked by a tick
          const top = Math.max(st.v ?? 0, st.nat ?? 0) * 1.25 || 1
          const lost = isWeak ? lostLine(s.id, st.excess) : null
          return (
            <li key={s.id}
              className={cx('relative rounded-lg p-3 sm:p-4 min-w-0 flex flex-col',
                isWeak ? 'col-span-6 order-first lg:order-none lg:col-span-1 bg-terra text-paper shadow-lg -rotate-1' : 'col-span-2 lg:col-span-1 bg-black/[.04]', none && 'hatch-soft')}>
              <span className="font-type text-xs uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                <span className={cx('w-5 h-5 rounded-full flex items-center justify-center font-serif text-sm shrink-0', isWeak ? 'bg-paper text-terra' : 'border border-current opacity-60')}>{s.n}</span>
                <span className={cx('truncate', !isWeak && 'opacity-60')}><span className="sm:hidden">{isWeak ? s.label : s.short}</span><span className="hidden sm:inline">{s.label}</span></span>
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className="hidden lg:block absolute -right-[11px] top-4 z-10 font-type text-sm opacity-40">→</span>}
              <p className={cx('font-serif leading-none mt-3 flex items-baseline gap-1.5 flex-wrap', isWeak ? 'text-5xl sm:text-6xl' : 'text-2xl sm:text-4xl', !isWeak && !none && 'opacity-80')}>
                {main} {stepBadge(s.id, k, row)}
              </p>
              {lost && <p className="font-serif italic text-lg sm:text-xl mt-2 leading-tight">{lost}</p>}
              <div className="mt-auto pt-5">
                {st.v != null && (
                  <div className={cx('relative h-1.5 rounded-full', isWeak ? 'bg-paper/30' : 'bg-black/10')} aria-label={`Finland ${formatStep(s.id, st.nat)}`}>
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', isWeak ? 'bg-paper' : 'bg-ink/70')} style={{ width: `${(st.v / top) * 100}%` }} />
                    {st.nat != null && (
                      <div className="absolute -top-1.5 -bottom-1.5" style={{ left: `${(st.nat / top) * 100}%` }}>
                        <div className={cx('h-full border-l-2', isWeak ? 'border-ink' : 'border-terra')} />
                        <span className={cx('absolute top-full mt-0.5 -translate-x-1/2 font-type text-[10px] tracking-wider', isWeak ? 'text-ink' : 'text-terra')}>FI</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="h-3" />
              </div>
            </li>
          )
        })}
      </ol>
      <style>{`.hatch-soft { background-image: repeating-linear-gradient(45deg, rgba(31,31,31,.08) 0 1.5px, transparent 1.5px 6px); }`}</style>
    </Card>
  )
}

/** Town drill-down: the two steps that exist at town level (high-risk estimate and turnout). */
function Towns({ row, k }: { row: RadarRow; k: RadarCancerId }) {
  const c = row.c
  const towns = TOWNS.filter((t) => t.county === c.id)
  const prog = row.programme
  const R = RISK[k]
  const mean65 = towns.reduce((s, t) => s + t.share65, 0) / (towns.length || 1)
  const list = towns.map((t) => {
    // older towns carry more of the age band; county risk-factor prevalence is applied as is
    const ageAdj = Math.max(0.6, Math.min(1.5, Math.sqrt(t.share65 / mean65)))
    const high = t.population * R.band(c) * ageAdj * R.sex * (R.prev(c) / 100)
    return { t, high, turnout: prog ? t.turnout[prog] : null }
  }).sort((a, b) => (prog ? a.turnout! - b.turnout! : b.high - a.high))
  const range = prog ? REAL_RANGE[prog] : null
  const lo = range ? Math.min(range[0], ...list.map((d) => d.turnout!)) - 2 : 0
  const hi = range ? Math.max(range[1], ...list.map((d) => d.turnout!)) + 2 : 1
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100
  const county = countyById(c.id)!
  const countyT = row.steps.screen.v != null ? row.steps.screen.v * 100 : null
  const natT = row.steps.screen.nat != null ? row.steps.screen.nat * 100 : null
  const maxHigh = Math.max(...list.map((d) => d.high))

  const cols = prog
    ? 'grid-cols-[minmax(0,6.5rem)_4.2rem_minmax(0,1fr)_2.6rem] sm:grid-cols-[minmax(0,10rem)_6rem_minmax(0,1fr)_3.6rem]'
    : 'grid-cols-[minmax(0,8rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]'

  return (
    <Card tone="paper" tilt={0.3} className="mt-10 p-4 sm:p-6">
      <p className="font-serif text-2xl leading-tight">Towns in {county.name}</p>

      <div className={cx('mt-3 grid gap-2 sm:gap-3 px-1 pb-2 border-b border-black/10 font-type text-[11px] uppercase tracking-wider opacity-70 items-center', cols)}>
        <span />
        <span className="flex items-center gap-1 whitespace-nowrap">High risk {stepBadge('risk', k)}</span>
        {prog && (
          <>
            <span className="flex items-center gap-1 min-w-0"><span className="truncate">Turnout</span>{stepBadge('screen', k, row)}</span>
            <span className="text-right">%</span>
          </>
        )}
      </div>
      <ul className="mt-1">
        {list.map((d, i) => {
          const worst = prog ? i === 0 : false
          return (
            <li key={d.t.id} className={cx('grid gap-2 sm:gap-3 items-center py-1.5 px-1 border-b border-black/5', cols)}>
              <span className={cx('font-serif text-base leading-tight truncate', worst && 'text-terra')}>{d.t.name}</span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="h-1.5 rounded-full bg-mustard shrink-0" style={{ width: prog ? `${Math.max(3, (d.high / maxHigh) * 26)}px` : `${Math.max(1, (d.high / maxHigh) * 70)}%` }} aria-hidden />
                <span className="font-type text-xs tabular-nums">{fmtK(d.high)}</span>
              </span>
              {prog && (
                <>
                  <span className="relative h-4 min-w-0" aria-hidden>
                    <span className="absolute top-1/2 left-0 right-0 h-px bg-black/15" />
                    {countyT != null && <span className="absolute top-0 bottom-0 border-l border-ink/60" style={{ left: `${x(countyT)}%` }} />}
                    {natT != null && <span className="absolute top-0 bottom-0 border-l-2 border-terra" style={{ left: `${x(natT)}%` }} />}
                    <span className={cx('absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full border border-ink', worst ? 'bg-terra' : d.turnout! < (countyT ?? 0) ? 'bg-mustard' : 'bg-paper')}
                      style={{ left: `${x(d.turnout!)}%` }} />
                  </span>
                  <span className="font-type text-xs text-right tabular-nums">{fmt(d.turnout!, 1)}</span>
                </>
              )}
            </li>
          )
        })}
      </ul>
      {prog && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-type text-xs uppercase tracking-wider opacity-70">
          <span className="flex items-center gap-1.5"><span className="h-3 border-l border-ink/60" />{county.name} {countyT != null ? fmt(countyT, 1) : ''}%</span>
          <span className="flex items-center gap-1.5 text-terra"><span className="h-3 border-l-2 border-terra" />FI {natT != null ? fmt(natT, 1) : ''}%</span>
        </div>
      )}
    </Card>
  )
}
