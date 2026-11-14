// The two-minute view of the monitor: a verdict, three plain tiles, one recommended action and what it takes.
// Every number comes from model.ts (the same calculations as the evidence below); only the wording is simpler.
import type { ReactNode } from 'react'
import { Label, Toggle, cx } from '../../components/ui'
import { SCREENING_FI, type ScreeningRow } from './data'
import {
  DETECTION_FIXES, EMPTY_PLAN, evaluate, flags, in2031, losses, n0, n1,
  type Plan, type Result, type Step,
} from './model'
import { about, weakestStep } from './plain'

const waitRatio = (r: ScreeningRow) => r.medianMonths / SCREENING_FI.medianMonths
const waitWords = (r: ScreeningRow) => {
  const x = waitRatio(r)
  return x >= 1.75 && x <= 2.25 ? `about twice the national ${n1(SCREENING_FI.medianMonths)}`
    : x > 2.25 ? `more than twice the national ${n1(SCREENING_FI.medianMonths)}`
    : `against ${n1(SCREENING_FI.medianMonths)} nationally`
}

/** One or two plain sentences for the top of the page. */
export function Verdict({ r }: { r: ScreeningRow }) {
  const f = flags(r)
  const n = Object.values(f).filter(Boolean).length
  const w = weakestStep(r)
  const hl = (x: ReactNode) => <span className="italic text-terra">{x}</span>
  if (n === 0) {
    return <>{r.name} is on track at every step of bowel cancer screening. The step closest to slipping is {w === 'detection' ? 'getting kits sent back' : w === 'referral' ? 'the follow-up colonoscopy' : 'the wait for a colonoscopy'}.</>
  }
  const main = w === 'referral'
    ? <>{n === 3 ? 'The biggest loss: ' : `${r.name}'s biggest problem is follow-up: `}{hl(`${n0(r.noColonoscopy)} people`)} with a positive test never had the follow-up colonoscopy.</>
    : w === 'capacity'
      ? <>{n === 3 ? 'The biggest problem is the wait: ' : `${r.name}'s problem is the wait: `}people wait {hl(`${n1(r.medianMonths)} months`)} for a colonoscopy, {waitWords(r)}.</>
      : <>{n === 3 ? 'The biggest loss: ' : `${r.name}'s problem is the first step: `}{hl(n0(r.invited - r.participated))} of {n0(r.invited)} people invited never sent the kit back.</>
  // a second problem, in one short sentence
  const other = (['referral', 'capacity', 'detection'] as Step[]).find((s) => s !== w && f[s])
  const second = n === 2 && other
    ? other === 'capacity' ? <> People also wait {n1(r.medianMonths)} months for a colonoscopy, {waitWords(r)}.</>
      : other === 'referral' ? <> And {n0(r.noColonoscopy)} people with a positive test were never followed up.</>
      : <> And {n0(r.invited - r.participated)} invited people never sent the kit back.</>
    : null
  return <>{n === 3 && <>{r.name} loses people at every step. </>}{main}{second}</>
}

const TILES: Record<Step, { title: string }> = {
  detection: { title: 'Kit sent back' },
  referral: { title: 'Colonoscopy done' },
  capacity: { title: 'Wait for colonoscopy' },
}
const STEPS: Step[] = ['detection', 'referral', 'capacity']

function Tile({ step, i, r }: { step: Step; i: number; r: ScreeningRow }) {
  const behind = flags(r)[step]
  const hero = weakestStep(r) === step && behind
  const fi = SCREENING_FI
  const l = losses(r)
  const big = step === 'detection' ? `${n1(r.participationPct)}%` : step === 'referral' ? `${n1(r.colonoscopyOfPositivesPct)}%` : <>{n1(r.medianMonths)}<span className="text-2xl ml-2">months</span></>
  const vs = step === 'detection' ? `${n1(fi.participationPct)}%` : step === 'referral' ? `${n1(fi.colonoscopyOfPositivesPct)}%` : `${n1(fi.medianMonths)} months`
  const line = step === 'detection' ? <>{n0(l.detection.lost)} people did not send it back</>
    : step === 'referral' ? <>{n0(r.noColonoscopy)} with a positive test not followed up</>
    : waitRatio(r) >= 1.15 ? <>{waitRatio(r) >= 1.75 && waitRatio(r) <= 2.25 ? 'About twice' : `About ${n1(waitRatio(r))} times`} the national wait</>
    : waitRatio(r) <= 0.85 ? <>Shorter than the national wait</>
    : <>Close to the national wait</>
  return (
    <li className={cx('rounded-xl p-6 flex flex-col min-w-0', hero ? 'bg-terra text-paper shadow-xl -rotate-1' : 'bg-black/[.04]')}>
      <div className="flex items-center justify-between gap-3">
        <span className={cx('w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl shrink-0', hero ? 'bg-paper text-terra' : 'border border-ink')}>{i + 1}</span>
        <span className={cx('font-type text-[13px] uppercase tracking-widest', hero ? 'opacity-90' : behind ? 'text-terra' : 'opacity-60')}>{behind ? 'Falling behind' : 'On track'}</span>
      </div>
      <p className="mt-5 label !opacity-80">{TILES[step].title}</p>
      <p className={cx('mt-2 font-serif text-6xl leading-none', behind && !hero && 'text-terra')}>{big}</p>
      <p className="mt-2 font-type text-[13px] uppercase tracking-wider opacity-70">Finland {vs}</p>
      <p className="mt-auto pt-5 font-sans text-[16px] leading-snug">{line}</p>
    </li>
  )
}

export function SimpleChain({ r }: { r: ScreeningRow }) {
  return (
    <ol className="grid md:grid-cols-3 gap-5" aria-label="The three steps of bowel cancer screening">
      {STEPS.map((s, i) => <Tile key={s} step={s} i={i} r={r} />)}
    </ol>
  )
}

const DET = DETECTION_FIXES.find((d) => d.id === 'reminder')!

/** The one recommended action for the weakest step, with a switch that applies it to the plan. */
export function Recommend({ r, plan, setPlan, res, otherOptions }: {
  r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result; otherOptions?: ReactNode
}) {
  const w = weakestStep(r)
  const behind = flags(r)[w]
  let title: string, text: ReactNode, result: ReactNode, on: boolean, set: (v: boolean) => void
  if (w === 'referral') {
    const alone = evaluate(r, { ...EMPTY_PLAN, referral: ['navigation'] }).referral
    title = 'Follow up every positive test'
    text = <>Give the screening nurse a daily list of everyone with a positive test who hasn&apos;t booked a colonoscopy, and call them. Every county already has screening nurses; this gives them the list.</>
    result = <>About {about(alone.colonoscopies)} more colonoscopies a year, about {about(alone.cancers)} cancers found earlier.</>
    on = plan.referral.includes('navigation')
    set = (v) => setPlan({ ...plan, referral: v ? [...plan.referral.filter((x) => x !== 'navigation'), 'navigation'] : plan.referral.filter((x) => x !== 'navigation') })
  } else if (w === 'detection') {
    const pts = DET.pts(r)
    const alone = evaluate(r, { ...EMPTY_PLAN, detectionPts: pts, detectionFix: 'reminder' }).detection
    title = 'Remind people who haven’t sent the kit back'
    text = <>Send a second letter or text message to everyone who hasn&apos;t returned the kit a few weeks after the invitation.</>
    result = <>About {about(alone.kits)} more kits sent back a year, about {about(alone.colonoscopies)} more colonoscopies.</>
    on = plan.detectionFix === 'reminder'
    set = (v) => setPlan(v ? { ...plan, detectionFix: 'reminder', detectionPts: pts } : { ...plan, detectionFix: null, detectionPts: 0 })
  } else {
    const c = res.queue.catchUp
    title = 'Clear the queue for colonoscopy'
    text = <>Run extra evening or weekend colonoscopy lists for {plan.catchUpWeeks} weeks until the wait is back to about {n1(plan.targetMonths)} months.</>
    result = c < 0.5 ? <>No extra lists are needed: the wait is already at the target.</>
      : <>About {about(c)} extra colonoscopies in total, about {about(c / plan.catchUpWeeks)} a week for {plan.catchUpWeeks} weeks.</>
    on = plan.catchUp
    set = (v) => setPlan({ ...plan, catchUp: v })
  }
  return (
    <div className={cx('rounded-xl p-6 sm:p-8 shadow-lg transition-colors grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 lg:gap-10', on ? 'bg-ink text-paper' : 'bg-mustard')}>
      <div className="flex gap-5">
        <span className={cx('w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl shrink-0', on ? 'bg-mustard text-ink' : 'bg-ink text-mustard')}>1</span>
        <div className="min-w-0">
          <Label className="!opacity-70">{behind ? 'Start here' : 'All on track · to do even better'}</Label>
          <p className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">{title}</p>
          <p className="mt-3 font-sans text-[17px] leading-relaxed opacity-85">{text}</p>
        </div>
      </div>
      <div className={cx('flex flex-col justify-between gap-5 lg:pl-10 lg:border-l', on ? 'border-paper/20' : 'border-ink/15')}>
        <div>
          <Label className="!opacity-70">Expected result</Label>
          <p className="mt-2 font-serif text-2xl leading-snug">{result}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle on={on} onChange={set} label={on ? 'In the plan' : 'Add to the plan'} />
          {otherOptions}
        </div>
      </div>
    </div>
  )
}

function Fig({ label, value, unit, hot }: { label: ReactNode; value: string; unit: string; hot?: boolean }) {
  return (
    <div>
      <Label className="!opacity-70">{label}</Label>
      <p className={cx('mt-2 font-serif text-6xl leading-none', hot && 'text-terra')}>{value}<span className="text-2xl ml-2">{unit}</span></p>
    </div>
  )
}

/** Colonoscopy capacity the plan and 2031 need, as at most three figures. */
export function WhatItTakes({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const now = res.queue.extraPerWeek
  const y = in2031(r, res)
  const hasNow = now >= 0.5
  const by31 = hasNow ? y.extraWithFixesWeek : y.extraWeek
  return (
    <div>
      <div className="flex flex-wrap gap-x-14 gap-y-8">
        {hasNow && <Fig label="Extra colonoscopies now" value={about(now)} unit="a week" hot />}
        <Fig label="Extra by 2031 · ages 56–74" value={about(by31)} unit="a week" hot={!hasNow} />
        {hasNow && !plan.addCapacity && <Fig label="Wait in a year without them" value={n1(res.queue.waitIn12m)} unit="months" />}
      </div>
      <p className="mt-6 font-sans text-[17px] leading-relaxed opacity-80 max-w-2xl">
        {hasNow ? <>Colonoscopies on top of what {r.name} does today, so the wait does not grow.</> : <>{r.name} keeps up today. Screening widens to everyone aged 56–74 by 2031.</>}
      </p>
      {hasNow && (
        <div className="mt-6">
          <Toggle on={plan.addCapacity} onChange={(v) => setPlan({ ...plan, addCapacity: v })} label={`Add ${about(now)} a week to the plan`} />
        </div>
      )}
    </div>
  )
}
