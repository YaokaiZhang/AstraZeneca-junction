// The bowel one-page plan's charts. Same plan and numbers as the briefing (planFor in briefing.ts): no new formulas.
import { SCREENING_FI, type ScreeningRow } from './data'
import { planFor } from './briefing'
import { GOAL_PARTICIPATION, flags, in2031, n1, type Plan, type Result } from './model'
import type { Glance, GlanceStep } from './PlanGlance'

export function bowelGlance(r: ScreeningRow, plan: Plan, res: Result): Glance {
  const f = flags(r)
  const fi = SCREENING_FI
  const st = (behind: boolean): GlanceStep['status'] => (behind ? 'behind' : 'ok')
  const steps: GlanceStep[] = [
    { label: 'Sent the kit back', value: r.participationPct, finland: fi.participationPct, unit: '%', status: st(f.detection), goal: GOAL_PARTICIPATION },
    { label: 'Colonoscopy on record', value: r.colonoscopyOfPositivesPct, finland: fi.colonoscopyOfPositivesPct, unit: '%', status: st(f.referral) },
    { label: 'Wait for colonoscopy', value: r.medianMonths, finland: fi.medianMonths, unit: 'months', status: st(f.capacity) },
  ]
  const p = planFor(r, plan, res)
  const q = p.res.queue
  const y = in2031(r, p.res)
  const g: Glance = { steps, measures: [] }
  if (p.res.referral.fix) {
    g.change = { title: 'Positive tests with no recorded colonoscopy, a year', unit: '', kind: 'estimate', bars: [
      { label: 'Today', value: r.noColonoscopy, tone: 'now' }, { label: 'With the plan', value: r.testPositive * (1 - p.res.referral.cNew), tone: 'fix' }] }
    g.measures.push({ text: 'Share of positive tests with a recorded colonoscopy', target: `${n1(p.res.referral.cNew * 100)}%` }, { text: 'Days from positive test to booking' })
  } else if (p.res.detection.pts > 0) {
    g.change = { title: 'Invited people who did not send the kit back, a year', unit: '', kind: 'estimate', bars: [
      { label: 'Today', value: r.invited - r.participated, tone: 'now' }, { label: 'With the plan', value: r.invited - r.participated - p.res.detection.kits, tone: 'fix' }] }
    g.measures.push({ text: 'Share of invited people who send the kit back', target: `${n1(r.participationPct + p.res.detection.pts)}%` })
  } else if (p.plan.catchUp && q.catchUp >= 0.5) {
    g.change = { title: 'Median wait for colonoscopy', unit: 'months', kind: 'target', bars: [
      { label: 'Today', value: r.medianMonths, tone: 'now' }, { label: 'After catch-up', value: p.plan.targetMonths, tone: 'target' }] }
    g.measures.push({ text: 'Median wait from positive test to colonoscopy', target: `${n1(p.plan.targetMonths)} months` }, { text: 'People waiting' })
  }
  const now = Math.max(0, q.extraPerWeek)
  g.takes = { title: 'Extra colonoscopies a week', unit: 'a week', bars: [{ label: 'Now', value: now }, { label: 'By 2031 (ages 56–74)', value: Math.max(0, y.extraWithFixesWeek) }] }
  if (!g.measures.length) g.measures.push({ text: 'Kit return, follow-up and wait, against this page, every month' })
  return g
}
