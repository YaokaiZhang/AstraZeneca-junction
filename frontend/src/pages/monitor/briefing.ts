// The one-page plan's briefing. Facts are built here from the same calculations the page shows; the AI (server/llm.ts)
// only turns them into sentences, and its text is used only if every number in it can be found in the facts.
// With no key, a failed call or an unmatched number, the template below is used instead.
import { SCREENING_FI, type ScreeningRow } from './data'
import { DETECTION_FIXES, EMPTY_PLAN, evaluate, flags, in2031, n1, type Plan, type Result, type Step } from './model'
import { aboutNum, weakestStep } from './plain'

export type Facts = Record<string, number | string>

const PROBLEM: Record<Step, string> = {
  referral: 'people with a positive test who never had the follow-up colonoscopy',
  capacity: 'the wait for a colonoscopy after a positive test',
  detection: 'people who do not send the test kit back',
}

/** What the plan does: the fixes applied on the page, or else the recommended one for the weakest step. */
function planFor(r: ScreeningRow, plan: Plan, res: Result) {
  const applied = res.total.colonoscopies > 0.5 || plan.catchUp
  if (applied) return { plan, res, recommended: false }
  const w = weakestStep(r)
  const p: Plan = w === 'referral' ? { ...EMPTY_PLAN, referral: ['navigation'] }
    : w === 'detection' ? { ...EMPTY_PLAN, detectionFix: 'reminder', detectionPts: DETECTION_FIXES.find((d) => d.id === 'reminder')!.pts(r) }
    : { ...EMPTY_PLAN, catchUp: true }
  return { plan: p, res: evaluate(r, p), recommended: true }
}

const REFERRAL_WORDS: Record<string, string> = {
  navigation: 'give the screening nurse a daily list of everyone with a positive test who has not booked a colonoscopy, and call them',
  'patient-reminder': 'send a letter, text or call to everyone with a positive test who has not booked a colonoscopy',
  'clinician-reminder': 'alert the family doctor when a positive test has no colonoscopy booked',
  'auto-referral': 'book the colonoscopy automatically as soon as the test is positive',
}
const DETECTION_WORDS: Record<string, string> = {
  reminder: 'send a second reminder to everyone who has not sent the kit back',
  multilingual: 'send the reminder in the language each person reads best',
  clinician: 'have doctors and nurses bring up screening whenever the person visits',
}

function actionWords(plan: Plan, res: Result) {
  const parts: string[] = []
  if (res.referral.fix) parts.push(REFERRAL_WORDS[res.referral.fix.id] ?? res.referral.fix.name.toLowerCase())
  if (res.detection.pts > 0) parts.push(DETECTION_WORDS[plan.detectionFix ?? 'reminder'] ?? DETECTION_WORDS.reminder)
  if (plan.catchUp && res.queue.catchUp >= 0.5) parts.push('run extra evening or weekend colonoscopy lists until the wait is back to target')
  return parts.join('; and ')
}

/** Every number the briefing may use, already rounded the way the page shows it. */
export function buildFacts(r: ScreeningRow, plan: Plan, res: Result): Facts {
  const f = flags(r)
  const behind = (Object.keys(f) as Step[]).filter((s) => f[s])
  const p = planFor(r, plan, res)
  const q = p.res.queue
  const y = in2031(r, p.res)
  const facts: Facts = {
    county: r.name,
    data_year: 2024,
    steps_falling_behind: behind.length,
    main_problem: behind.length ? PROBLEM[weakestStep(r)] : 'none: every step is at or better than its flag line',
    kit_return_pct: r.participationPct,
    kit_return_finland_pct: SCREENING_FI.participationPct,
    followup_colonoscopy_pct: r.colonoscopyOfPositivesPct,
    followup_colonoscopy_finland_pct: SCREENING_FI.colonoscopyOfPositivesPct,
    positive_tests_without_colonoscopy: r.noColonoscopy,
    wait_months: r.medianMonths,
    wait_finland_months: SCREENING_FI.medianMonths,
    action: actionWords(p.plan, p.res) || 'no change',
    action_is: !p.recommended ? 'the plan chosen on the Actions tab' : behind.length ? 'the recommended first step' : 'a step to do even better',
    action_about_extra_colonoscopies_per_year: aboutNum(p.res.total.colonoscopies),
    action_about_cancers_found_earlier: aboutNum(p.res.total.cancers),
    about_colonoscopies_per_week_today: aboutNum(q.arrivalsWeek),
    about_extra_colonoscopies_per_week_now: aboutNum(q.extraPerWeek),
    year_screening_widens: 2031,
    screening_ages_from_2031: '56 to 74',
    about_invites_growth_by_2031_pct: Math.round((y.growth - 1) * 100),
    about_extra_colonoscopies_per_week_by_2031: aboutNum(y.extraWithFixesWeek),
    caveat: 'The effects come mostly from studies in the United States, the 2031 figure assumes today’s rates, and some 2024 follow-up colonoscopies may not have been reported yet.',
  }
  if (q.extraPerWeek >= 0.5) facts.about_wait_in_a_year_if_not_added_months = aboutNum(q.waitIn12m)
  if (p.plan.catchUp && q.catchUp >= 0.5) {
    facts.about_catch_up_colonoscopies_total = aboutNum(q.catchUp)
    facts.catch_up_weeks = p.plan.catchUpWeeks
    facts.target_wait_months = Math.round(p.plan.targetMonths * 10) / 10
  }
  return facts
}

/** The briefing written from the facts by a fixed template. Used when the AI is off, fails or adds a number. */
export function templateBriefing(x: Facts): string {
  const s: string[] = []
  const problem = String(x.main_problem)
  if (Number(x.steps_falling_behind) === 0) s.push(`${x.county} is on track at every step of bowel cancer screening.`)
  else if (problem.startsWith('people with a positive test')) s.push(`In ${x.county}, ${x.positive_tests_without_colonoscopy} people with a positive test in ${x.data_year} never had the follow-up colonoscopy (${n1(Number(x.followup_colonoscopy_pct))}% were followed up, against ${n1(Number(x.followup_colonoscopy_finland_pct))}% in Finland).`)
  else if (problem.startsWith('the wait')) s.push(`In ${x.county}, people wait ${n1(Number(x.wait_months))} months for a colonoscopy after a positive test, against ${n1(Number(x.wait_finland_months))} months in Finland.`)
  else s.push(`In ${x.county}, ${n1(Number(x.kit_return_pct))}% of invited people sent the test kit back in ${x.data_year}, against ${n1(Number(x.kit_return_finland_pct))}% in Finland.`)
  if (x.action !== 'no change') {
    s.push(`${x.action_is === 'the recommended first step' ? 'The recommended first step is' : x.action_is === 'a step to do even better' ? 'To do even better, the next step would be' : 'The chosen plan is'} to ${x.action}.`)
    if (Number(x.action_about_extra_colonoscopies_per_year) > 0) {
      const c = Number(x.action_about_cancers_found_earlier)
      s.push(`That means about ${x.action_about_extra_colonoscopies_per_year} more colonoscopies a year${c >= 1 ? ` and about ${c} ${c === 1 ? 'cancer' : 'cancers'} found earlier` : ''}.`)
    }
    else if (x.about_catch_up_colonoscopies_total) s.push(`That takes about ${x.about_catch_up_colonoscopies_total} extra colonoscopies over ${x.catch_up_weeks} weeks to bring the wait to about ${x.target_wait_months} months.`)
  }
  s.push(Number(x.about_extra_colonoscopies_per_week_now) > 0
    ? `To keep the wait from growing, the county needs about ${x.about_extra_colonoscopies_per_week_now} more colonoscopies a week now, and about ${x.about_extra_colonoscopies_per_week_by_2031} more by ${x.year_screening_widens}, when everyone aged ${x.screening_ages_from_2031} is invited.`
    : `By ${x.year_screening_widens}, when everyone aged ${x.screening_ages_from_2031} is invited, the county will need about ${x.about_extra_colonoscopies_per_week_by_2031} more colonoscopies a week than today.`)
  s.push(String(x.caveat))
  return s.join(' ')
}

/** Every number in the text must match a number in the facts (or inside a fact's words), allowing the usual rounding. */
export function numbersMatch(text: string, facts: Facts): boolean {
  const allowed: number[] = []
  for (const v of Object.values(facts)) {
    if (typeof v === 'number') allowed.push(v)
    else for (const m of v.match(/\d+(?:\.\d+)?/g) ?? []) allowed.push(+m)
  }
  const found = text.replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) ?? []
  return found.every((m) => {
    const n = +m
    return allowed.some((v) => Math.abs(n - v) <= Math.max(0.5, Math.abs(v) * 0.05))
  })
}
