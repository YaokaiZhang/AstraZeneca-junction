// Shared helpers for the plain-language views: rounding for the main view and the step to act on first.
import { SCREENING_FI, type ScreeningRow } from './data'
import { DETECTION_FIXES, EMPTY_PLAN, evaluate, flags, type Step } from './model'

/** Round for the main view: whole numbers below 20, then to 5, then to 10. */
export const aboutNum = (v: number) => {
  const a = Math.abs(v)
  return a < 20 ? Math.round(a) : a < 100 ? Math.round(a / 5) * 5 : Math.round(a / 10) * 10
}
export const about = (v: number) => aboutNum(v).toLocaleString('en-GB')

/**
 * The step to act on first. Among the steps falling behind, in order of how serious the loss is for one person:
 * a positive test never followed up (a known positive without a diagnosis), then a long wait (diagnosis delayed),
 * then kits not returned (result unknown). If nothing is falling behind: the step furthest from the national figure.
 */
export function weakestStep(r: ScreeningRow): Step {
  const f = flags(r)
  const order: Step[] = ['referral', 'capacity', 'detection']
  const hit = order.find((s) => f[s])
  if (hit) return hit
  const fi = SCREENING_FI
  return ([
    ['detection', (fi.participationPct - r.participationPct) / fi.participationPct],
    ['referral', (fi.colonoscopyOfPositivesPct - r.colonoscopyOfPositivesPct) / fi.colonoscopyOfPositivesPct],
    ['capacity', (r.medianMonths - fi.medianMonths) / fi.medianMonths],
  ] as [Step, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

/** Short title and result of the start-here action with nothing else planned (for previews). */
export function startHere(r: ScreeningRow): { step: Step; title: string; result: string } {
  const w = weakestStep(r)
  if (w === 'referral') {
    const a = evaluate(r, { ...EMPTY_PLAN, referral: ['navigation'] }).referral
    return { step: w, title: 'Follow up every positive test', result: `About ${about(a.colonoscopies)} more colonoscopies a year` }
  }
  if (w === 'detection') {
    const a = evaluate(r, { ...EMPTY_PLAN, detectionPts: DETECTION_FIXES.find((d) => d.id === 'reminder')!.pts(r), detectionFix: 'reminder' }).detection
    return { step: w, title: 'Remind people who haven’t sent the kit back', result: `About ${about(a.kits)} more kits sent back a year` }
  }
  const c = evaluate(r, EMPTY_PLAN).queue.catchUp
  return { step: w, title: 'Clear the queue for colonoscopy', result: `About ${about(c)} extra colonoscopies in ${EMPTY_PLAN.catchUpWeeks} weeks` }
}
