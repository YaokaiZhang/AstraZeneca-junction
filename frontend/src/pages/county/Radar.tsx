// 3.1 Detection radar (county side): tile map + ranked list for one cancer and one metric.
import { useMemo } from 'react'
import { Card, Display, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { CANCERS, COUNTIES, type CancerId } from '../../data/counties'
import { Legend, Seg } from './bits'
import { TileMap } from './TileMap'
import { METRICS, POOL_YEARS, formatMetric, metricValue, national, periodLabel, scaleColor, type Metric } from './model'
import type { TabProps } from './index'

export function metricBadge(m: Metric, cancer: CancerId) {
  const pooled = POOL_YEARS[cancer] > 1 ? ` Counts pooled over ${POOL_YEARS[cancer]} years.` : ''
  if (m === 'late') return <SourceBadge id="cancerRegistry" kind="direct" how={`Share of new cases at stage III–IV. 95% range: Wilson interval.${pooled}`} />
  if (m === 'ratio') return <SourceBadge id="ourModel" kind="estimate" how={`observed cases ÷ expected cases; expected = national rate × age mix × risk factors (smoking, alcohol, obesity). 95% range: exact Poisson (Byar).${pooled}`} />
  return <SourceBadge id="ourModel" kind="estimate" how={`deaths (Statistics Finland) ÷ new cases (Cancer Registry). Survival stand-in: official survival exists only for 5 regions.${pooled}`} />
}

export function Radar({ countyId, cancer, setCancer, openBrief, metric, setMetric }: TabProps & { metric: Metric; setMetric: (m: Metric) => void }) {
  const rows = useMemo(() => COUNTIES.map((c) => ({ c, mv: metricValue(c, cancer, metric) })), [cancer, metric])
  const sorted = useMemo(() => [...rows].sort((a, b) => b.mv.v - a.mv.v), [rows])
  const vmin = Math.min(...rows.map((r) => r.mv.v)), vmax = Math.max(...rows.map((r) => r.mv.v))
  const amin = Math.min(...rows.map((r) => r.mv.lo)), amax = Math.max(...rows.map((r) => r.mv.hi))
  const t = (v: number) => (v - vmin) / (vmax - vmin || 1)
  const x = (v: number) => ((v - amin) / (amax - amin || 1)) * 100
  const nat = national(cancer, metric)
  const pooled = POOL_YEARS[cancer] > 1
  const wideCount = rows.filter((r) => r.mv.wide).length
  const byId = new Map(rows.map((r) => [r.c.id, r.mv]))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="Found" b="too late" />
        <Stamp tone="terra" rotate={-10}>
          FI<br />{formatMetric(metric, nat)}<br />{METRICS.find((m) => m.id === metric)!.short}
        </Stamp>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Seg items={CANCERS.map((c) => ({ id: c.id, label: c.label }))} value={cancer} onChange={setCancer} />
        <Seg items={METRICS.map((m) => ({ id: m.id, label: m.label }))} value={metric} onChange={setMetric} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-type text-[10px] uppercase tracking-wider">
        <span className={cx('px-2 py-1 rounded-full', pooled ? 'bg-ink text-paper' : 'bg-black/5')}>{periodLabel(cancer)}</span>
        <span className="opacity-60">95% range shown</span>
        {wideCount > 0 && <span className="opacity-60">· {wideCount} faded</span>}
      </div>

      <div className="mt-8 grid md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <Card tilt={-1} className="p-4 sm:p-5 max-w-[320px] w-full mx-auto md:mx-0">
          <div className="flex justify-between items-center mb-3">
            <Label>{METRICS.find((m) => m.id === metric)!.label}</Label>
            {metricBadge(metric, cancer)}
          </div>
          <TileMap
            selected={countyId}
            onSelect={openBrief}
            style={(c) => {
              const mv = byId.get(c.id)!
              return { fill: scaleColor(t(mv.v)), label: formatMetric(metric, mv.v), faded: mv.wide }
            }}
            tooltip={(c) => {
              const mv = byId.get(c.id)!
              return (
                <>
                  <span className="block text-mustard text-sm">{formatMetric(metric, mv.v)}</span>
                  <span className="block">95%: {formatMetric(metric, mv.lo)}–{formatMetric(metric, mv.hi)}</span>
                  <span className="block">{mv.n.toLocaleString('en-GB')} cases {pooled ? '(5 yrs)' : '/ yr'}</span>
                  {mv.wide && <span className="block text-terra">wide range</span>}
                </>
              )
            }}
          />
          <div className="mt-4">
            <Legend lo={formatMetric(metric, vmin)} hi={formatMetric(metric, vmax)} wide={wideCount > 0} />
          </div>
        </Card>

        <Card tone="stone" tilt={0.6} className="p-4 sm:p-6 min-w-0">
          <div className="flex justify-between items-baseline mb-3">
            <Label>Ranked · worst first</Label>
            <span className="font-type text-[10px] uppercase tracking-wider opacity-60">┆ FI {formatMetric(metric, nat)}</span>
          </div>
          <ol className="space-y-0.5">
            {sorted.map(({ c, mv }, i) => {
              const sel = c.id === countyId
              return (
                <li key={c.id}>
                  <button onClick={() => openBrief(c.id)}
                    className={cx('w-full grid grid-cols-[1.5rem_minmax(0,8.5rem)_minmax(0,1fr)_3.2rem] sm:grid-cols-[1.5rem_10rem_minmax(0,1fr)_3.5rem] items-center gap-2 py-1.5 px-2 rounded-md text-left transition-colors',
                      sel ? 'bg-mustard shadow' : 'hover:bg-black/5', mv.wide && !sel && 'opacity-55')}>
                    <span className="font-type text-[10px] opacity-60">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-serif text-base leading-tight truncate">{c.name}</span>
                    <span className="relative h-4" aria-hidden>
                      <span className="absolute top-1/2 h-px bg-black/50" style={{ left: `${x(mv.lo)}%`, width: `${x(mv.hi) - x(mv.lo)}%` }} />
                      <span className="absolute top-[3px] bottom-[3px] w-px bg-black/50" style={{ left: `${x(mv.lo)}%` }} />
                      <span className="absolute top-[3px] bottom-[3px] w-px bg-black/50" style={{ left: `${x(mv.hi)}%` }} />
                      <span className="absolute top-0 bottom-0 border-l border-dashed border-terra" style={{ left: `${x(nat)}%` }} />
                      <span className="absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full border border-ink" style={{ left: `${x(mv.v)}%`, background: scaleColor(t(mv.v)) }} />
                    </span>
                    <span className="font-type text-xs text-right tabular-nums">{formatMetric(metric, mv.v)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
    </div>
  )
}
