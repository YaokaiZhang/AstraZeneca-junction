// Breast and cervical screening, in the same "where people are lost → what to do → what it takes" shape as bowel.
// Built on the Cancer Registry's 2024 county statistics (breastData.ts, cervicalData.ts) and the start-here logic
// first written for the county view on main. No number is invented: tiles are published figures; an expected result
// is shown only where a named study gives an effect size, applied to the county's own counts. Elsewhere: no number.
import type { Briefing } from './ActionSheet'
import { BREAST, BREAST_FI, BREAST_EVIDENCE, BREAST_AGES, BREAST_YEAR, BREAST_SOURCE_URL, type BreastRow } from './breastData'
import { CERVICAL, CERVICAL_FI, CERVICAL_EVIDENCE, CERVICAL_AGES, CERVICAL_YEAR, CERVICAL_CAVEATS, CERVICAL_SOURCE_URL, type CervicalRow } from './cervicalData'

export type ProgrammeId = 'bowel' | 'breast' | 'cervical'
export const PROGRAMMES: { id: ProgrammeId; label: string; full: string }[] = [
  { id: 'bowel', label: 'Bowel', full: 'Bowel cancer screening' },
  { id: 'breast', label: 'Breast', full: 'Breast cancer screening' },
  { id: 'cervical', label: 'Cervical', full: 'Cervical cancer screening' },
]
export const isProgramme = (s: string | null): s is ProgrammeId => s === 'bowel' || s === 'breast' || s === 'cervical'

/** The official target for all three programmes: 80% attendance in every county (National Cancer Strategy, Goal 2). */
export const GOAL_ATTENDANCE = 80
export const WORKING_DAYS = 250

export interface StepTile {
  title: string
  big: string
  unit?: string
  finland: string
  /** past our warning line (see warningLines) */
  behind: boolean
  /** no usable figure for this county (reporting gap) */
  missing?: boolean
  line: string
  /** relative gap to Finland, positive = worse; used to pick where to start */
  gap: number
}

export interface Evidence { id: string; action: string; effect: string; citation: string; url: string }

export type StartKind = 'attendance' | 'reporting' | 'followup' | 'wait'

export interface ProgrammeView {
  programme: ProgrammeId
  label: string
  /** e.g. "2024 · women 50–69" */
  scope: string
  sourceUrl: string
  tiles: StepTile[]
  startStep: number
  /** one plain sentence for the top of the page */
  verdict: string
  onTrack: boolean
  start: {
    kind: StartKind
    title: string
    text: string
    /** what it achieves; an estimate only when `estimate` is true */
    result: string
    estimate: boolean
    /** where the result comes from, in words */
    basis: string
    basisUrl?: string
    who: string
    measure: string
    /** what it takes, in one sentence */
    takes: string
  }
  /** the nurse's list wording, when the start step is a follow-up step */
  list?: ListWording
  evidence: Evidence[]
  /** our warning lines, said plainly */
  warningLines: string
  caveat?: string
  /** facts for the briefing (same shape idea as bowel's buildFacts) */
  facts: Record<string, number | string>
}

export interface ListWording {
  /** e.g. "Woman", for "Woman 1" */
  personLabel: string
  /** e.g. "positive mammogram" */
  event: string
  /** e.g. "Follow-up exam booked?" */
  bookedColumn: string
  /** people entering the list a year (published count) */
  perYear: number
  perYearLabel: string
  /** people a year with no recorded follow-up (published count) */
  missedPerYear: number
  missedLabel: string
  ageMin: number
  ageMax: number
  ageStep: number
  /** the follow-up the nurse books */
  followup: string
}

/** Ranking only: a wait twice the national one weighs like an attendance 5% below Finland's. */
const WAIT_WEIGHT = 0.05
const n0 = (x: number) => Math.round(x).toLocaleString('en-GB')
const n1 = (x: number) => x.toFixed(1)
/** Round for the main view: whole numbers below 20, then to 5, then to 10. */
const about = (v: number) => {
  const a = Math.abs(v)
  return (a < 20 ? Math.max(1, Math.round(a)) : a < 100 ? Math.round(a / 5) * 5 : Math.round(a / 10) * 10).toLocaleString('en-GB')
}
const days = (months: number) => Math.max(1, Math.round(months * 30.44))
const pick = (tiles: StepTile[]) => {
  const behind = tiles.map((t, i) => [t, i] as const).filter(([t]) => t.behind && !t.missing)
  const pool = behind.length ? behind : tiles.map((t, i) => [t, i] as const).filter(([t]) => !t.missing)
  return pool.sort((a, b) => b[0].gap - a[0].gap)[0][1]
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

// ---------- breast ----------

const BREAST_LINES = 'attendance below Finland by 2 points, more than 3 points more referred women with no result on record than Finland, or a wait 1.4 times the national one'

export function breastTiles(r: BreastRow): StepTile[] {
  const fi = BREAST_FI
  const fiWait = fi.medianMonthsToExam!
  const wait = r.medianMonthsToExam
  const ratio = wait != null ? wait / fiWait : 1
  return [
    {
      title: 'Come for the mammogram', big: `${n1(r.attendedPct)}%`, finland: `${n1(fi.attendedPct)}%`,
      behind: r.attendedPct < fi.attendedPct - 2, gap: (fi.attendedPct - r.attendedPct) / fi.attendedPct,
      line: `${n0(r.invited - r.attended)} invited women did not come`,
    },
    {
      title: 'Result on record', big: `${n1(100 - r.noHistologyPct)}%`, finland: `${n1(100 - fi.noHistologyPct)}%`,
      behind: r.noHistologyPct > fi.noHistologyPct + 3, gap: (r.noHistologyPct - fi.noHistologyPct) / 100,
      line: r.noHistology === 0 ? 'Every referred woman has a result on record' : r.noHistology === 1 ? '1 referred woman has no result on record' : `${n0(r.noHistology)} referred women have no result on record`,
    },
    {
      title: 'Wait for further tests', big: wait != null ? `${days(wait)}` : '–', unit: 'days', finland: `${days(fiWait)} days`,
      behind: ratio >= 1.4, missing: wait == null, gap: (ratio - 1) * WAIT_WEIGHT,
      line: wait == null ? 'Not published' : ratio >= 1.4 ? `About ${n1(ratio)} times the national wait` : ratio <= 0.7 ? 'Shorter than the national wait' : 'Close to the national wait',
    },
  ]
}

const SMS = BREAST_EVIDENCE.find((e) => e.id === 'sms-reminder')!

export function breastView(id: string): ProgrammeView | null {
  const r = BREAST.find((x) => x.id === id)
  if (!r) return null
  const tiles = breastTiles(r)
  const fi = BREAST_FI
  const onTrack = !tiles.some((t) => t.behind)
  // nothing behind: the way to do even better is attendance, the one step with an official goal
  const w = onTrack ? 0 : pick(tiles)
  let start: ProgrammeView['start']
  let verdict: string
  if (w === 0) {
    const extra = r.invited * (SMS.absolutePp! / 100)
    const cancers = extra * (r.cancers / r.attended)
    start = {
      kind: 'attendance',
      title: 'Text a reminder before every appointment',
      text: 'Send a text message two days before each pre-booked mammogram, with the time and how to change it.',
      result: `Up to about ${about(extra)} more women screened a year, and an estimated ${about(cancers)} more cancers detected by screening.`,
      estimate: true,
      basis: `A London trial raised attendance by ${SMS.absolutePp} points with text reminders; applied to ${r.name}'s ${n0(r.invited)} invited women, cancers at the county's 2024 rate (${r.cancers} in ${n0(r.attended)} screened). Likely smaller where attendance is already high.`,
      basisUrl: SMS.url,
      who: 'The screening unit, automatically for every booked appointment.',
      measure: 'Share of invited women who come, month by month; did-not-attend rate per screening site.',
      takes: `About ${about(extra / 52)} more mammograms a week at the screening units, and the follow-up slots for the women called back.`,
    }
    verdict = onTrack
      ? `${r.name} is on track in breast screening: no step is past our warning line, and ${n1(r.attendedPct)}% of invited women came (Finland ${n1(fi.attendedPct)}%), ${r.attendedPct >= GOAL_ATTENDANCE ? `above the ${GOAL_ATTENDANCE}% goal` : `still below the ${GOAL_ATTENDANCE}% goal`}.`
      : `${r.name}'s problem is attendance: ${n1(r.attendedPct)}% of invited women came for the mammogram, against ${n1(fi.attendedPct)}% in Finland and the ${GOAL_ATTENDANCE}% goal.`
  } else if (w === 1) {
    start = {
      kind: 'reporting',
      title: 'Check every result reaches the register',
      text: 'Each month, check that every woman referred from screening has her result reported to the screening register, and chase the missing ones with the unit that saw her.',
      result: `${n0(r.noHistology)} referred women (${n1(r.noHistologyPct)}%, against ${n1(fi.noHistologyPct)}% in Finland) have no result on record. ${r.noHistologyPct >= 20 ? 'Most likely' : 'Possibly'} a reporting gap: check the data reaches the register first.`,
      estimate: false,
      basis: `${r.name}, ${BREAST_YEAR}: referred women with no histology reported by spring 2026 (Cancer Registry).`,
      who: 'The screening coordinator, once a month, with the breast units.',
      measure: 'Referred women with no result on record; months from referral to the result reaching the register.',
      takes: 'No extra appointments: a monthly check of the referral list against the register.',
    }
    verdict = `In ${r.name}, ${n0(r.noHistology)} women referred after a mammogram have no result on record (${n1(r.noHistologyPct)}%, against ${n1(fi.noHistologyPct)}% in Finland). That is ${r.noHistologyPct >= 20 ? 'most likely' : 'possibly'} a reporting gap: check the data reaches the register before anything else.`
  } else {
    start = {
      kind: 'wait',
      title: 'Give further tests a time at recall',
      text: 'Book the further mammogram and ultrasound in the recall letter, with a slot inside two weeks.',
      result: `Target: the national ${days(fi.medianMonthsToExam!)} days, down from ${days(r.medianMonthsToExam!)}.`,
      estimate: false,
      basis: `Median time from positive mammogram to further tests, ${BREAST_YEAR}, read from the Cancer Registry's chart.`,
      who: 'The breast unit, for every woman called back.',
      measure: 'Days from recall to further tests; share seen within two weeks.',
      takes: `Slots for about ${about(r.recalled / 52)} called-back women a week, booked at recall.`,
    }
    verdict = `${r.name}'s problem is the wait: women called back after a mammogram wait about ${days(r.medianMonthsToExam!)} days for further tests, against ${days(fi.medianMonthsToExam!)} in Finland.`
  }
  return {
    programme: 'breast', label: 'Breast cancer screening', scope: `${BREAST_YEAR} · women ${BREAST_AGES}`, sourceUrl: BREAST_SOURCE_URL,
    tiles, startStep: w, verdict, onTrack, start,
    evidence: BREAST_EVIDENCE.map(({ id, action, effect, citation, url }) => ({ id, action, effect, citation, url })),
    warningLines: BREAST_LINES,
    facts: {
      programme: 'breast', county: r.name, data_year: BREAST_YEAR, pathway_step: ['detection', 'reporting', 'capacity'][w],
      attendance_pct: r.attendedPct, attendance_finland_pct: fi.attendedPct, goal_pct: GOAL_ATTENDANCE,
      referred_without_result: r.noHistology, referred_without_result_pct: r.noHistologyPct, referred_without_result_finland_pct: fi.noHistologyPct,
      wait_days: r.medianMonthsToExam != null ? days(r.medianMonthsToExam) : '', wait_finland_days: days(fi.medianMonthsToExam!),
      action: start.title, action_detail: start.text, action_ids: w === 0 ? 'sms-reminder' : w === 1 ? 'reporting' : 'catch-up',
      result: start.result, takes: start.takes,
    },
  }
}

// ---------- cervical ----------

const CERVICAL_LINES = 'attendance below Finland by 2 points, colposcopy recorded for 3 points fewer referred women than Finland, or a wait 1.4 times the national one'

export function cervicalTiles(r: CervicalRow): StepTile[] {
  const fi = CERVICAL_FI
  // a follow-up figure under a quarter of the national rate is a reporting gap, not missed care
  const gapColpo = r.colposcopyOfReferredPct < fi.colposcopyOfReferredPct / 4
  const fiWait = fi.medianMonthsToColposcopyApprox!
  const wait = gapColpo ? null : r.medianMonthsToColposcopyApprox
  const ratio = wait != null ? wait / fiWait : 1
  return [
    {
      title: 'Come for the test', big: `${n1(r.participationPct)}%`, finland: `${n1(fi.participationPct)}%`,
      behind: r.participationPct < fi.participationPct - 2, gap: (fi.participationPct - r.participationPct) / fi.participationPct,
      line: `${n0(r.invited - r.participated)} invited women were not tested`,
    },
    {
      title: 'Colposcopy on record', big: gapColpo ? '–' : `${n1(r.colposcopyOfReferredPct)}%`, finland: `${n1(fi.colposcopyOfReferredPct)}%`,
      behind: !gapColpo && r.colposcopyOfReferredPct < fi.colposcopyOfReferredPct - 3, missing: gapColpo,
      gap: (fi.colposcopyOfReferredPct - r.colposcopyOfReferredPct) / fi.colposcopyOfReferredPct,
      line: gapColpo ? `Only ${r.colposcopyDone} of ${n0(r.referredColposcopy)} on record: a reporting gap`
        : `${n0(r.referredColposcopy - r.colposcopyDone)} of ${n0(r.referredColposcopy)} referred women have no colposcopy on record`,
    },
    {
      title: 'Wait for colposcopy', big: wait != null ? n1(wait) : '–', unit: 'months', finland: `${n1(fiWait)} months`,
      behind: ratio >= 1.4, missing: wait == null, gap: (ratio - 1) * WAIT_WEIGHT,
      line: wait == null ? 'Not available' : ratio >= 1.4 ? `About ${n1(ratio)} times the national wait` : ratio <= 0.7 ? 'Shorter than the national wait' : 'Close to the national wait',
    },
  ]
}

/** Virtanen et al. 2011, Espoo: women who had not come, mailed an HPV self-sampling kit vs a reminder letter. */
const KIT = { pct: 29.8, reminderPct: 26.2 }

export function cervicalView(id: string): ProgrammeView | null {
  const r = CERVICAL.find((x) => x.id === id)
  if (!r) return null
  const tiles = cervicalTiles(r)
  const fi = CERVICAL_FI
  const reportingGap = !!tiles[1].missing
  const onTrack = !reportingGap && !tiles.some((t) => t.behind)
  const w = reportingGap ? 1 : onTrack ? 0 : pick(tiles)
  const kitUrl = CERVICAL_EVIDENCE.find((e) => e.id === 'mailed-self-sampling')?.url
  let start: ProgrammeView['start']
  let verdict: string
  let list: ListWording | undefined
  const listWording: ListWording = {
    personLabel: 'Woman', event: 'referral to colposcopy', bookedColumn: 'Colposcopy booked?',
    perYear: r.referredColposcopy, perYearLabel: 'referred to colposcopy', missedPerYear: Math.max(0, r.referredColposcopy - r.colposcopyDone),
    missedLabel: 'with no colposcopy on record', ageMin: 30, ageMax: 65, ageStep: 5, followup: 'colposcopy',
  }
  if (reportingGap) {
    start = {
      kind: 'reporting',
      title: 'Report every colposcopy to the register',
      text: 'Make sure every clinic that does colposcopies sends each result to the screening register, starting with the women referred in 2024.',
      result: `Only ${r.colposcopyDone} of ${n0(r.referredColposcopy)} referred women have a colposcopy on record, so no one can tell whether the rest were seen.`,
      estimate: false,
      basis: `${r.name}, ${CERVICAL_YEAR}: ${r.noFollowupInfo} of ${r.referredColposcopy} referred women with no follow-up information (Cancer Registry).`,
      who: 'The screening coordinator with the gynaecology clinics, starting now, then monthly.',
      measure: 'Referred women with a colposcopy on record; months from referral to the result reaching the register.',
      takes: 'No extra appointments: fixing how results are sent to the register.',
    }
    verdict = `In ${r.name}, colposcopies are almost entirely missing from the register (${r.colposcopyDone} of ${n0(r.referredColposcopy)} referred women). That is most likely a reporting gap: check the data reaches the register before anything else.`
  } else if (w === 0) {
    const non = r.invited - r.participated
    const kits = non * KIT.pct / 100
    const colpo = kits * r.referredColposcopyPct / 100
    start = {
      kind: 'attendance',
      title: 'Mail a self-test kit to women who didn’t come',
      text: 'Post an HPV self-sampling kit to every invited woman who hasn’t been tested a few months after the invitation.',
      result: `Up to about ${about(kits)} more women tested a year.`,
      estimate: true,
      basis: `In a Finnish trial (Espoo), ${KIT.pct}% of women who had not come took part after a mailed kit (${KIT.reminderPct}% after a reminder letter). Applied to ${r.name}'s ${n0(non)} untested women, ${CERVICAL_YEAR}. Less if the county already sends reminders.`,
      basisUrl: kitUrl,
      who: 'The screening programme team, a few months after each invitation round.',
      measure: 'Share of invited women tested, month by month; kits returned out of kits sent.',
      takes: `About ${about(kits / 52)} more HPV tests a week at the laboratory, and about ${about(colpo)} more colposcopies a year for the women who test positive.`,
    }
    verdict = onTrack
      ? `${r.name} is on track in cervical screening: no step is past our warning line, and ${n1(r.participationPct)}% of invited women were tested (Finland ${n1(fi.participationPct)}%), ${r.participationPct >= GOAL_ATTENDANCE ? `above the ${GOAL_ATTENDANCE}% goal` : `still below the ${GOAL_ATTENDANCE}% goal`}.`
      : `${r.name}'s problem is attendance: ${n1(r.participationPct)}% of invited women were tested, against ${n1(fi.participationPct)}% in Finland and the ${GOAL_ATTENDANCE}% goal.`
  } else if (w === 1) {
    const missing = r.referredColposcopy - r.colposcopyDone
    const toNational = Math.max(0, r.referredColposcopy * fi.colposcopyOfReferredPct / 100 - r.colposcopyDone)
    start = {
      kind: 'followup',
      title: 'Follow up every referral',
      text: 'Give the screening nurse a daily list of every woman referred for colposcopy who hasn’t had one booked, and call them.',
      result: `${n0(missing)} referred women have no colposcopy on record. Reaching the national rate means about ${about(toNational)} more colposcopies a year.`,
      estimate: false,
      basis: `More colposcopies = ${n0(r.referredColposcopy)} referrals × national ${n1(fi.colposcopyOfReferredPct)}% − ${n0(r.colposcopyDone)} done (Cancer Registry, ${CERVICAL_YEAR}). A target, not a study result.`,
      who: 'The screening nurse or coordinator, every working day.',
      measure: 'Days from referral to colposcopy booking; share of referred women with a colposcopy on record.',
      takes: `About ${about(toNational)} more colposcopies a year at the clinics.`,
    }
    list = listWording
    verdict = `${r.name}'s problem is follow-up: ${n0(missing)} of ${n0(r.referredColposcopy)} women referred for colposcopy have none on record (${n1(r.colposcopyOfReferredPct)}%, against ${n1(fi.colposcopyOfReferredPct)}% in Finland).`
  } else {
    start = {
      kind: 'wait',
      title: 'Clear the queue for colposcopy',
      text: 'Run extra colposcopy clinics until women referred are seen within the national wait.',
      result: `Target: the national ${n1(fi.medianMonthsToColposcopyApprox!)} months, down from ${n1(r.medianMonthsToColposcopyApprox!)}.`,
      estimate: false,
      basis: `Median time from positive test to colposcopy, ${CERVICAL_YEAR}, read from the Cancer Registry's chart.`,
      who: 'The gynaecology clinic, until the wait is back to the national level.',
      measure: 'Median wait from referral to colposcopy; women waiting.',
      takes: `Colposcopy slots for about ${about(r.referredColposcopy / 52)} referred women a week, plus the backlog.`,
    }
    verdict = `${r.name}'s problem is the wait: women referred for colposcopy wait about ${n1(r.medianMonthsToColposcopyApprox!)} months, against ${n1(fi.medianMonthsToColposcopyApprox!)} in Finland.`
  }
  return {
    programme: 'cervical', label: 'Cervical cancer screening', scope: `${CERVICAL_YEAR} · women ${CERVICAL_AGES}`, sourceUrl: CERVICAL_SOURCE_URL,
    tiles, startStep: w, verdict, onTrack, start, list,
    evidence: CERVICAL_EVIDENCE.map(({ id, action, effect, citation, url }) => ({ id, action, effect, citation, url })),
    warningLines: CERVICAL_LINES,
    caveat: CERVICAL_CAVEATS[r.id],
    facts: {
      programme: 'cervical', county: r.name, data_year: CERVICAL_YEAR, pathway_step: reportingGap ? 'reporting' : ['detection', 'referral', 'capacity'][w],
      attendance_pct: r.participationPct, attendance_finland_pct: fi.participationPct, goal_pct: GOAL_ATTENDANCE,
      referred_colposcopy: r.referredColposcopy, colposcopy_on_record: r.colposcopyDone, colposcopy_on_record_pct: r.colposcopyOfReferredPct,
      colposcopy_on_record_finland_pct: fi.colposcopyOfReferredPct,
      wait_months: r.medianMonthsToColposcopyApprox ?? '', wait_finland_months: fi.medianMonthsToColposcopyApprox!,
      action: start.title, action_detail: start.text, action_ids: reportingGap ? 'reporting' : w === 0 ? 'self-sampling' : w === 1 ? 'navigation' : 'catch-up',
      result: start.result, takes: start.takes,
    },
  }
}

export const programmeView = (p: ProgrammeId, id: string): ProgrammeView | null =>
  p === 'breast' ? breastView(id) : p === 'cervical' ? cervicalView(id) : null

/** How many of the three steps are past the warning line (reporting gaps count), for the map. */
export function stepsBehind(p: ProgrammeId, id: string): number | null {
  const v = programmeView(p, id)
  return v ? v.tiles.filter((t) => t.behind || t.missing).length : null
}

/** The template briefing for breast and cervical: the same facts the page shows, in four short sentences. */
export function programmeBriefing(v: ProgrammeView): string {
  return [v.verdict, `${v.onTrack ? 'To do even better' : 'The first step'}: ${lower(v.start.text)}`, v.start.result, v.start.takes].join(' ')
}

export const templateFor = (v: ProgrammeView): Briefing => ({ text: programmeBriefing(v), source: 'template' })
