// 3.4 Overload warning: projected cases 2025 → 2035 from the ageing forecast; flags rising queues.
import { useMemo, useState } from 'react'
import { Card, Display, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { CANCERS, COUNTIES, countyById } from '../../data/counties'
import { Seg, Slider, Spark, useWidth } from './bits'
import { YEARS, fmt, overloadYear, pct, projection, queueRising, queueSlope, type ProjCancer } from './model'
import type { TabProps } from './index'

type SortKey = 'growth' | 'year' | 'queue' | 'name'

const HOW = (h: number) =>
  `cases(y) = cases₂₀₂₅ × [f75 × ageingIndex^((y−2025)/10) + (1−f75) × (1 + 0.02·t)], f75 = share of cases in people 75+ (incidence ×4). Overload = first year cases exceed 2025 by more than ${Math.round(h * 100)}%.`

export function Overload({ countyId, cancer, setCancer, select }: TabProps) {
  const [all, setAll] = useState(true)
  const [headroom, setHeadroom] = useState(0.15)
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: 'growth', desc: true })
  const pc: ProjCancer = all ? 'all' : cancer

  const rows = useMemo(() => COUNTIES.map((c) => {
    const s = projection(c, pc)
    return { c, s, growth: s[10] / s[0] - 1, year: overloadYear(s, headroom), slope: queueSlope(c), rising: queueRising(c) }
  }), [pc, headroom])

  const sorted = [...rows].sort((a, b) => {
    const d = sort.k === 'name' ? a.c.name.localeCompare(b.c.name)
      : sort.k === 'growth' ? a.growth - b.growth
      : sort.k === 'year' ? (a.year ?? 9999) - (b.year ?? 9999)
      : a.slope - b.slope
    return sort.desc ? -d : d
  })
  const flagged = rows.filter((r) => r.rising && r.year).length

  const [chartRef, cw] = useWidth<HTMLDivElement>()
  const me = rows.find((r) => r.c.id === countyId)!
  const county = countyById(countyId)!
  // main chart geometry
  const W = cw, H = 230, M = { l: 44, r: 16, t: 18, b: 28 }
  const ymax = Math.max(me.s[10], me.s[0] * (1 + headroom)) * 1.08
  const ymin = me.s[0] * 0.85
  const sx = (i: number) => M.l + (i / 10) * (W - M.l - M.r)
  const sy = (v: number) => H - M.b - ((v - ymin) / (ymax - ymin)) * (H - M.t - M.b)
  const line = me.s.map((v, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(v)}`).join('')
  const cap = me.s[0] * (1 + headroom)
  const yi = me.year ? YEARS.indexOf(me.year) : -1

  const head = (k: SortKey, label: string, cls?: string) => (
    <button onClick={() => setSort((s) => ({ k, desc: s.k === k ? !s.desc : k !== 'name' && k !== 'year' }))}
      className={cx('font-type text-[10px] uppercase tracking-wider flex items-center gap-1 hover:text-terra', sort.k === k ? '' : 'opacity-60', cls)}>
      {label}{sort.k === k && <span>{sort.desc ? '↓' : '↑'}</span>}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="Ageing" b="into queues" />
        <Stamp tone="terra" rotate={-8}>{flagged} counties<br />overload<br />+ queue ↑</Stamp>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Seg items={[{ id: 'all', label: 'All four' }, ...CANCERS.map((c) => ({ id: c.id, label: c.label }))]}
          value={all ? 'all' : cancer} onChange={(v) => { if (v === 'all') setAll(true); else { setAll(false); setCancer(v) } }} />
      </div>

      <div className="mt-8 grid 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8 items-start">
        <Card tone={me.year ? 'terra' : 'stone'} tilt={-0.8} className="relative p-5 sm:p-6 min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div>
              <Label className={me.year ? '!opacity-80' : ''}>{county.name} · new cases / yr</Label>
              <p className="font-serif text-5xl leading-none mt-2 flex items-baseline gap-2">
                {fmt(me.s[0])}<span className="text-2xl italic">→ {fmt(me.s[10])}</span>
                <SourceBadge id="ourModel" kind="estimate" how={HOW(headroom)} />
              </p>
              <p className="font-type text-xs uppercase tracking-wider mt-2">+{pct(me.growth)} by 2035</p>
            </div>
            <Stamp tone={me.year ? 'paper' : 'ink'} rotate={12} className="!w-20 !h-20 [&>div]:!w-16 [&>div]:!h-16">
              {me.year ? <>Overload<br />{me.year}</> : <>Within<br />2035</>}
            </Stamp>
          </div>
          <div ref={chartRef} className="mt-3">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label="Projected cases 2025 to 2035">
            {[0, 2, 4, 6, 8, 10].map((i) => (
              <text key={i} x={sx(i)} y={H - 8} textAnchor="middle" className="font-type" style={{ fontSize: 10 }} fill="currentColor" opacity=".7">{YEARS[i]}</text>
            ))}
            {[ymin, (ymin + ymax) / 2, ymax].map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="currentColor" strokeOpacity=".12" />
                <text x={M.l - 6} y={sy(v) + 3} textAnchor="end" className="font-type" style={{ fontSize: 10 }} fill="currentColor" opacity=".7">{fmt(v)}</text>
              </g>
            ))}
            <path d={`${line}L${sx(10)},${H - M.b}L${sx(0)},${H - M.b}Z`} fill="currentColor" fillOpacity=".12" />
            <line x1={M.l} x2={W - M.r} y1={sy(cap)} y2={sy(cap)} stroke="currentColor" strokeDasharray="5 4" strokeWidth={1.2} />
            <text x={W - M.r} y={sy(cap) - 5} textAnchor="end" className="font-type uppercase" style={{ fontSize: 9, letterSpacing: '.1em' }} fill="currentColor">capacity +{Math.round(headroom * 100)}%</text>
            <path d={line} fill="none" stroke="currentColor" strokeWidth={2.2} />
            {yi >= 0 && (
              <g>
                <line x1={sx(yi)} x2={sx(yi)} y1={M.t} y2={H - M.b} stroke="currentColor" strokeOpacity=".5" />
                <circle cx={sx(yi)} cy={sy(me.s[yi])} r={5} fill="#FFC233" stroke="#1F1F1F" strokeWidth={1.5} />
              </g>
            )}
          </svg>
          </div>
          <div className="mt-4">
            <Slider label="Spare capacity today" value={headroom} min={0.05} max={0.4} step={0.05} onChange={setHeadroom}
              display={`+${Math.round(headroom * 100)}%`} />
          </div>
          <div className="mt-4 flex items-center gap-3 font-type text-[11px] uppercase tracking-wider">
            <span>Queue &gt;90 d</span>
            <Spark values={county.queueTrend} w={70} h={22} mark={3} stroke="currentColor" fill="rgba(0,0,0,.08)" />
            <span>{county.queueTrend[0]} → {county.queueTrend[3]} /10k</span>
            <SourceBadge id="sotkanetQueue" kind="direct" />
            {me.rising && <span className="px-2 py-0.5 rounded-full bg-ink text-paper">rising</span>}
          </div>
        </Card>

        <Card tilt={0.6} className="p-4 sm:p-6 min-w-0 2xl:mt-0 sm:mx-4 2xl:mx-0">
          <div className="grid grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_4.5rem] gap-2 items-center pb-2 border-b border-black/10 px-1.5">
            {head('name', 'County')}
            {head('growth', '2035', 'justify-end')}
            {head('year', 'Over', 'justify-end')}
            {head('queue', 'Queue', 'justify-end')}
          </div>
          <ul>
            {sorted.map((r) => (
              <li key={r.c.id}>
                <button onClick={() => select(r.c.id)}
                  className={cx('w-full grid grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_4.5rem] gap-2 items-center py-1.5 px-1.5 rounded text-left',
                    r.c.id === countyId ? 'bg-mustard' : 'hover:bg-black/5')}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="hidden sm:inline-flex"><Spark values={r.s} w={44} h={16} domain={[r.s[0] * 0.95, r.s[0] * 1.6]} stroke={r.year ? '#C65D3B' : '#1F1F1F'} fill="rgba(31,31,31,.06)" /></span>
                    <span className="font-serif text-base leading-tight truncate">{r.c.name}</span>
                  </span>
                  <span className="font-type text-xs text-right tabular-nums">+{Math.round(r.growth * 100)}%</span>
                  <span className={cx('font-type text-xs text-right tabular-nums', r.year != null && 'text-terra font-bold')}>{r.year ?? '—'}</span>
                  <span className="flex items-center justify-end gap-1">
                    <Spark values={r.c.queueTrend} w={34} h={14} stroke={r.rising ? '#C65D3B' : '#1F1F1F'} fill="transparent" />
                    <span className={cx('font-type text-xs w-3', r.rising ? 'text-terra' : 'opacity-30')}>{r.rising ? '▲' : '·'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between items-center font-type text-[10px] uppercase tracking-wider opacity-70">
            <span>▲ queue rising</span>
            <span className="flex items-center gap-1">Projection <SourceBadge id="statfinPop" kind="estimate" how={HOW(headroom)} /></span>
          </div>
        </Card>
      </div>
    </div>
  )
}
