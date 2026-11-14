// 3.2 Who misses screening: predicted vs actual turnout per town.
import { useMemo, useState } from 'react'
import { Card, Display, EdgeText, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { countyById } from '../../data/counties'
import { Seg, Tear } from './bits'
import { fmt } from './model'
import { FEATURES, PROGRAMMES, TOWNS, fitModel, verdict, type Programme, type Town, type Verdict } from './towns'
import type { TabProps } from './index'

const VC: Record<Verdict, string> = { help: '#C65D3B', copy: '#5E6B4E', ok: '#D1D1C9' }
const VL: Record<Verdict, string> = { help: 'Needs help', copy: 'Worth copying', ok: 'As predicted' }

const W = 520, H = 400, M = { l: 40, r: 14, t: 14, b: 34 }

export function Screening({ countyId, select }: TabProps) {
  const [prog, setProg] = useState<Programme>('bowel')
  const [townId, setTownId] = useState<string | null>(null)
  const [scope, setScope] = useState<'county' | 'all'>('county')
  const fit = useMemo(() => fitModel(prog), [prog])

  const pts = useMemo(() => TOWNS.map((t) => {
    const p = fit.predicted.get(t.id)!
    const a = t.turnout[prog]
    return { t, p, a, res: a - p, v: verdict(a, p, fit.sd) }
  }), [fit, prog])

  const all = pts.flatMap((d) => [d.p, d.a])
  const lo = Math.floor(Math.min(...all) / 5) * 5, hi = Math.ceil(Math.max(...all) / 5) * 5
  const sx = (v: number) => M.l + ((v - lo) / (hi - lo)) * (W - M.l - M.r)
  const sy = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b)
  const ticks = Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => Math.ceil(lo / 10) * 10 + i * 10).filter((v) => v <= hi)
  const band = 1.5 * fit.sd

  const inCounty = (d: { t: Town }) => d.t.county === countyId
  const listPts = scope === 'county' ? pts.filter(inCounty) : pts
  // county view: the furthest below / above prediction even if not flagged; Finland view: flagged only
  const n = scope === 'county' ? 3 : 5
  const help = listPts.filter((d) => (scope === 'county' ? d.res < 0 : d.v === 'help')).sort((a, b) => a.res - b.res).slice(0, n)
  const copy = listPts.filter((d) => (scope === 'county' ? d.res > 0 : d.v === 'copy')).sort((a, b) => b.res - a.res).slice(0, n)
  const sel = pts.find((d) => d.t.id === townId) ?? null
  const progInfo = PROGRAMMES.find((p) => p.id === prog)!
  const county = countyById(countyId)!

  const pick = (t: Town) => { setTownId(t.id); if (t.county !== countyId) select(t.county) }

  const fitBadge = (
    <SourceBadge id="ourModel" kind="estimate"
      how={<>{fit.formula}<br /><br />Least squares over {TOWNS.length} towns · R² {fit.r2.toFixed(2)} · outlier = ±1.5 × residual SD ({fit.sd.toFixed(1)} pts)</>} />
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="Who misses" b="the letter" />
        <div className="flex gap-2 items-center">
          <span className="font-type text-xs uppercase tracking-wider opacity-60">R² {fit.r2.toFixed(2)}</span>
          {fitBadge}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Seg items={PROGRAMMES.map((p) => ({ id: p.id, label: p.label }))} value={prog} onChange={(p) => setProg(p)} />
        <span className="font-type text-xs uppercase tracking-wider opacity-60">ages {progInfo.ages} · Sotkanet {progInfo.indicator}</span>
      </div>

      <div className="mt-8 grid xl:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start">
        <Card tilt={-0.6} className="p-3 sm:p-5 min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2 px-1">
            <Label>Actual vs predicted turnout, %</Label>
            <div className="flex gap-3 font-type text-xs uppercase tracking-wider">
              {(['help', 'copy'] as Verdict[]).map((v) => (
                <span key={v} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: VC[v] }} />{VL[v]}</span>
              ))}
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-ink" />{county.name}</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Scatter of predicted versus actual turnout">
            {ticks.map((v) => (
              <g key={v}>
                <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} stroke="#1F1F1F" strokeOpacity=".07" />
                <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="#1F1F1F" strokeOpacity=".07" />
                <text x={sx(v)} y={H - M.b + 14} textAnchor="middle" className="font-type" style={{ fontSize: 10 }} fill="#1F1F1F" opacity=".6">{v}</text>
                <text x={M.l - 6} y={sy(v) + 3} textAnchor="end" className="font-type" style={{ fontSize: 10 }} fill="#1F1F1F" opacity=".6">{v}</text>
              </g>
            ))}
            <polygon fill="#FFC233" fillOpacity=".14"
              points={`${sx(lo)},${sy(lo + band)} ${sx(hi - band)},${sy(hi)} ${sx(hi)},${sy(hi)} ${sx(hi)},${sy(hi - band)} ${sx(lo + band)},${sy(lo)} ${sx(lo)},${sy(lo)}`} />
            <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke="#1F1F1F" strokeDasharray="4 4" strokeOpacity=".5" />
            <text x={W - M.r - 4} y={M.t + 12} textAnchor="end" className="font-type uppercase" style={{ fontSize: 9, letterSpacing: '.1em' }} fill="#5E6B4E">↖ better than predicted</text>
            <text x={W - M.r - 4} y={H - M.b - 8} textAnchor="end" className="font-type uppercase" style={{ fontSize: 9, letterSpacing: '.1em' }} fill="#C65D3B">↘ worse than predicted</text>
            <text x={(W + M.l) / 2} y={H - 4} textAnchor="middle" className="font-type uppercase" style={{ fontSize: 9, letterSpacing: '.15em' }} fill="#1F1F1F" opacity=".55">predicted</text>
            <text transform={`translate(10 ${(H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="font-type uppercase" style={{ fontSize: 9, letterSpacing: '.15em' }} fill="#1F1F1F" opacity=".55">actual</text>
            {[...pts].sort((a, b) => Number(inCounty(a)) - Number(inCounty(b))).map((d) => {
              const mine = inCounty(d)
              const r = 3 + Math.sqrt(d.t.population / 4000)
              const isSel = d.t.id === townId
              return (
                <g key={d.t.id} className="cursor-pointer" tabIndex={0} role="button" aria-label={`${d.t.name}: actual ${d.a}%, predicted ${fmt(d.p, 1)}%`}
                  onClick={() => pick(d.t)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(d.t) } }}>
                  <title>{`${d.t.name} · ${d.a}% vs ${fmt(d.p, 1)}%`}</title>
                  <circle cx={sx(d.p)} cy={sy(d.a)} r={Math.min(r, 14)} fill={VC[d.v]}
                    fillOpacity={mine ? 0.95 : d.v === 'ok' ? 0.35 : 0.5}
                    stroke="#1F1F1F" strokeOpacity={mine ? 1 : 0.2} strokeWidth={isSel ? 3 : mine ? 1.6 : 0.6} />
                  {(mine && d.v !== 'ok') || isSel ? (
                    <text x={sx(d.p) + Math.min(r, 14) + 3} y={sy(d.a) + 3} className="font-type" style={{ fontSize: 10 }} fill="#1F1F1F">{d.t.name}</text>
                  ) : null}
                </g>
              )
            })}
          </svg>
        </Card>

        <div className="space-y-5 min-w-0">
          {sel ? (
            <Card tone="mustard" tilt={1.5} className="relative p-5 pl-9">
              <EdgeText>{countyById(sel.t.county)!.name}</EdgeText>
              <div className="flex justify-between items-start">
                <div>
                  <Label>{progInfo.label} · town</Label>
                  <p className="font-serif text-3xl leading-none mt-1">{sel.t.name}</p>
                </div>
                <button onClick={() => setTownId(null)} aria-label="Close town" className="font-type text-xs w-7 h-7 rounded-full border border-current hover:bg-ink hover:text-mustard">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label>Actual</Label>
                  <p className="font-serif text-4xl leading-none flex items-baseline gap-1">{sel.a}<span className="text-lg">%</span> <SourceBadge id="sotkanetScreening" kind="direct" /></p>
                </div>
                <div>
                  <Label>Predicted</Label>
                  <p className="font-serif text-4xl leading-none flex items-baseline gap-1">{fmt(sel.p, 1)}<span className="text-lg">%</span> {fitBadge}</p>
                </div>
              </div>
              <p className={cx('inline-block mt-3 font-type text-[13px] uppercase tracking-wider px-2 py-1 rounded-full',
                sel.v === 'help' ? 'bg-terra text-paper' : sel.v === 'copy' ? 'bg-moss text-paper' : 'bg-ink/10')}>
                {sel.res >= 0 ? '+' : '−'}{fmt(Math.abs(sel.res), 1)} pts · {VL[sel.v]}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-type text-[13px]">
                <dt className="opacity-60 uppercase">Residents</dt><dd className="text-right">{fmt(sel.t.population)} <SourceBadge id="statfinPop" kind="direct" /></dd>
                {FEATURES.map((f) => (
                  <FeatureRow key={f.key} label={f.label} value={sel.t[f.key]} />
                ))}
              </dl>
            </Card>
          ) : (
            <Card tone="stone" tilt={1} className="p-5">
              <Label>Tap a dot</Label>
              <p className="font-serif text-2xl italic mt-1 leading-tight">Town detail</p>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Seg items={[{ id: 'county', label: 'County' }, { id: 'all', label: 'Finland' }]} value={scope} onChange={setScope} />
          </div>
          <TownList title="Needs help" tone="terra" items={help} onPick={pick} activeId={townId} empty={scope === 'county' ? '—' : 'None flagged'} />
          <TownList title="Worth copying" tone="paper" items={copy} onPick={pick} activeId={townId} empty={scope === 'county' ? '—' : 'None flagged'} />
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="opacity-60 uppercase">{label}</dt>
      <dd className="text-right">{fmt(value, 1)} <SourceBadge id="statfinPop" kind="direct" /></dd>
    </>
  )
}

function TownList({ title, tone, items, onPick, activeId, empty }: {
  title: string; tone: 'terra' | 'paper'; items: { t: Town; res: number; a: number; v: Verdict }[]; onPick: (t: Town) => void; activeId: string | null; empty: string
}) {
  return (
    <Card tone={tone} tilt={tone === 'terra' ? -1 : 0.8} className="relative p-5">
      <div className="flex justify-between items-start">
        <Label className={tone === 'terra' ? '!opacity-80' : ''}>{title}</Label>
        {tone === 'terra' && items.some((d) => d.v === 'help') && <Stamp tone="paper" rotate={-14} className="!w-14 !h-14 -mt-2 -mr-2 [&>div]:!w-11 [&>div]:!h-11 [&_span]:!text-[7px]">Help<br />here</Stamp>}
      </div>
      <ul className="mt-1 space-y-1">
        {items.length === 0 && <li className="font-type text-xs opacity-60">{empty}</li>}
        {items.map((d) => (
          <li key={d.t.id}>
            <button onClick={() => onPick(d.t)}
              className={cx('w-full flex justify-between items-baseline gap-2 py-1 border-b border-black/15 text-left hover:opacity-70', activeId === d.t.id && 'font-bold')}>
              <span className="font-serif text-lg leading-tight truncate flex items-center gap-2">{d.t.name}{d.v !== 'ok' && <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', tone === 'terra' ? 'bg-paper' : 'bg-moss')} title="outlier" />}</span>
              <span className="font-type text-xs tabular-nums shrink-0">{d.res >= 0 ? '+' : '−'}{fmt(Math.abs(d.res), 1)}</span>
            </button>
          </li>
        ))}
      </ul>
      {tone === 'paper' && <Tear className="mt-3" left="pts vs predicted" right="↗" />}
    </Card>
  )
}
