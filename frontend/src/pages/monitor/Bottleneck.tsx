// Section 4: the bottleneck warning. Little's law on colonoscopy demand; wait projected 12 months ahead.
import { useState } from 'react'
import { Card, Label, SourceBadge, Toggle, cx } from '../../components/ui'
import { useWidth } from '../county/bits'
import { SCREENING_FI, type ScreeningRow } from './data'
import { INVITED_SHARE_2031, WEEKS_PER_MONTH, in2031, n0, n1, signed, type Plan, type Result } from './model'

function WaitChart({ res, plan, today }: { res: Result; plan: Plan; today: number }) {
  const [ref, W] = useWidth<HTMLDivElement>(520)
  const H = 210, M = { l: 34, r: 12, t: 14, b: 28 }
  const tr = res.queue.trajectory
  const max = Math.max(4, Math.ceil(Math.max(...tr, today) + 0.5))
  const sx = (w: number) => M.l + (w / 52) * (W - M.l - M.r)
  const sy = (m: number) => H - M.b - (m / max) * (H - M.t - M.b)
  const line = tr.map((m, w) => `${w ? 'L' : 'M'}${sx(w).toFixed(1)},${sy(m).toFixed(1)}`).join('')
  const grow = tr[52] > today + 0.05
  const ticks = Array.from({ length: max + 1 }, (_, i) => i)
  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} className="block overflow-visible" role="img" aria-label={`Median wait over the next 12 months: from ${n1(today)} to ${n1(tr[52])} months`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="currentColor" strokeOpacity={0.1} />
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className="font-type" style={{ fontSize: 12 }} fill="currentColor" opacity={0.6}>{t}</text>
          </g>
        ))}
        {[0, 13, 26, 39, 52].map((w) => (
          <text key={w} x={sx(w)} y={H - 8} textAnchor="middle" className="font-type uppercase" style={{ fontSize: 12 }} fill="currentColor" opacity={0.6}>{w === 0 ? 'now' : `${Math.round(w / WEEKS_PER_MONTH)} mo`}</text>
        ))}
        {/* national wait */}
        <line x1={M.l} x2={W - M.r} y1={sy(SCREENING_FI.medianMonths)} y2={sy(SCREENING_FI.medianMonths)} stroke="#5E6B4E" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={W - M.r} y={sy(SCREENING_FI.medianMonths) - 6} textAnchor="end" className="font-type uppercase" style={{ fontSize: 12 }} fill="#5E6B4E">Finland {n1(SCREENING_FI.medianMonths)}</text>
        {/* today, flat */}
        <line x1={M.l} x2={W - M.r} y1={sy(today)} y2={sy(today)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="2 4" />
        <path d={`${line}L${sx(52)},${sy(0)}L${sx(0)},${sy(0)}Z`} fill={grow ? 'rgba(198,93,59,.16)' : 'rgba(94,107,78,.14)'} />
        <path d={line} fill="none" stroke={grow ? '#C65D3B' : '#1F1F1F'} strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx={sx(52)} cy={sy(tr[52])} r={4.5} fill={grow ? '#C65D3B' : '#1F1F1F'} />
        <text x={sx(52) - 8} y={sy(tr[52]) - 10} textAnchor="end" className="font-serif" style={{ fontSize: 20 }} fill="currentColor">{n1(tr[52])} mo</text>
        {plan.catchUp && <line x1={sx(plan.catchUpWeeks)} x2={sx(plan.catchUpWeeks)} y1={M.t} y2={H - M.b} stroke="currentColor" strokeOpacity={0.25} />}
      </svg>
    </div>
  )
}

/** 2031: the target group widens to everyone aged 56–74. Demand at today's rates, plus the chosen fixes scaled the same way. */
function Year2031({ r, res }: { r: ScreeningRow; res: Result }) {
  const [on, setOn] = useState(false)
  const y = in2031(r, res)
  const fi = in2031(SCREENING_FI)
  const pct = (y.growth - 1) * 100
  const need = y.extraWithFixesWeek
  const how = (
    <>invites in 2031 = people aged 56–74 × 10/19 (even ages, every two years)<br />
      = {n0(y.pop5674)} × {INVITED_SHARE_2031.toFixed(3)} = {n0(y.invited2031)}<br />
      growth = {n0(y.invited2031)} ÷ {n0(r.invited)} invited in 2024 = × {y.growth.toFixed(2)}<br />
      demand = ({n0(r.colonoscopyDone)} colonoscopies{y.hasFixes ? <> + {n0(res.total.colonoscopies)} from the fixes</> : null}) × {y.growth.toFixed(2)} ÷ 52 = {n1(y.withFixesWeek)}/wk<br />
      extra = {n1(y.withFixesWeek)} − {n1(y.todayWeek)} today = {signed(need, n1)}/wk<br />
      Finland: {signed((fi.growth - 1) * 100)}% invites, {signed(fi.extraWeek, n1)} colonoscopies a week.<br />
      Ignores ageing to 2031 and lower positivity in younger people.</>
  )
  return (
    <Card tone={on ? 'mustard' : 'paper'} className="mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Label className="!opacity-80 flex items-center gap-2">2031: everyone aged 56–74 is invited <SourceBadge id="bowelExpansion" kind="direct" demo={false} /></Label>
        <Toggle on={on} onChange={setOn} label={on ? 'Showing 2031' : 'Show 2031'} />
      </div>
      {on ? (
        <div className="mt-4 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start rise">
          <div>
            <p className="font-serif text-4xl sm:text-5xl leading-[1.02] flex items-baseline gap-2 flex-wrap">
              <span>By 2031, needs <span className="italic">{signed(need, n1)}</span> colonoscopies a week</span>
              <SourceBadge id="ourModel" kind="estimate" demo={false} how={how} />
            </p>
            <p className="font-sans text-[16px] leading-snug mt-3 opacity-90">
              Over today&apos;s {n1(y.todayWeek)} a week{y.hasFixes ? <>, with the chosen fixes scaled the same way</> : <>, at today&apos;s rates and before any fix</>}.
              {y.hasFixes && <> Without the fixes: {signed(y.extraWeek, n1)} a week.</>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              [`${signed(pct)}%`, 'invites vs 2024'],
              [`${n0(r.invited)} → ${n0(y.invited2031)}`, 'people invited a round'],
              [`${n1(y.todayWeek)} → ${n1(y.withFixesWeek)}`, 'colonoscopies a week'],
              [`${signed((fi.growth - 1) * 100)}% · ${signed(fi.extraWeek, n1)}`, 'Finland: invites · a week'],
            ].map(([v, t]) => (
              <div key={t} className="border-b border-black/15 pb-2 min-w-0">
                <p className="font-serif text-2xl sm:text-3xl leading-none">{v}</p>
                <p className="font-type text-[13px] uppercase tracking-wider opacity-70 mt-1">{t}</p>
              </div>
            ))}
          </div>
          <p className="lg:col-span-2 font-sans text-[13px] italic opacity-70">
            Estimate. It ignores the population ageing between now and 2031, and that younger people test positive less often.
          </p>
        </div>
      ) : (
        <p className="mt-2 font-sans text-[15px] opacity-70">Screening invites ages 60–72 today, and everyone aged 56–74 from 2031. Turn on to see the colonoscopies a week {r.name} will need.</p>
      )}
    </Card>
  )
}

export function Bottleneck({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const q = res.queue
  const need = q.extraPerWeek
  const warn = q.overCapacity
  const quiet = need < 0.05
  const how = (
    <>Little&apos;s law, L = arrivals × wait.<br />
      arrivals = {n0(r.colonoscopyDone)} colonoscopies ÷ 52 = {n1(q.arrivalsWeek)}/wk (today&apos;s throughput, taken as today&apos;s capacity)<br />
      wait = {n1(r.medianMonths)} mo × {WEEKS_PER_MONTH} = {n1(q.waitWeeks)} wk<br />
      queue = {n1(q.arrivalsWeek)} × {n1(q.waitWeeks)} = {n0(q.queueNow)}<br />
      new demand = {n1(q.arrivalsWeek)} + {n0(res.total.colonoscopies)} ÷ 52 = {n1(q.newArrivalsWeek)}/wk<br />
      Uses the median wait as if it were the mean: an estimate.</>
  )
  return (
    <>
    <div className="grid lg:grid-cols-[minmax(0,400px)_1fr] gap-6 items-stretch">
      <Card tone={warn ? 'terra' : quiet ? 'paper' : 'mustard'} className="p-6 sm:p-7 flex flex-col">
        <Label className="!opacity-80 flex items-center gap-2">{warn ? 'Bottleneck ahead' : quiet ? 'No extra demand yet' : 'Capacity added'} <SourceBadge id="ourModel" kind="estimate" demo={false} how={how} /></Label>
        {quiet ? (
          <p className="font-serif text-3xl leading-tight mt-3">Turn on a fix above to see what it does to colonoscopy demand.</p>
        ) : (
          <>
            <p className="font-serif text-4xl sm:text-5xl leading-[1.02] mt-3">
              Needs <span className="italic">{signed(need, n1)}</span> colonoscopies a week{warn ? <>, or the wait keeps growing.</> : '.'}
            </p>
            <p className="font-sans text-[16px] leading-snug mt-3 opacity-90">
              {warn
                ? <>Demand goes from {n1(q.arrivalsWeek)} to {n1(q.newArrivalsWeek)} a week. Without more lists the median wait reaches <b>{n1(q.waitIn12m)} months</b> within a year.</>
                : <>Demand goes from {n1(q.arrivalsWeek)} to {n1(q.newArrivalsWeek)} a week, and capacity grows with it.</>}
            </p>
          </>
        )}
        <div className="mt-auto pt-5">
          <Toggle on={plan.addCapacity} onChange={(v) => setPlan({ ...plan, addCapacity: v })}
            label={quiet ? 'Add the capacity the fixes need' : `Add ${n1(need)} a week`} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6 min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            [n1(q.arrivalsWeek), 'colonoscopies / wk today'],
            [n0(q.queueNow), 'waiting now (est.)'],
            [n1(q.newArrivalsWeek), 'demand / wk with fixes'],
            [q.catchUp < 0.5 ? '0' : n0(q.catchUp), `catch-up to ${n1(plan.targetMonths)} mo`],
          ].map(([v, t]) => (
            <div key={t} className="border-b border-black/10 pb-2">
              <p className="font-serif text-3xl leading-none">{v}</p>
              <p className="font-type text-[13px] uppercase tracking-wider opacity-70 mt-1">{t}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-between items-baseline gap-2">
          <Label>Median wait, next 12 months (months)</Label>
          <span className={cx('font-type text-[13px] uppercase tracking-wider', plan.catchUp ? '' : 'opacity-60')}>
            {plan.catchUp ? `with catch-up, ${plan.catchUpWeeks} weeks` : 'catch-up off'}{plan.addCapacity ? ' · capacity added' : ''}
          </span>
        </div>
        <div className="mt-2"><WaitChart res={res} plan={plan} today={r.medianMonths} /></div>
        <p className="font-sans text-[13px] opacity-60 mt-2">Estimate: queue grows by (demand − capacity) each week; wait ≈ queue ÷ capacity. Dotted line = today&apos;s wait.</p>
      </Card>
    </div>
    <Year2031 r={r} res={res} />
    </>
  )
}
