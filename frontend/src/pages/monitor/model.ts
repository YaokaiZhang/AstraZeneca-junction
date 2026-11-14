// Screening Chain Monitor: every number on the page comes from these functions.
// Inputs: data.ts (Cancer Registry, 2024 round). Effects: evidence.ts. No number is written by a model.
import { DEMOGRAPHICS_FI, GROUPS, SCREENING_FI, demographicsById, type ScreeningRow } from './data'

export const WEEKS_PER_MONTH = 4.345
/** National Cancer Strategy Goal 2: 80% screening participation. */
export const GOAL_PARTICIPATION = 80
/** Cap on colonoscopy follow-through after a fix (tunable assumption). */
export const FOLLOW_THROUGH_CAP = 0.95

export const THRESHOLDS = {
  /** below this participation % the detection step is flagged */
  detection: 72,
  /** below this colonoscopy-of-positives % the referral step is flagged */
  referral: 70,
  /** above this median wait (months) the capacity step is flagged */
  capacity: 2.5,
}

export type Step = 'detection' | 'referral' | 'capacity'
export const STEPS: Step[] = ['detection', 'referral', 'capacity']

export const STEP_META: Record<Step, { n: string; who: string; title: string; short: string }> = {
  detection: { n: '01', who: 'Patient', title: 'Kit returned', short: 'Detection' },
  referral: { n: '02', who: 'Primary care', title: 'Positive → colonoscopy', short: 'Referral' },
  capacity: { n: '03', who: 'Specialist care', title: 'Wait for colonoscopy', short: 'Capacity' },
}

export function flags(r: ScreeningRow): Record<Step, boolean> {
  return {
    detection: r.participationPct < THRESHOLDS.detection,
    referral: r.colonoscopyOfPositivesPct < THRESHOLDS.referral,
    capacity: r.medianMonths > THRESHOLDS.capacity,
  }
}
export const weakCount = (r: ScreeningRow) => Object.values(flags(r)).filter(Boolean).length

/** Base rates for one county. */
export function base(r: ScreeningRow) {
  const p = r.participationPct / 100
  const pos = r.positivePct / 100
  const c = r.colonoscopyOfPositivesPct / 100
  return {
    p, pos, c,
    yieldCancer: r.cancers / r.colonoscopyDone,
    yieldPrecursor: r.precursors / r.colonoscopyDone,
  }
}

/** People lost at each step, and how many more than if the county ran at the national rate. */
export function losses(r: ScreeningRow) {
  const fi = SCREENING_FI
  const q = queue(r, fi.medianMonths)
  return {
    detection: {
      lost: r.invited - r.participated,
      vsNational: Math.max(0, r.invited * (fi.participationPct - r.participationPct) / 100),
    },
    referral: {
      lost: r.noColonoscopy,
      vsNational: Math.max(0, r.testPositive * (fi.colonoscopyOfPositivesPct - r.colonoscopyOfPositivesPct) / 100),
    },
    capacity: {
      /** people waiting at any time */
      lost: q.queueNow,
      /** people in the queue beyond what a national-length wait would hold */
      vsNational: q.catchUp,
    },
  }
}

/** Little's law, L = λW. Uses the median wait as if it were the mean: an estimate. */
export function queue(r: ScreeningRow, targetMonths = SCREENING_FI.medianMonths) {
  const arrivalsWeek = r.colonoscopyDone / 52
  const waitWeeks = r.medianMonths * WEEKS_PER_MONTH
  const targetWeeks = targetMonths * WEEKS_PER_MONTH
  return {
    arrivalsWeek,
    waitWeeks,
    targetWeeks,
    queueNow: arrivalsWeek * waitWeeks,
    catchUp: Math.max(0, arrivalsWeek * (waitWeeks - targetWeeks)),
  }
}

export interface Plan {
  /** chosen referral fixes (ids from REFERRAL_FIXES); only the strongest counts */
  referral: string[]
  /** participation gain, percentage points */
  detectionPts: number
  /** which detection card set the gain, if any */
  detectionFix: string | null
  /** run one-off catch-up sessions to bring the wait down to targetMonths */
  catchUp: boolean
  catchUpWeeks: number
  targetMonths: number
  /** add the extra weekly colonoscopy capacity the fixes need */
  addCapacity: boolean
}

export const EMPTY_PLAN: Plan = {
  referral: [], detectionPts: 0, detectionFix: null, catchUp: false, catchUpWeeks: 12,
  targetMonths: SCREENING_FI.medianMonths, addCapacity: false,
}

export interface Fix {
  id: string
  step: Step
  name: string
  what: string
  effect: string
  /** risk ratio applied to colonoscopy follow-through (referral fixes) */
  rr?: number
  source: 'navMeta' | 'dougherty' | 'ours'
  caveat?: string
  /** how it would work in Finland */
  local?: string
}

export const REFERRAL_FIXES: Fix[] = [
  { id: 'navigation', step: 'referral', name: 'Patient navigation', what: 'A named nurse or coordinator calls, books the colonoscopy and explains it.', effect: 'RR 1.24', rr: 1.24, source: 'navMeta', caveat: 'Mostly US studies',
    local: 'In Finland: every county already has screening nurses (seulontahoitaja) who agree the follow-up with each person who tests positive. The fix is a daily list for the screening nurse of everyone who tested positive and has not booked yet. Each county organises colonoscopies its own way, so the list goes to whoever books them there.' },
  { id: 'patient-reminder', step: 'referral', name: 'Patient reminders', what: 'Letter, SMS or call to people with a positive test who have not booked.', effect: 'RR 1.32', rr: 1.32, source: 'navMeta', caveat: 'Mostly US studies' },
  { id: 'clinician-reminder', step: 'referral', name: 'Clinician reminders', what: 'The GP gets a prompt when a positive result has no colonoscopy.', effect: 'RR 1.36', rr: 1.36, source: 'navMeta', caveat: 'Mostly US studies' },
  { id: 'auto-referral', step: 'referral', name: 'Automated referral', what: 'A colonoscopy is booked automatically on a positive result.', effect: 'RR 1.68', rr: 1.68, source: 'navMeta', caveat: 'Mostly US studies' },
]

// ----- detection -----

/** National 2024 group row: invited people with a mother tongue other than Finnish/Swedish/Sami (or missing). */
const OTHER_TONGUE = GROUPS.find((g) => g.dimension === 'mother_tongue' && g.group === 'Other or missing')!

/**
 * Share of a county's screening-age residents (56–74) with a mother tongue other than Finnish, Swedish or Sami.
 * Statistics Finland 2025 (vaerak/11rz), municipalities rolled up to counties. Used as the share of invited people.
 */
export function otherTongueShare(countyId: string) {
  return (demographicsById(countyId)?.foreignLangPct ?? DEMOGRAPHICS_FI.foreignLangPct) / 100
}

export const DETECTION_RR = 1.2

export interface DetectionFix extends Fix { pts: (r: ScreeningRow) => number; how: (r: ScreeningRow) => string }

export const headroom = (r: ScreeningRow) => Math.max(0, GOAL_PARTICIPATION - r.participationPct)

export const DETECTION_FIXES: DetectionFix[] = [
  {
    id: 'reminder', step: 'detection', name: 'Patient reminders', what: 'A second letter or SMS to everyone who has not returned the kit.',
    effect: 'RR 1.20 · about +3 pts', source: 'dougherty', caveat: 'Mostly US studies; cautious +3 points used',
    pts: (r) => Math.min(3, headroom(r)), how: () => 'Cautious default: +3 percentage points.',
  },
  {
    id: 'multilingual', step: 'detection', name: 'Multilingual reminder', what: `The reminder in the person’s own language, aimed at other mother tongues (${OTHER_TONGUE.participationPct}% return the kit vs ${GROUPS.find((g) => g.group === 'Finnish/Swedish/Sami')!.participationPct}%). The cancer strategy roadmap already funds multilingual screening outreach (measure 1.3.1, €400,000).`,
    effect: 'RR 1.20 on the group', source: 'dougherty', caveat: 'Language share: residents aged 56–74, Statistics Finland 2025',
    pts: (r) => Math.min(otherTongueShare(r.id) * OTHER_TONGUE.participationPct * (DETECTION_RR - 1), headroom(r)),
    how: (r) => `${(otherTongueShare(r.id) * 100).toFixed(1)}% of people aged 56–74 × ${OTHER_TONGUE.participationPct}% × 0.20`,
  },
  {
    id: 'clinician', step: 'detection', name: 'Clinician reminders', what: 'The GP or nurse is prompted to raise screening at any visit.',
    effect: 'about +13 pts (US)', source: 'dougherty', caveat: 'US effect; capped at the 80% goal',
    pts: (r) => Math.min(13, headroom(r)), how: () => '+13 points, capped at the 80% goal.',
  },
]

// ----- the whole plan -----

export function evaluate(r: ScreeningRow, plan: Plan) {
  const b = base(r)
  const chosen = REFERRAL_FIXES.filter((f) => plan.referral.includes(f.id))
  const strongest = chosen.reduce<Fix | null>((best, f) => (!best || f.rr! > best.rr! ? f : best), null)
  const cNew = strongest ? Math.min(b.c * strongest.rr!, Math.max(b.c, FOLLOW_THROUGH_CAP)) : b.c

  const refCol = r.testPositive * (cNew - b.c)
  const referral = {
    fix: strongest, cNew,
    colonoscopies: refCol,
    cancers: refCol * b.yieldCancer,
    precursors: refCol * b.yieldPrecursor,
  }

  const dp = Math.min(plan.detectionPts, headroom(r)) / 100
  const kits = r.invited * dp
  const positives = kits * b.pos
  const detCol = positives * cNew
  const detection = {
    pts: dp * 100, kits, positives,
    colonoscopies: detCol,
    cancers: detCol * b.yieldCancer,
    precursors: detCol * b.yieldPrecursor,
  }

  const extra = refCol + detCol
  const q = queue(r, plan.targetMonths)
  const extraPerWeek = extra / 52
  const newArrivalsWeek = q.arrivalsWeek + extraPerWeek
  const catchUpPerWeek = plan.catchUp ? q.catchUp / plan.catchUpWeeks : 0

  // wait over the next 52 weeks: queue grows by (arrivals − capacity) a week; wait ≈ queue ÷ capacity
  const capacity = q.arrivalsWeek + (plan.addCapacity ? extraPerWeek : 0)
  const trajectory = Array.from({ length: 53 }, (_, w) => {
    let L = q.queueNow + (newArrivalsWeek - capacity) * w
    if (plan.catchUp) L -= Math.min(w, plan.catchUpWeeks) * catchUpPerWeek
    // catch-up stops at the target wait; it never pushes a short wait up to the target
    L = Math.max(L, plan.catchUp ? Math.min(q.queueNow, newArrivalsWeek * q.targetWeeks) : 0)
    return L / capacity / WEEKS_PER_MONTH
  })

  return {
    base: b,
    referral,
    detection,
    total: {
      colonoscopies: extra,
      cancers: referral.cancers + detection.cancers,
      precursors: referral.precursors + detection.precursors,
    },
    queue: {
      ...q,
      extraPerWeek,
      newArrivalsWeek,
      catchUpPerWeek,
      /** demand exceeds today's capacity and nobody added more */
      overCapacity: extraPerWeek > 0.05 && !plan.addCapacity,
      trajectory,
      waitIn12m: trajectory[52],
    },
  }
}
export type Result = ReturnType<typeof evaluate>

// ----- 2031: the target group widens to everyone aged 56–74 -----

/** Ages 56–74 are 19 single years; even ages are invited every two years, so 10 of the 19 are invited in a round. */
export const INVITED_SHARE_2031 = 10 / 19

/**
 * Colonoscopy demand in 2031 at today's rates: invites grow from today's to pop 56–74 × 10/19,
 * and colonoscopies (today's, plus what the chosen fixes add) grow by the same factor.
 * Ignores ageing to 2031 and lower positivity in younger people: an estimate.
 */
export function in2031(r: ScreeningRow | typeof SCREENING_FI, res?: Result) {
  const d = demographicsById(r.id)
  const invited2031 = (d?.pop5674 ?? 0) * INVITED_SHARE_2031
  const growth = d ? invited2031 / r.invited : 1
  const fixExtra = res?.total.colonoscopies ?? 0
  const todayWeek = r.colonoscopyDone / 52
  const demandWeek = (r.colonoscopyDone * growth) / 52
  const withFixesWeek = ((r.colonoscopyDone + fixExtra) * growth) / 52
  return {
    pop5674: d?.pop5674 ?? 0,
    invited2031,
    growth,
    todayWeek,
    /** at today's rates, no fixes */
    demandWeek,
    withFixesWeek,
    /** extra a week over today's capacity, no fixes */
    extraWeek: demandWeek - todayWeek,
    /** extra a week over today's capacity, with the chosen fixes */
    extraWithFixesWeek: withFixesWeek - todayWeek,
    hasFixes: fixExtra > 0.5,
  }
}

// ----- formatting -----
export const n0 = (v: number) => Math.round(v).toLocaleString('en-GB')
export const n1 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const signed = (v: number, f = n0) => (v >= 0.5 || (f !== n0 && v > 0) ? '+' : '') + f(v)

// ----- group facts (national) used in text -----
const grp = (dimension: string, group: string) => GROUPS.find((x) => x.dimension === dimension && x.group === group)!
const pooled = (...rows: { invited: number; participated: number }[]) => {
  const invited = rows.reduce((s, r) => s + r.invited, 0), participated = rows.reduce((s, r) => s + r.participated, 0)
  return { invited, participated, pct: (participated / invited) * 100 }
}
export const GROUP_FACTS = {
  skipped: pooled(grp('previous_round_men', 'Did not take part'), grp('previous_round_women', 'Did not take part')),
  negative: pooled(grp('previous_round_men', 'Negative'), grp('previous_round_women', 'Negative')),
  first: pooled(grp('previous_round_men', 'First invitation'), grp('previous_round_women', 'First invitation')),
  otherTongue: grp('mother_tongue', 'Other or missing').participationPct,
  basicEducation: grp('education', 'Basic or unknown').participationPct,
  men: grp('sex', 'Men').participationPct,
}
