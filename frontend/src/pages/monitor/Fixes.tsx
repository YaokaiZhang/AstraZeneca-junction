// Evidence: every proven fix, as a plain list grouped by the problem it solves. Each row says what the fix is,
// what it gets this county and how sure we are; the source and the working sit behind "How we know".
import { useState, type ReactNode } from 'react'
import { Toggle, cx } from '../../components/ui'
import { SOURCES } from '../../data/sources'
import { Slider } from '../county/bits'
import { type ScreeningRow } from './data'
import {
  DETECTION_FIXES, GOAL_PARTICIPATION, REFERRAL_FIXES, base, evaluate, flags, headroom, n0, n1,
  type Fix, type Plan, type Result, type Step,
} from './model'

/** Round for display: whole numbers below 20, then to 5, then to 10. */
const about = (v: number) => {
  const a = Math.abs(v)
  return (a < 20 ? Math.round(a) : a < 100 ? Math.round(a / 5) * 5 : Math.round(a / 10) * 10).toLocaleString('en-GB')
}

const PLAIN: Record<string, string> = {
  navigation: 'A named nurse calls everyone with a positive test, books the colonoscopy and explains it. In Finland the screening nurse already does the follow-up; this gives them a daily list of who hasn’t booked.',
  'patient-reminder': 'A letter, text or call to people with a positive test who haven’t booked yet.',
  'clinician-reminder': 'The GP gets an alert when a positive test has no colonoscopy booked.',
  'auto-referral': 'The colonoscopy is booked automatically as soon as the test is positive.',
  reminder: 'A second letter or text to everyone who hasn’t sent the kit back.',
  multilingual: 'The reminder in the person’s own language, for people whose mother tongue isn’t Finnish or Swedish.',
  clinician: 'Doctors and nurses bring up screening whenever the person visits for anything else.',
}

const GROUPS: Record<Step, string> = {
  detection: 'If people don’t send the kit back',
  referral: 'If positive tests aren’t followed up',
  capacity: 'If the wait is too long',
}

function Row({ name, what, result, label, on, onChange, disabled, how }: {
  name: string; what: string; result: ReactNode; label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; how: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className={cx('py-4 border-t border-black/10 first:border-t-0', disabled && 'opacity-50')}>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 items-start">
        <div className="min-w-0">
          <p className="font-serif text-xl leading-tight">{name}</p>
          <p className="font-sans text-[15px] leading-snug opacity-80 mt-1 max-w-2xl">{what}</p>
          <p className={cx('font-serif text-lg mt-2', on ? 'text-terra' : '')}>{result}</p>
          <p className="font-sans text-[13px] opacity-60 mt-1">
            {label} · <button onClick={() => setOpen(!open)} aria-expanded={open} className="underline underline-offset-2 hover:text-terra">{open ? 'Hide' : 'How we know'}</button>
          </p>
          {open && <div className="rise mt-2 font-sans text-[13px] leading-relaxed opacity-80 bg-black/[.04] rounded p-3 max-w-2xl">{how}</div>}
        </div>
        <div className="sm:pt-1"><Toggle on={on} onChange={(v) => !disabled && onChange(v)} label={on ? 'Applied' : 'Apply'} /></div>
      </div>
    </li>
  )
}

const src = (f: Fix) => {
  const s = SOURCES[f.source]
  return <>Source: {s?.url ? <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s?.name}.</>
}

export function Fixes({ r, plan, setPlan, res }: { r: ScreeningRow; plan: Plan; setPlan: (p: Plan) => void; res: Result }) {
  const f = flags(r)
  const b = base(r)
  const room = headroom(r)
  const [adjust, setAdjust] = useState(false)
  const alone = (id: string) => evaluate(r, { ...plan, referral: [id], detectionPts: 0 }).referral.colonoscopies
  const toggleRef = (id: string, v: boolean) => setPlan({ ...plan, referral: v ? [...plan.referral.filter((x) => x !== id), id] : plan.referral.filter((x) => x !== id) })

  const groups: Record<Step, ReactNode> = {
    referral: (
      <>
        {REFERRAL_FIXES.map((fx) => {
          const add = alone(fx.id)
          return (
            <Row key={fx.id} name={fx.name} what={PLAIN[fx.id]} on={plan.referral.includes(fx.id)} onChange={(v) => toggleRef(fx.id, v)}
              result={<>About {about(add)} more colonoscopies a year, about {about(add * b.yieldCancer)} cancers found earlier</>}
              label="Proven in other programmes"
              how={<>In studies, {Math.round((fx.rr! - 1) * 100)}% more people with a positive test went on to have the colonoscopy (risk ratio {fx.rr}). {fx.caveat}.
                <br />For {r.name}: {n0(r.testPositive)} positive tests × ({n1(Math.min(b.c * fx.rr!, Math.max(b.c, 0.95)) * 100)}% − {n1(b.c * 100)}% followed up) = {n0(add)} colonoscopies a year; cancers at {r.name}&apos;s 2024 rate of {r.cancers} per {n0(r.colonoscopyDone)} colonoscopies.<br />{src(fx)}</>} />
          )
        })}
        <li className="pt-2 font-sans text-[13px] opacity-60 list-none">If you apply more than one, only the strongest is counted, and follow-up is capped at 95%.</li>
      </>
    ),
    detection: (
      <>
        {DETECTION_FIXES.map((fx) => {
          const pts = fx.pts(r)
          const on = plan.detectionFix === fx.id
          const kits = (r.invited * pts) / 100
          return (
            <Row key={fx.id} name={fx.name} what={PLAIN[fx.id]} on={on} disabled={room <= 0}
              onChange={(v) => setPlan(v ? { ...plan, detectionFix: fx.id, detectionPts: pts } : { ...plan, detectionFix: null, detectionPts: 0 })}
              result={<>About {about(kits)} more kits sent back a year</>}
              label={fx.id === 'multilingual' ? 'Proven in other programmes; group size is our estimate' : 'Proven in other programmes'}
              how={<>{fx.id === 'reminder' && <>In studies, reminders raised the number of kits sent back (risk ratio 1.20). We use a cautious 3 percentage points.</>}
                {fx.id === 'multilingual' && <>Reminders raise kit return by a fifth (risk ratio 1.20). Applied to people with another mother tongue: {fx.how(r)}. Language share from Statistics Finland 2025.<br />Already funded nationally: <a className="underline" href={SOURCES.roadmap.url} target="_blank" rel="noreferrer">cancer strategy roadmap</a> measure 1.3.1, multilingual screening outreach, €400,000 (p. 33).</>}
                {fx.id === 'clinician' && <>US studies found about 13 percentage points more; capped so {r.name} doesn&apos;t pass the {GOAL_PARTICIPATION}% national goal.</>}
                <br />For {r.name}: {n0(r.invited)} invited × {n1(pts)} points = about {n0(kits)} more kits. {fx.caveat}.<br />{src(fx)}</>} />
          )
        })}
        <li className="pt-2 list-none">
          <button onClick={() => setAdjust(!adjust)} className="font-sans text-[13px] underline underline-offset-2 opacity-70 hover:text-terra">{adjust ? 'Hide' : 'Adjust'} the kit return target</button>
          {adjust && <div className="mt-3 max-w-md">
            <Slider label="Extra kit return" value={plan.detectionPts} min={0} max={Math.max(0.1, Math.round(room * 10) / 10)} step={0.1}
              onChange={(v) => setPlan({ ...plan, detectionPts: v, detectionFix: null })}
              display={<>+{n1(plan.detectionPts)}<span className="font-sans text-sm opacity-60"> points</span></>} />
            <p className="font-sans text-[13px] opacity-60 mt-1">{n1(r.participationPct)}% → {n1(r.participationPct + plan.detectionPts)}% (national goal {GOAL_PARTICIPATION}%)</p>
          </div>}
        </li>
      </>
    ),
    capacity: (
      <>
        <Row name="Catch-up colonoscopy lists" what={`Extra evening or weekend lists until the wait is back to about ${n1(plan.targetMonths)} months.`}
          on={plan.catchUp} onChange={(v) => setPlan({ ...plan, catchUp: v })}
          result={res.queue.catchUp < 0.5 ? <>Not needed: the wait is already at the target</> : <>About {about(res.queue.catchUp)} extra colonoscopies over {plan.catchUpWeeks} weeks, about {about(res.queue.catchUp / plan.catchUpWeeks)} a week</>}
          label="Our estimate"
          how={<>The people waiting beyond a {n1(plan.targetMonths)}-month wait: {n1(res.queue.arrivalsWeek)} colonoscopies a week × ({n1(res.queue.waitWeeks)} − {n1(res.queue.targetWeeks)}) weeks of extra wait = {n0(res.queue.catchUp)}. This is our calculation from the Cancer Registry figures, not a trial result.</>} />
        <li className="pt-2 list-none">
          <button onClick={() => setAdjust(!adjust)} className="font-sans text-[13px] underline underline-offset-2 opacity-70 hover:text-terra">{adjust ? 'Hide' : 'Adjust'} the target wait</button>
          {adjust && <div className="mt-3 max-w-md space-y-5">
            <Slider label="Target wait" value={plan.targetMonths} min={0.8} max={Math.max(3, Math.ceil(r.medianMonths * 2) / 2)} step={0.1}
              onChange={(v) => setPlan({ ...plan, targetMonths: v })}
              display={<>{n1(plan.targetMonths)}<span className="font-sans text-sm opacity-60"> months</span></>} />
            <Slider label="Spread over" value={plan.catchUpWeeks} min={4} max={26} step={1}
              onChange={(v) => setPlan({ ...plan, catchUpWeeks: v })}
              display={<>{plan.catchUpWeeks}<span className="font-sans text-sm opacity-60"> weeks</span></>} />
          </div>}
        </li>
      </>
    ),
  }

  const order: Step[] = ['referral', 'detection', 'capacity']
  const first = order.filter((s) => f[s])
  const rest = order.filter((s) => !f[s])
  const Group = ({ s }: { s: Step }) => (
    <div className="mt-8 first:mt-0">
      <p className="font-serif text-2xl sm:text-3xl italic">{GROUPS[s]}</p>
      <ul className="mt-2">{groups[s]}</ul>
    </div>
  )
  const total = res.total.colonoscopies
  return (
    <div className="max-w-4xl">
      {first.map((s) => <Group key={s} s={s} />)}
      {!first.length && <p className="font-sans text-[16px] opacity-75">No step is falling behind in {r.name}. All options are below.</p>}
      {rest.length > 0 && (
        <details className="mt-8" open={!first.length}>
          <summary className="cursor-pointer font-sans text-[15px] underline underline-offset-4 opacity-75 hover:opacity-100 w-fit">More options, for steps that are on track</summary>
          {rest.map((s) => <Group key={s} s={s} />)}
        </details>
      )}
      {total > 0.5 && (
        <p className="mt-8 p-5 rounded-lg bg-ink text-paper font-serif text-2xl leading-snug">
          With what you&apos;ve applied: about <span className="text-mustard">{about(total)} more colonoscopies a year</span> and about <span className="text-mustard">{about(res.total.cancers)} cancers found earlier</span>.
        </p>
      )}
    </div>
  )
}
