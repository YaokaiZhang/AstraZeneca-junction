// Evidence: can the hospital keep up? Colonoscopies a week, people waiting and the wait over the next 12 months.
// The wait comes from Little's law (people waiting = colonoscopies a week × weeks of wait); see model.ts.
import { useState } from 'react'
import { Card, Toggle } from '../../components/ui'
import { useWidth } from '../county/bits'
import { SCREENING_FI, type ScreeningRow } from './data'
import { INVITED_SHARE_2031, WEEKS_PER_MONTH, in2031, n0, n1, type Plan, type Result } from './model'

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
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className="font-sans" style={{ fontSize: 12 }} fill="currentColor" opacity={0.6}>{t}</text>
          </g>
        ))}
        {[0, 13, 26, 39, 52].map((w) => (
          <text key={w} x={sx(w)} y={H - 8} textAnchor="middle" className="font-sans" style={{ fontSize: 12 }} fill="currentColor" opacity={0.6}>{w === 0 ? 'Now' : `${Math.round(w / WEEKS_PER_MONTH)} months`}</text>
        ))}
        {/* national wait */}
        <line x1={M.l} x2={W - M.r} y1={sy(SCREENING_FI.medianMonths)} y2={sy(SCREENING_FI.medianMonths)} stroke="#5E6B4E" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={W - M.r} y={sy(SCREENING_FI.medianMonths) - 6} textAnchor="end" className="font-sans" style={{ fontSize: 12 }} fill="#5E6B4E">Finland {n1(SCREENING_FI.medianMonths)} months</text>
        {/* today, flat */}
        <line x1={M.l} x2={W - M.r} y1={sy(today)} y2={sy(today)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="2 4" />
        <path d={`${line}L${sx(52)},${sy(0)}L${sx(0)},${sy(0)}Z`} fill={grow ? 'rgba(198,93,59,.16)' : 'rgba(94,107,78,.14)'} />
        <path d={line} fill="none" stroke={grow ? '#C65D3B' : '#1F1F1F'} strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx={sx(52)} cy={sy(tr[52])} r={4.5} fill={grow ? '#C65D3B' : '#1F1F1F'} />
        <text x={sx(52) - 8} y={sy(tr[52]) - 10} textAnchor="end" className="font-serif" style={{ fontSize: 20 }} fill="currentColor">{n1(tr[52])} months</text>
        {plan.catchUp && <line x1={sx(plan.catchUpWeeks)} x2={sx(plan.catchUpWeeks)} y1={M.t} y2={H - M.b} stroke="currentColor" strokeOpacity={0.25} />}
      </svg>
    </div>
  )
}

const about = (v: number) => {
  const a = Math.abs(v)
  return (a < 20 ? Math.round(a) : a < 100 ? Math.round(a / 5) * 5 : Math.round(a / 10) * 10).toLocaleString('en-GB')
}

export function Bottleneck({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const [show2031, setShow2031] = useState(false)
  const [how, setHow] = useState(false)
  const q = res.queue
  const extra = q.extraPerWeek
  const hasExtra = extra >= 0.05
  const y = in2031(r, res)
  const m = n1(r.medianMonths)
  const caption = !hasExtra
    ? plan.catchUp && q.catchUp >= 0.5
      ? <>With the catch-up lists, the wait comes down to about {n1(plan.targetMonths)} months within {plan.catchUpWeeks} weeks.</>
      : <>If nothing changes, the wait stays about {m} months.</>
    : plan.addCapacity
      ? <>With about {about(extra)} more colonoscopies a week, the wait holds at about {plan.catchUp ? n1(plan.targetMonths) : m} months.</>
      : <>With this plan, more people need a colonoscopy. Without about {about(extra)} more a week, the wait grows to about {about(q.waitIn12m)} months within a year.</>
  return (
    <div className="max-w-5xl">
      <p className="font-serif text-3xl sm:text-4xl leading-tight">
        Today {r.name} does about {about(q.arrivalsWeek)} colonoscopies a week. About {about(q.queueNow)} people are waiting, so a person waits about {m} months.
      </p>
      <Card className="mt-6 p-5 sm:p-6">
        <p className="font-serif text-xl">How long people wait, over the next 12 months</p>
        <p className="font-sans text-[16px] mt-1 mb-3">{caption}</p>
        <WaitChart res={res} plan={plan} today={r.medianMonths} />
        <p className="font-sans text-[13px] opacity-60 mt-2">Dotted line: today&apos;s wait. Dashed green line: the national wait.</p>
        <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8">
          <Toggle on={plan.addCapacity} onChange={(v) => setPlan({ ...plan, addCapacity: v })} label="Add the extra colonoscopies this needs" />
          <Toggle on={show2031} onChange={setShow2031} label="Show 2031 (screening widens to ages 56–74)" />
        </div>
      </Card>
      {show2031 && (
        <p className="rise mt-6 font-serif text-2xl sm:text-3xl leading-snug">
          By 2031, about {about((y.growth - 1) * 100)}% more people are invited, and {r.name} will need about <span className="text-terra italic">{about(y.extraWithFixesWeek)} more colonoscopies a week</span> than today{y.hasFixes ? ', with this plan' : ''}.
        </p>
      )}
      <p className="mt-4 font-sans text-[13px] opacity-60">
        Our estimate from the Cancer Registry figures{show2031 ? ' and Statistics Finland population 2025' : ''}. <button onClick={() => setHow(!how)} className="underline underline-offset-2 hover:text-terra">{how ? 'Hide' : 'How we worked it out'}</button>
      </p>
      {how && (
        <div className="rise mt-2 font-sans text-[13px] leading-relaxed opacity-80 bg-black/[.04] rounded p-3">
          Colonoscopies a week = {n0(r.colonoscopyDone)} in 2024 ÷ 52 = {n1(q.arrivalsWeek)}. People waiting = colonoscopies a week × weeks of wait ({n1(q.arrivalsWeek)} × {n1(q.waitWeeks)}) = {n0(q.queueNow)} (Little&apos;s law; it treats the published median wait as the average).
          {hasExtra && <> The applied fixes add {n0(res.total.colonoscopies)} colonoscopies a year = {n1(extra)} a week; if nobody adds them, the queue grows by that much each week.</>}
          <br />2031: people aged 56–74 ({n0(y.pop5674)}) × 10/19 (even ages, every two years; {INVITED_SHARE_2031.toFixed(3)}) = {n0(y.invited2031)} invited, against {n0(r.invited)} in 2024. Colonoscopies grow by the same factor ({y.growth.toFixed(2)}): {n1(y.withFixesWeek)} a week against {n1(y.todayWeek)} today. It ignores ageing to 2031 and that younger people test positive less often.
        </div>
      )}
    </div>
  )
}
