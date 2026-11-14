// 3.1 Detection radar (county side): follow people along four steps (at risk → screened → found late →
// survival) and mark the step where each county loses the most. Tile map + county funnel + ranked list + towns.
import { useMemo, useState, type ReactNode } from 'react'
import { Card, Display, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { countyById, type RadarCancerId } from '../../data/counties'
import { Legend, Seg } from './bits'
import { TileMap } from './TileMap'
import {
  POOL_YEARS, RADAR_CANCERS, REAL_RANGE, RISK, STEPS, cancerLabel, excessText, figures, fmt, formatStep, pct, periodLabel,
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

  // which step most counties lose people at
  const counts = STEPS.map((s) => ({ s, n: rows.filter((r) => r.weakest === s.id).length }))
  const mode = [...counts].sort((a, b) => b.n - a.n)[0]

  const totalHigh = rows.reduce((s, r) => s + r.highRisk, 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="Where people" b="fall through" />
        <Stamp tone="terra" rotate={-10}>
          {mode.n}/22<br />weakest at<br />{mode.s.label}
        </Stamp>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Seg items={RADAR_CANCERS} value={k} onChange={setRadarCancer} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-type text-xs uppercase tracking-wider">
        <span className={cx('px-2 py-1 rounded-full', pooled ? 'bg-ink text-paper' : 'bg-black/5')}>{periodLabel(k)}</span>
        <span className="opacity-60">{RISK[k].who} · {hasProg ? `screening ${RISK[k].ages}` : 'no screening programme'}</span>
        <span className="opacity-60 flex items-center gap-1.5">· {fmt(totalHigh)} high-risk in Finland {stepBadge('risk', k)}</span>
      </div>

      <Funnel row={me} k={k} onBrief={() => openBrief(countyId)} />

      <div className="mt-8 grid md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <Card tilt={-1} className="p-4 sm:p-5 max-w-[320px] w-full mx-auto md:mx-0">
          <div className="flex justify-between items-center mb-3 gap-2">
            <Label>{by === 'weakest' ? 'Weakest step' : stepInfo(by).label}</Label>
            {by === 'weakest' ? weakBadge : stepBadge(by, k)}
          </div>
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-type text-xs uppercase tracking-wider">
                {counts.map(({ s, n }) => (
                  <span key={s.id} className={cx('flex items-center gap-1.5', !hasProg && s.id === 'screen' && 'opacity-40')}>
                    <span className="font-serif text-base leading-none normal-case">{s.n}</span>{s.label}<span className="opacity-60">·{n}</span>
                  </span>
                ))}
              </div>
            )}
            <Legend lo={by === 'weakest' ? 'mild' : 'better'} hi={by === 'weakest' ? 'sharp' : 'worse'} wide={by !== 'weakest' && rows.some((r) => r.steps[by].wide)} />
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-type text-xs uppercase tracking-wider opacity-60">Colour map by</span>
            <Seg items={[{ id: 'weakest' as ColorBy, label: 'Weakest' }, ...STEPS.filter((s) => hasProg || s.id !== 'screen').map((s) => ({ id: s.id as ColorBy, label: `${s.n} ${s.short}` }))]}
              value={by} onChange={setColorBy} />
          </div>

          <Card tone="stone" tilt={0.6} className="p-4 sm:p-6 min-w-0">
            <div className="flex justify-between items-baseline mb-3 gap-2">
              <Label>Ranked · sharpest loss first</Label>
              <span className="flex items-center gap-1.5">{weakBadge}</span>
            </div>
            <div className="grid grid-cols-[1.2rem_minmax(0,1fr)_4.2rem_4.6rem] sm:grid-cols-[1.4rem_minmax(0,1fr)_4.4rem_4.8rem_3rem] gap-2 px-2 pb-2 border-b border-black/10 font-type text-[11px] uppercase tracking-wider opacity-70">
              <span />
              <span>County</span>
              <span className="flex gap-[3px]">{STEPS.map((s) => <span key={s.id} className="w-[14px] text-center">{s.n}</span>)}</span>
              <span>Weakest</span>
              <span className="hidden sm:flex items-center justify-end gap-1">Risk {stepBadge('risk', k)}</span>
            </div>
            <ol className="mt-1 space-y-0.5">
              {sorted.map((r, i) => {
                const sel = r.c.id === countyId
                return (
                  <li key={r.c.id}>
                    <button onClick={() => select(r.c.id)} onDoubleClick={() => openBrief(r.c.id)}
                      className={cx('w-full grid grid-cols-[1.2rem_minmax(0,1fr)_4.2rem_4.6rem] sm:grid-cols-[1.4rem_minmax(0,1fr)_4.4rem_4.8rem_3rem] items-center gap-2 py-1.5 px-2 rounded-md text-left transition-colors',
                        sel ? 'bg-mustard shadow' : 'hover:bg-black/5')}>
                      <span className="font-type text-xs opacity-60">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-serif text-base leading-tight truncate">{r.c.name}</span>
                      <StepDots row={r} />
                      <span className="font-type text-xs uppercase tracking-wide whitespace-nowrap">
                        <span className={cx('inline-block px-1.5 py-0.5 rounded-full', sel ? 'bg-ink text-paper' : 'bg-terra text-paper')}>{stepInfo(r.weakest).n} {stepInfo(r.weakest).short}</span>
                      </span>
                      <span className="hidden sm:block font-type text-xs text-right tabular-nums">{fmtK(r.highRisk)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 font-type text-[11px] uppercase tracking-wider opacity-60">Tap to select · map tile opens the brief</p>
          </Card>
        </div>
      </div>

      <Towns row={me} k={k} />
    </div>
  )
}

const fmtK = (n: number) => (n >= 10_000 ? `${fmt(n / 1000, 0)}k` : n >= 1000 ? `${fmt(n / 1000, 1)}k` : fmt(n))
const tileLabel = (s: StepId, v: number | null) => (v == null ? '' : s === 'survival' ? fmt(v, 2) : pct(v))

function StepDots({ row }: { row: RadarRow }) {
  return (
    <span className="flex gap-[3px]" aria-label={`Weakest step ${stepInfo(row.weakest).label}`}>
      {STEPS.map((s) => {
        const st = row.steps[s.id]
        const weak = s.id === row.weakest
        return (
          <span key={s.id} title={`${s.label}: ${formatStep(s.id, st.v)}`}
            className={cx('w-[14px] h-[14px] rounded-[3px] border', weak ? 'border-ink border-2' : 'border-black/15', st.v == null && 'hatch')}
            style={st.v == null ? undefined : { background: scaleColor(zt(st.z)) }} />
        )
      })}
    </span>
  )
}

/** One county followed along the four steps; the weakest step is the terra card. */
function Funnel({ row, k, onBrief }: { row: RadarRow; k: RadarCancerId; onBrief: () => void }) {
  const f = figures(row.c, k)
  return (
    <Card tilt={-0.3} className="mt-8 p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="min-w-0">
          <Label>{row.c.name} · {cancerLabel(k)} · follow the people</Label>
          <p className="font-serif text-2xl sm:text-3xl leading-tight mt-1">
            Most are lost at <span className="italic text-terra">{stepInfo(row.weakest).n} · {stepInfo(row.weakest).label}</span>
            <span className="align-middle ml-2">{weakBadge}</span>
          </p>
        </div>
        <button onClick={onBrief}
          className="font-type text-[13px] uppercase tracking-widest flex items-center gap-2 rounded-full border border-ink pl-4 pr-1.5 py-1.5 hover:bg-ink hover:text-paper transition-colors shrink-0">
          Brief <span className="w-6 h-6 rounded-full bg-mustard text-ink flex items-center justify-center">→</span>
        </button>
      </div>

      <ol className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((s, i) => {
          const st = row.steps[s.id]
          const weak = s.id === row.weakest
          const none = st.v == null
          let main: ReactNode, sub: ReactNode
          if (s.id === 'risk') {
            main = fmt(row.highRisk)
            sub = <>{pct(st.v!)} of {RISK[k].who} · FI {pct(st.nat!)}</>
          } else if (s.id === 'screen') {
            main = none ? <span className="italic text-xl sm:text-2xl">No programme yet</span> : formatStep('screen', st.v)
            sub = none ? <>{k === 'lung' ? 'lung CT: research pilots only' : 'no national screening'}</> : <>of invited took part · FI {formatStep('screen', st.nat)}</>
          } else if (s.id === 'late') {
            main = formatStep('late', st.v)
            sub = <>at stage III–IV · FI {pct(st.nat!)}<br />found {fmt(f.cases)} vs {fmt(f.expected)} expected / yr</>
          } else {
            main = formatStep('survival', st.v)
            sub = <>deaths ÷ new cases · FI {fmt(st.nat!, 2)}</>
          }
          const bar = st.v == null ? null : Math.min(1, st.v)
          const natBar = st.nat == null ? null : Math.min(1, st.nat)
          return (
            <li key={s.id}
              className={cx('relative rounded-lg p-3 sm:p-4 min-w-0 flex flex-col', weak ? 'bg-terra text-paper shadow-lg -rotate-1' : 'bg-black/[.04]', none && 'hatch-soft')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-type text-xs uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                  <span className={cx('w-5 h-5 rounded-full flex items-center justify-center font-serif text-sm shrink-0', weak ? 'bg-paper text-terra' : 'border border-current')}>{s.n}</span>
                  <span className="truncate">{s.label}</span>
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="hidden lg:block absolute -right-[11px] top-4 z-10 font-type text-sm opacity-50">→</span>}
                {weak && <span className="absolute -top-2 right-3 font-type text-[10px] uppercase tracking-wider bg-ink text-paper rounded-full px-1.5 py-0.5 shadow">most lost</span>}
              </div>
              <p className="font-serif text-3xl sm:text-4xl leading-none mt-3 flex items-baseline gap-1.5 flex-wrap">{main} {stepBadge(s.id, k, row)}</p>
              <p className={cx('font-type text-xs uppercase tracking-wide mt-2 leading-snug', weak ? 'opacity-90' : 'opacity-60')}>{sub}</p>
              <div className="mt-auto pt-3">
                {bar != null && (
                  <div className={cx('relative h-1.5 rounded-full', weak ? 'bg-paper/30' : 'bg-black/10')} aria-hidden>
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', weak ? 'bg-paper' : 'bg-ink')} style={{ width: `${bar * 100}%` }} />
                    {natBar != null && <div className={cx('absolute -top-1 -bottom-1 border-l border-dashed', weak ? 'border-paper' : 'border-terra')} style={{ left: `${natBar * 100}%` }} />}
                  </div>
                )}
                <p className={cx('font-type text-xs mt-2 tabular-nums', weak ? '' : 'opacity-70', (st.excess ?? 0) > 0 && !weak && 'text-terra opacity-100')}>
                  {none ? '—' : excessText(s.id, st.excess)}
                </p>
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
  const progInfo = PROGRAMMES.find((p) => p.id === prog)

  return (
    <Card tone="paper" tilt={0.3} className="mt-8 p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <Label>Drill down · towns in {county.name}</Label>
        <span className="font-type text-xs uppercase tracking-wider opacity-60 flex items-center gap-1.5">
          steps 3–4 by county only
          <SourceBadge id="cancerRegistry" kind="gap" how="Stage at diagnosis and deaths are not published for single towns in this prototype; counts would be too small. County level only." />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,6.5rem)_4.2rem_minmax(0,1fr)_2.6rem] sm:grid-cols-[minmax(0,10rem)_6rem_minmax(0,1fr)_3.6rem] gap-2 sm:gap-3 px-1 pb-2 border-b border-black/10 font-type text-[11px] uppercase tracking-wider opacity-70 items-center">
        <span>Town</span>
        <span className="flex items-center gap-1 whitespace-nowrap">1 Risk {stepBadge('risk', k)}</span>
        <span className="flex items-center gap-1 min-w-0">
          <span className="truncate">{prog ? `2 Turnout ${progInfo!.ages}` : '2 Screened'}</span>
          {stepBadge('screen', k, row)}
        </span>
        <span className="text-right">{prog ? '%' : ''}</span>
      </div>
      <ul className="mt-1">
        {list.map((d, i) => {
          const worst = prog ? i === 0 : false
          return (
            <li key={d.t.id} className="grid grid-cols-[minmax(0,6.5rem)_4.2rem_minmax(0,1fr)_2.6rem] sm:grid-cols-[minmax(0,10rem)_6rem_minmax(0,1fr)_3.6rem] gap-2 sm:gap-3 items-center py-1.5 px-1 border-b border-black/5">
              <span className="font-serif text-base leading-tight truncate flex items-center gap-1.5">
                {d.t.name}
                {worst && <span className="w-1.5 h-1.5 rounded-full bg-terra shrink-0" title="lowest turnout" />}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 rounded-full bg-mustard shrink-0" style={{ width: `${Math.max(3, (d.high / maxHigh) * 26)}px` }} aria-hidden />
                <span className="font-type text-xs tabular-nums">{fmtK(d.high)}</span>
              </span>
              {prog ? (
                <span className="relative h-4 min-w-0" aria-hidden>
                  <span className="absolute top-1/2 left-0 right-0 h-px bg-black/15" />
                  {countyT != null && <span className="absolute top-0 bottom-0 border-l border-ink/60" style={{ left: `${x(countyT)}%` }} />}
                  {natT != null && <span className="absolute top-0 bottom-0 border-l border-dashed border-terra" style={{ left: `${x(natT)}%` }} />}
                  <span className={cx('absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full border border-ink', worst ? 'bg-terra' : d.turnout! < (countyT ?? 0) ? 'bg-mustard' : 'bg-paper')}
                    style={{ left: `${x(d.turnout!)}%` }} />
                </span>
              ) : (
                <span className="font-type text-xs uppercase tracking-wider opacity-50 truncate">no programme</span>
              )}
              <span className="font-type text-xs text-right tabular-nums">{d.turnout != null ? fmt(d.turnout, 1) : '—'}</span>
            </li>
          )
        })}
      </ul>
      {prog && range && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-type text-xs uppercase tracking-wider opacity-70">
          <span className="flex items-center gap-1.5"><span className="h-3 border-l border-ink/60" />county {countyT != null ? fmt(countyT, 1) : ''}%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 border-l border-dashed border-terra" />FI {natT != null ? fmt(natT, 1) : ''}%</span>
          <span className="flex items-center gap-1.5">real 2024 range, 292 towns: {fmt(range[0], 1)}–{fmt(range[1], 1)}% <SourceBadge id="sotkanetScreening" kind="direct" how={`THL Sotkanet ${progInfo!.indicator}, 2024 municipal turnout. Bowel 59.5–82.4%, breast 68.1–92.5%, cervical 45.7–92.3%.`} /></span>
        </div>
      )}
    </Card>
  )
}
