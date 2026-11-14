// Section 3: proven fixes. Each card carries its measured effect, its source and what it would do in this county.
import type { ReactNode } from 'react'
import { Card, Label, SourceBadge, Toggle, cx } from '../../components/ui'
import { Slider } from '../county/bits'
import { type ScreeningRow } from './data'
import {
  DETECTION_FIXES, GOAL_PARTICIPATION, REFERRAL_FIXES, base, evaluate, flags, headroom, n0, n1, signed,
  type Fix, type Plan, type Result, type Step,
  STEP_META,
} from './model'

const srcBadge = (f: Fix, how?: ReactNode) => <SourceBadge id={f.source} kind={f.source === 'ours' ? 'estimate' : 'direct'} demo={false} how={how} />

function FixCard({ fix, on, onClick, impact, sub, disabled }: {
  fix: Fix; on: boolean; onClick: () => void; impact: ReactNode; sub?: ReactNode; disabled?: boolean
}) {
  return (
    <div role="button" tabIndex={disabled ? -1 : 0} aria-pressed={on} aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      className={cx('rounded-lg border p-4 transition-all outline-none text-left',
        disabled ? 'opacity-45 cursor-not-allowed border-black/10' : 'cursor-pointer',
        on ? 'bg-ink text-paper border-ink shadow-lg' : !disabled && 'border-black/15 hover:border-ink hover:-translate-y-0.5 bg-paper')}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-xl leading-tight">{fix.name}</p>
        <span className={cx('w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center', on ? 'border-mustard bg-mustard' : 'border-current opacity-50')}>
          {on && <span className="w-2 h-2 rounded-full bg-ink" />}
        </span>
      </div>
      <p className="font-sans text-[14px] leading-snug opacity-80 mt-1">{fix.what}</p>
      {fix.local && <p className={cx('font-sans text-[14px] leading-snug mt-2 pl-3 border-l-2', on ? 'border-mustard' : 'border-terra/60')}>{fix.local}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cx('font-type text-[13px] uppercase tracking-wider px-2 py-0.5 rounded-full', on ? 'bg-mustard text-ink' : 'bg-black/[.07]')}>{fix.effect}</span>
        <span onClick={(e) => e.stopPropagation()}>{srcBadge(fix)}</span>
      </div>
      <p className={cx('mt-3 font-serif text-2xl leading-none', on ? 'text-mustard' : '')}>{impact}</p>
      {sub && <p className="font-type text-[13px] uppercase tracking-wider opacity-70 mt-1">{sub}</p>}
      {fix.caveat && <p className="font-sans text-[13px] italic opacity-60 mt-2">{fix.caveat}</p>}
    </div>
  )
}

function Column({ step, weak, children, note }: { step: Step; weak: boolean; children: ReactNode; note?: ReactNode }) {
  const m = STEP_META[step]
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={cx('w-2.5 h-2.5 rounded-full', weak ? 'bg-terra' : 'bg-stone')} />
        <Label>{m.n} · {m.short}{weak ? ' · leaks' : ''}</Label>
      </div>
      <div className="space-y-3">{children}</div>
      {note && <p className="font-sans text-[13px] leading-snug opacity-65 mt-3">{note}</p>}
    </div>
  )
}

export function Fixes({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const f = flags(r)
  const b = base(r)
  const room = headroom(r)
  // what one referral fix would add alone, for its card
  const alone = (id: string) => evaluate(r, { ...plan, referral: [id], detectionPts: 0 }).referral.colonoscopies
  const toggleRef = (id: string) => setPlan({ ...plan, referral: plan.referral.includes(id) ? plan.referral.filter((x) => x !== id) : [...plan.referral, id] })
  const strongest = res.referral.fix

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-6">
        <Column step="referral" weak={f.referral}
          note={plan.referral.length > 1 ? <>Several picked: only the strongest, <b>{strongest?.name}</b>, counts. Effects are not multiplied together.</> : <>Pick several and only the strongest counts. Follow-through is capped at 95%.</>}>
          {REFERRAL_FIXES.map((fx) => {
            const add = alone(fx.id)
            return (
              <FixCard key={fx.id} fix={fx} on={plan.referral.includes(fx.id)} onClick={() => toggleRef(fx.id)}
                impact={<>{signed(add)} <span className="font-type text-sm opacity-70">colonoscopies / yr</span></>}
                sub={`≈ ${n1(add * b.yieldCancer)} cancers · ${n0(add * b.yieldPrecursor)} precursors`} />
            )
          })}
        </Column>

        <Column step="detection" weak={f.detection}
          note={<>Patient navigation for screening (RR 2.01) comes from low US baselines and is not applied here. The goal is {GOAL_PARTICIPATION}% (National Cancer Strategy, Goal 2).</>}>
          {DETECTION_FIXES.map((fx) => {
            const pts = fx.pts(r)
            const on = plan.detectionFix === fx.id
            return (
              <FixCard key={fx.id} fix={fx} on={on} disabled={room <= 0}
                onClick={() => setPlan(on ? { ...plan, detectionFix: null, detectionPts: 0 } : { ...plan, detectionFix: fx.id, detectionPts: pts })}
                impact={<>{signed(pts, n1)} <span className="font-type text-sm opacity-70">pts kit return</span></>}
                sub={<>{fx.how(r)} · ≈ {n0(r.invited * pts / 100)} more kits
                  {fx.id === 'multilingual' && <span className="ml-1.5 normal-case" onClick={(e) => e.stopPropagation()}><SourceBadge id="statfinLang" kind="direct" demo={false} /></span>}</>} />
            )
          })}
          <Card className="p-4">
            <Slider label="Kit return gain" value={plan.detectionPts} min={0} max={Math.max(0.1, Math.round(room * 10) / 10)} step={0.1}
              onChange={(v) => setPlan({ ...plan, detectionPts: v, detectionFix: null })}
              display={<>{signed(plan.detectionPts, n1)}<span className="font-type text-sm opacity-60">pts</span></>} />
            <div className="flex justify-between items-center mt-2 font-type text-[13px] uppercase tracking-wider">
              <span className="opacity-70">{n1(r.participationPct)}% → {n1(r.participationPct + plan.detectionPts)}%</span>
              <button disabled={room <= 0} onClick={() => setPlan({ ...plan, detectionPts: Math.round(room * 10) / 10, detectionFix: null })}
                className="underline underline-offset-2 hover:text-terra disabled:opacity-40">Reach {GOAL_PARTICIPATION}%</button>
            </div>
          </Card>
        </Column>

        <Column step="capacity" weak={f.capacity}
          note={<>Catch-up is a one-off to clear today&apos;s excess queue. The weekly capacity the fixes need is in the bottleneck panel below.</>}>
          <Card className={cx('p-4', plan.catchUp && '!bg-ink !text-paper')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-xl leading-tight">Catch-up colonoscopy sessions</p>
                <p className="font-sans text-[14px] leading-snug opacity-80 mt-1">Extra evening or weekend lists until the wait is back to target.</p>
              </div>
              <Toggle on={plan.catchUp} onChange={(v) => setPlan({ ...plan, catchUp: v })} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={cx('font-type text-[13px] uppercase tracking-wider px-2 py-0.5 rounded-full', plan.catchUp ? 'bg-mustard text-ink' : 'bg-black/[.07]')}>Sized by queue model</span>
              <SourceBadge id="ourModel" kind="estimate" demo={false}
                how={<>catch-up = arrivals/wk × (wait − target)<br />= {n1(res.queue.arrivalsWeek)} × ({n1(res.queue.waitWeeks)} − {n1(res.queue.targetWeeks)}) weeks<br />= {n0(res.queue.catchUp)}</>} />
            </div>
            <p className={cx('mt-3 font-serif text-2xl leading-none', plan.catchUp && 'text-mustard')}>
              {res.queue.catchUp < 0.5 ? 'Not needed' : <>{n0(res.queue.catchUp)} <span className="font-type text-sm opacity-70">one-off colonoscopies</span></>}
            </p>
            {res.queue.catchUp >= 0.5 && <p className="font-type text-[13px] uppercase tracking-wider opacity-70 mt-1">≈ {n1(res.queue.catchUp / plan.catchUpWeeks)} a week for {plan.catchUpWeeks} weeks</p>}
            <p className="font-sans text-[13px] italic opacity-60 mt-2">Our calculation, not a trial result</p>
          </Card>
          <Card className="p-4 space-y-5">
            <Slider label="Target wait" value={plan.targetMonths} min={0.8} max={Math.max(3, Math.ceil(r.medianMonths * 2) / 2)} step={0.1}
              onChange={(v) => setPlan({ ...plan, targetMonths: v })}
              display={<>{n1(plan.targetMonths)}<span className="font-type text-sm opacity-60">mo</span></>} />
            <Slider label="Catch-up spread over" value={plan.catchUpWeeks} min={4} max={26} step={1}
              onChange={(v) => setPlan({ ...plan, catchUpWeeks: v })}
              display={<>{plan.catchUpWeeks}<span className="font-type text-sm opacity-60">weeks</span></>} />
          </Card>
        </Column>
      </div>

      {/* the gain, all fixes together */}
      <Card tone="ink" className="mt-8 p-5 sm:p-7">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            [res.total.colonoscopies, 'extra colonoscopies a year', n0],
            [res.total.cancers, 'cancers found earlier', n1],
            [res.total.precursors, 'precursors removed', n0],
          ].map(([v, t, fmt]) => (
            <div key={t as string}>
              <p className="font-serif text-6xl leading-none text-mustard">{signed(v as number, fmt as (x: number) => string)}</p>
              <p className="font-type text-sm uppercase tracking-widest opacity-80 mt-2">{t as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-paper/20 flex flex-wrap gap-x-6 gap-y-2 font-type text-sm uppercase tracking-wider opacity-80 items-center">
          <span>Kit return {n1(r.participationPct)}% → {n1(r.participationPct + res.detection.pts)}%</span>
          <span>Colonoscopy after positive {n1(b.c * 100)}% → {n1(res.referral.cNew * 100)}%</span>
          <SourceBadge id="ourModel" kind="estimate" demo={false}
            how={<>referral: positives × (c_new − c) = {n0(r.testPositive)} × ({n1(res.referral.cNew * 100)}% − {n1(b.c * 100)}%) = {n0(res.referral.colonoscopies)}<br />
              detection: invited × Δp × positive rate × c_new = {n0(r.invited)} × {n1(res.detection.pts)}% × {n1(b.pos * 100)}% × {n1(res.referral.cNew * 100)}% = {n0(res.detection.colonoscopies)}<br />
              cancers = colonoscopies × {r.cancers}/{r.colonoscopyDone}; precursors × {r.precursors}/{r.colonoscopyDone} (this county&apos;s 2024 yield)</>} />
        </div>
      </Card>
    </div>
  )
}
