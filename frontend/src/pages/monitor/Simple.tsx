// The two-minute view of the monitor: a verdict, three plain tiles, one recommended action and what it takes.
// Every number comes from model.ts (the same calculations as the evidence below); only the wording is simpler.
import type { ReactNode } from 'react'
import { Card, Label, Toggle, cx } from '../../components/ui'
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
    ? <>{n === 3 ? 'The biggest loss: ' : `${r.name}'s biggest problem is follow-up: `}{hl(`${n0(r.noColonoscopy)} people`)} with a positive test have no recorded follow-up colonoscopy.</>
    : w === 'capacity'
      ? <>{n === 3 ? 'The biggest problem is the wait: ' : `${r.name}'s problem is the wait: `}people wait {hl(`${n1(r.medianMonths)} months`)} for a colonoscopy, {waitWords(r)}.</>
      : <>{n === 3 ? 'The biggest loss: ' : `${r.name}'s problem is the first step: `}{hl(n0(r.invited - r.participated))} of {n0(r.invited)} people invited never sent the kit back.</>
  // a second problem, in one short sentence
  const other = (['referral', 'capacity', 'detection'] as Step[]).find((s) => s !== w && f[s])
  const second = n === 2 && other
    ? other === 'capacity' ? <> People also wait {n1(r.medianMonths)} months for a colonoscopy, {waitWords(r)}.</>
      : other === 'referral' ? <> And {n0(r.noColonoscopy)} people with a positive test have no recorded follow-up colonoscopy.</>
      : <> And {n0(r.invited - r.participated)} invited people never sent the kit back.</>
    : null
  return <>{n === 3 && <>{r.name} loses people at every step. </>}{main}{second}</>
}

const TILES: Record<Step, { title: string }> = {
  detection: { title: 'Send the kit back' },
  referral: { title: 'Get the colonoscopy' },
  capacity: { title: 'Wait for it' },
}

function Tile({ step, r }: { step: Step; r: ScreeningRow }) {
  const behind = flags(r)[step]
  const fi = SCREENING_FI
  const l = losses(r)
  const big = step === 'detection' ? `${n1(r.participationPct)}%` : step === 'referral' ? `${n1(r.colonoscopyOfPositivesPct)}%` : `${n1(r.medianMonths)} months`
  const vs = step === 'detection' ? `${n1(fi.participationPct)}%` : step === 'referral' ? `${n1(fi.colonoscopyOfPositivesPct)}%` : `${n1(fi.medianMonths)} months`
  const line = step === 'detection' ? <>{n0(l.detection.lost)} people did not send it back</>
    : step === 'referral' ? <>{n0(r.noColonoscopy)} people with no recorded follow-up</>
    : waitRatio(r) >= 1.15 ? <>{waitRatio(r) >= 1.75 && waitRatio(r) <= 2.25 ? 'About twice' : `About ${n1(waitRatio(r))} times`} as long as the national wait</>
    : waitRatio(r) <= 0.85 ? <>Shorter than the national wait</>
    : <>Close to the national wait</>
  return (
    <div className={cx('rounded-lg border p-5 sm:p-6 bg-paper min-w-0', behind ? 'border-terra/60' : 'border-black/15')}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-2xl leading-tight">{TILES[step].title}</p>
        <span className={cx('font-type text-[13px] uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0',
          behind ? 'bg-terra text-paper' : 'bg-[#E2EDE6] text-[#2F5A44]')}>{behind ? 'Falling behind' : 'On track'}</span>
      </div>
      <p className={cx('mt-5 font-serif text-5xl sm:text-6xl leading-none', behind && 'text-terra')}>{big}</p>
      <p className="mt-2 font-sans text-[15px] opacity-65">vs {vs} in Finland</p>
      <p className="mt-4 font-sans text-[17px] leading-snug">{line}</p>
    </div>
  )
}

export function SimpleChain({ r }: { r: ScreeningRow }) {
  return (
    <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
      {(['detection', 'referral', 'capacity'] as Step[]).map((s) => <Tile key={s} step={s} r={r} />)}
    </div>
  )
}

const DET = DETECTION_FIXES.find((d) => d.id === 'reminder')!

/** The one recommended action for the weakest step, with a switch that applies it to the plan. */
export function Recommend({ r, plan, setPlan, res, otherOptions, onShowList }: {
  r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result; otherOptions: ReactNode; onShowList?: () => void
}) {
  const w = weakestStep(r)
  const behind = flags(r)[w]
  let title: string, text: ReactNode, result: ReactNode, on: boolean, set: (v: boolean) => void
  let who: string, measure: string
  if (w === 'referral') {
    const alone = evaluate(r, { ...EMPTY_PLAN, referral: ['navigation'] }).referral
    title = 'Follow up every positive test'
    text = <>Give the screening nurse a daily list of everyone with a positive test who hasn&apos;t booked a colonoscopy, and call them. Every county already has screening nurses; this gives them the list.</>
    result = <>About {about(alone.colonoscopies)} more colonoscopies a year, an estimated {about(alone.cancers)} more cancers detected.</>
    who = 'The screening nurse or screening coordinator, every working day.'
    measure = 'Days from positive test to booking; share of positive tests with a recorded colonoscopy; people still without one.'
    on = plan.referral.includes('navigation')
    set = (v) => setPlan({ ...plan, referral: v ? [...plan.referral.filter((x) => x !== 'navigation'), 'navigation'] : plan.referral.filter((x) => x !== 'navigation') })
  } else if (w === 'detection') {
    const pts = DET.pts(r)
    const alone = evaluate(r, { ...EMPTY_PLAN, detectionPts: pts, detectionFix: 'reminder' }).detection
    title = 'Remind people who haven’t sent the kit back'
    text = <>Send a second letter or text message to everyone who hasn&apos;t returned the kit a few weeks after the invitation.</>
    result = <>About {about(alone.kits)} more kits sent back a year, about {about(alone.colonoscopies)} more colonoscopies.</>
    who = 'The screening programme team, a few weeks after each invitation batch.'
    measure = 'Share of invited people who send the kit back, month by month.'
    on = plan.detectionFix === 'reminder'
    set = (v) => setPlan(v ? { ...plan, detectionFix: 'reminder', detectionPts: pts } : { ...plan, detectionFix: null, detectionPts: 0 })
  } else {
    const c = res.queue.catchUp
    title = 'Clear the queue for colonoscopy'
    text = <>Run extra evening or weekend colonoscopy lists for {plan.catchUpWeeks} weeks until the wait is back to about {n1(plan.targetMonths)} months.</>
    who = 'The colonoscopy unit, for the weeks of the catch-up.'
    measure = 'Median wait from positive test to colonoscopy; people waiting.'
    result = c < 0.5 ? <>No extra lists are needed: the wait is already at the target.</>
      : <>About {about(c)} extra colonoscopies in total, about {about(c / plan.catchUpWeeks)} a week for {plan.catchUpWeeks} weeks.</>
    on = plan.catchUp
    set = (v) => setPlan({ ...plan, catchUp: v })
  }
  return (
    <Card tone={on ? 'ink' : 'paper'} className="p-6 sm:p-8">
      <Label className="!opacity-70">{behind ? 'Start here' : 'Nothing is falling behind. To do even better'}</Label>
      <p className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">{title}</p>
      <p className="mt-3 font-sans text-[17px] leading-relaxed max-w-2xl opacity-90">{text}</p>
      <p className={cx('mt-4 font-serif text-2xl leading-snug', on ? 'text-mustard' : 'text-terra')}>{result}</p>
      <p className="mt-1 font-sans text-[14px] opacity-60">Proven in other screening programmes; an estimate for this county, not a promise.</p>
      <dl className={cx('mt-4 grid sm:grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-1 font-sans text-[15px] max-w-2xl', on ? 'opacity-90' : 'opacity-80')}>
        <dt className="font-medium">Who, how often</dt><dd>{who}</dd>
        <dt className="font-medium">How you know</dt><dd>{measure}</dd>
      </dl>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Toggle on={on} onChange={set} label={on ? 'Applied' : 'Apply this'} />
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {w === 'referral' && onShowList && <button onClick={onShowList} className="font-sans text-[15px] underline underline-offset-4 hover:text-terra">See what the nurse&apos;s list looks like</button>}
          {otherOptions}
        </span>
      </div>
    </Card>
  )
}

const colon = (v: number) => (about(v) === '1' ? 'colonoscopy' : 'colonoscopies')

/** One sentence, at most two numbers: what colonoscopy capacity the plan and 2031 need. */
export function WhatItTakes({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const now = res.queue.extraPerWeek
  const y = in2031(r, res)
  const hasNow = now >= 0.5
  return (
    <div>
      <p className="font-serif text-3xl sm:text-4xl leading-tight max-w-4xl">
        {hasNow
          ? <>To keep the wait from growing, {r.name} needs about <span className="italic text-terra">{about(now)} more {colon(now)} a week</span> now, and about <span className="italic text-terra">{about(y.extraWithFixesWeek)} more</span> by 2031, when screening widens to everyone aged 56–74.</>
          : <>By 2031, when screening widens to everyone aged 56–74, {r.name} will need about <span className="italic text-terra">{about(y.extraWeek)} more {colon(y.extraWeek)} a week</span> than today.</>}
      </p>
      <p className="mt-3 font-sans text-[15px] opacity-65 max-w-3xl">
        {hasNow && !plan.addCapacity ? <>Without them, the wait grows to about {about(res.queue.waitIn12m)} months within a year. </> : null}
        The 2031 figure is an estimate at today&apos;s rates.
      </p>
      {hasNow && (
        <div className="mt-5">
          <Toggle on={plan.addCapacity} onChange={(v) => setPlan({ ...plan, addCapacity: v })} label={`Add about ${about(now)} a week to the plan`} />
        </div>
      )}
    </div>
  )
}
