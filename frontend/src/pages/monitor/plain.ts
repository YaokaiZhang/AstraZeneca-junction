// Shared helpers for the plain-language views: rounding for the main view and the step to act on first.
import { SCREENING_FI, type ScreeningRow } from './data'
import { flags, type Step } from './model'

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
