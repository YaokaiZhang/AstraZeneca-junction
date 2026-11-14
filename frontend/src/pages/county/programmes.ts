// Breast and cervical screening: the same "where people are lost → do next" view as bowel, from the
// Cancer Registry's 2024 county statistics (breastData.ts, cervicalData.ts). No number here is invented:
// tiles are published figures; expected results apply one named study's effect to the county's own counts.
import { BREAST, BREAST_FI, BREAST_EVIDENCE, BREAST_AGES, BREAST_YEAR, type BreastRow } from '../monitor/breastData'
import { CERVICAL, CERVICAL_FI, CERVICAL_EVIDENCE, CERVICAL_AGES, CERVICAL_YEAR, CERVICAL_CAVEATS, type CervicalRow } from '../monitor/cervicalData'

export type ProgrammeId = 'bowel' | 'breast' | 'cervical'
export const PROGRAMMES: { id: ProgrammeId; label: string }[] = [
  { id: 'bowel', label: 'Bowel' },
  { id: 'breast', label: 'Breast' },
  { id: 'cervical', label: 'Cervical' },
]

export interface StepTile {
  title: string
  big: string
  unit?: string
  finland: string
  /** worse than Finland by the step's margin */
  behind: boolean
  /** no usable figure for this county (reporting gap) */
  missing?: boolean
  line: string
  /** relative gap to Finland, positive = worse; used to pick where to start */
  gap: number
}

export interface Evidence { action: string; effect: string; citation: string; url: string }

export interface ProgrammeView {
  label: string
  /** e.g. "2024 · women 50–69" */
  scope: string
  sourceId: 'breastScreening' | 'cervicalScreening'
  tiles: StepTile[]
  /** index of the step the start-here action targets */
  startStep: number
  verdict: { problem: string | null; onTrack: boolean }
  start: {
    title: string
    text: string
    result: string
    /** where the expected result comes from */
    basis: { kind: 'direct' | 'estimate'; sourceId: string; how: string }
  }
  evidence: Evidence[]
  caveat?: string
}

/** Ranking only: a wait twice the national one weighs like an attendance 5% below Finland's. */
const WAIT_WEIGHT = 0.05
const n0 = (x: number) => Math.round(x).toLocaleString('en-GB')
const n1 = (x: number) => x.toFixed(1)
/** Days, not weeks: rounding to whole weeks made 20 days vs 17 read as "3 weeks vs 2". */
const days = (months: number) => Math.max(1, Math.round(months * 30.44))
const pick = (tiles: StepTile[]) => {
  const behind = tiles.map((t, i) => [t, i] as const).filter(([t]) => t.behind && !t.missing)
  const pool = behind.length ? behind : tiles.map((t, i) => [t, i] as const).filter(([t]) => !t.missing)
  return pool.sort((a, b) => b[0].gap - a[0].gap)[0][1]
}

// ---------- breast ----------

function breastTiles(r: BreastRow): StepTile[] {
  const fi = BREAST_FI
  const fiWait = fi.medianMonthsToExam!
  const wait = r.medianMonthsToExam
  const ratio = wait != null ? wait / fiWait : 1
  return [
    {
      title: 'Mammogram done', big: `${n1(r.attendedPct)}%`, finland: `${n1(fi.attendedPct)}%`,
      behind: r.attendedPct < fi.attendedPct - 2, gap: (fi.attendedPct - r.attendedPct) / fi.attendedPct,
      line: `${n0(r.invited - r.attended)} invited women did not come`,
    },
    {
      title: 'Result on record', big: `${n1(100 - r.noHistologyPct)}%`, finland: `${n1(100 - fi.noHistologyPct)}%`,
      behind: r.noHistologyPct > fi.noHistologyPct + 3, gap: (r.noHistologyPct - fi.noHistologyPct) / 100,
      line: r.noHistology ? `${n0(r.noHistology)} referred women have no result on record` : 'Every referred woman has a result on record',
    },
    {
      title: 'Wait for follow-up exam', big: wait != null ? `${days(wait)}` : '–', unit: 'days', finland: `${days(fiWait)} days`,
      behind: ratio >= 1.4, missing: wait == null, gap: (ratio - 1) * WAIT_WEIGHT,
      line: ratio >= 1.4 ? `About ${n1(ratio)} times the national wait` : ratio <= 0.7 ? 'Shorter than the national wait' : 'Close to the national wait',
    },
  ]
}

const SMS = BREAST_EVIDENCE.find((e) => e.id === 'sms-reminder')!

export function breastView(id: string): ProgrammeView | null {
  const r = BREAST.find((x) => x.id === id)
  if (!r) return null
  const tiles = breastTiles(r)
  const w = pick(tiles)
  const fi = BREAST_FI
  let start: ProgrammeView['start']
  if (w === 0) {
    const extra = r.invited * (SMS.absolutePp! / 100)
    const cancers = extra * (r.cancers / r.attended)
    start = {
      title: 'Text a reminder before every appointment',
      text: 'Send a text message two days before each pre-booked mammogram, with the time and how to change it.',
      result: `Up to about ${n0(extra)} more women screened a year, about ${n0(Math.max(1, cancers))} more cancers found by screening.`,
      basis: { kind: 'estimate', sourceId: 'breastTrials', how: `A London trial raised attendance by ${SMS.absolutePp} points with text reminders. Applied to ${r.name}'s ${n0(r.invited)} invited women; cancers at the county's 2024 rate (${r.cancers} found in ${n0(r.attended)} screened). Effect likely smaller where attendance is already high.` },
    }
  } else if (w === 1) {
    start = {
      title: 'Get every result on record',
      text: 'Each month, check that every woman referred from screening has a result reported to the screening registry, and chase the missing ones.',
      result: `${n0(r.noHistology)} referred women have no result on record (${n1(r.noHistologyPct)}%, against ${n1(fi.noHistologyPct)}% in Finland). Without it, no one can tell whether they were diagnosed.`,
      basis: { kind: 'direct', sourceId: 'breastScreening', how: `${r.name}, ${BREAST_YEAR}: referred women with no histology reported by spring 2026.` },
    }
  } else {
    start = {
      title: 'Give the follow-up exam a time at recall',
      text: 'Book the follow-up mammogram and ultrasound in the recall letter, with a slot inside two weeks.',
      result: `Target: the national ${days(fi.medianMonthsToExam!)} days, down from ${days(r.medianMonthsToExam!)}. The fastest counties take about a week.`,
      basis: { kind: 'direct', sourceId: 'breastScreening', how: `Median time from positive mammogram to follow-up exam, ${BREAST_YEAR}, read from the Registry's chart.` },
    }
  }
  return {
    label: 'Breast cancer screening', scope: `${BREAST_YEAR} · women ${BREAST_AGES}`, sourceId: 'breastScreening',
    tiles, start, startStep: w,
    verdict: verdictOf(tiles, w, 'breast'),
    evidence: BREAST_EVIDENCE.map(({ action, effect, citation, url }) => ({ action, effect, citation, url })),
  }
}

// ---------- cervical ----------

function cervicalTiles(r: CervicalRow): StepTile[] {
  const fi = CERVICAL_FI
  const gapColpo = r.id === 'varsinais-suomi' // registry has colposcopy for 4 of 190 referred: reporting gap, not 2%
  const fiWait = fi.medianMonthsToColposcopyApprox!
  const wait = gapColpo ? null : r.medianMonthsToColposcopyApprox
  const ratio = wait != null ? wait / fiWait : 1
  return [
    {
      title: 'Test done', big: `${n1(r.participationPct)}%`, finland: `${n1(fi.participationPct)}%`,
      behind: r.participationPct < fi.participationPct - 2, gap: (fi.participationPct - r.participationPct) / fi.participationPct,
      line: `${n0(r.invited - r.participated)} invited women were not tested`,
    },
    {
      title: 'Colposcopy done', big: gapColpo ? '–' : `${n1(r.colposcopyOfReferredPct)}%`, finland: `${n1(fi.colposcopyOfReferredPct)}%`,
      behind: !gapColpo && r.colposcopyOfReferredPct < fi.colposcopyOfReferredPct - 3, missing: gapColpo,
      gap: (fi.colposcopyOfReferredPct - r.colposcopyOfReferredPct) / fi.colposcopyOfReferredPct,
      line: gapColpo ? 'Colposcopies are not being reported to the registry'
        : `${n0(r.referredColposcopy - r.colposcopyDone)} of ${n0(r.referredColposcopy)} referred women have no colposcopy on record`,
    },
    {
      title: 'Wait for colposcopy', big: wait != null ? n1(wait) : '–', unit: 'months', finland: `${n1(fiWait)} months`,
      behind: ratio >= 1.4, missing: wait == null, gap: (ratio - 1) * WAIT_WEIGHT,
      line: wait == null ? 'Not available' : ratio >= 1.4 ? `About ${n1(ratio)} times the national wait` : ratio <= 0.7 ? 'Shorter than the national wait' : 'Close to the national wait',
    },
  ]
}

const KIT = { pct: 29.8, reminderPct: 26.2 } // Virtanen et al. 2011, Espoo: non-attenders mailed a self-sampling kit vs a reminder letter

export function cervicalView(id: string): ProgrammeView | null {
  const r = CERVICAL.find((x) => x.id === id)
  if (!r) return null
  const tiles = cervicalTiles(r)
  const w = pick(tiles)
  const fi = CERVICAL_FI
  let start: ProgrammeView['start']
  if (tiles[1].missing) {
    start = {
      title: 'Report every colposcopy to the registry',
      text: 'Make sure the clinics that do colposcopies send each result to the screening registry, starting with the women referred in 2024.',
      result: `Only ${r.colposcopyDone} of ${n0(r.referredColposcopy)} referred women have a colposcopy on record, so no one can tell whether the rest were seen.`,
      basis: { kind: 'direct', sourceId: 'cervicalScreening', how: `${r.name}, ${CERVICAL_YEAR}: ${r.noFollowupInfo} of ${r.referredColposcopy} referred women with no follow-up information.` },
    }
    return {
      label: 'Cervical cancer screening', scope: `${CERVICAL_YEAR} · women ${CERVICAL_AGES}`, sourceId: 'cervicalScreening',
      tiles, start, startStep: 1,
      verdict: { onTrack: false, problem: 'colposcopies are not being reported to the screening registry' },
      evidence: CERVICAL_EVIDENCE.map(({ action, effect, citation, url }) => ({ action, effect, citation, url })),
      caveat: CERVICAL_CAVEATS[r.id],
    }
  } else if (w === 0) {
    const non = r.invited - r.participated
    start = {
      title: 'Mail a self-test kit to women who didn’t come',
      text: 'Post an HPV self-sampling kit to every invited woman who hasn’t been tested a few months after the invitation.',
      result: `Up to about ${n0(non * KIT.pct / 100)} more women tested a year.`,
      basis: { kind: 'estimate', sourceId: 'cervicalTrials', how: `In a Finnish trial (Espoo), ${KIT.pct}% of women who had not come took part after a mailed kit (${KIT.reminderPct}% after a reminder letter). Applied to ${r.name}'s ${n0(non)} untested women, ${CERVICAL_YEAR}. Less if the county already sends reminders.` },
    }
  } else if (w === 1) {
    const missing = r.referredColposcopy - r.colposcopyDone
    const toNational = Math.max(0, r.referredColposcopy * fi.colposcopyOfReferredPct / 100 - r.colposcopyDone)
    start = {
      title: 'Follow up every referral',
      text: 'Give the nurse a weekly list of every woman referred for colposcopy who hasn’t had one, and call them.',
      result: `${n0(missing)} referred women have no colposcopy on record. Reaching the national rate means about ${n0(Math.max(1, toNational))} more colposcopies a year.`,
      basis: { kind: 'estimate', sourceId: 'ourModel', how: `More colposcopies = ${r.name}'s ${n0(r.referredColposcopy)} referrals × national ${n1(fi.colposcopyOfReferredPct)}% − ${n0(r.colposcopyDone)} done (Cancer Registry, ${CERVICAL_YEAR}). A target, not a study result.` },
    }
  } else {
    start = {
      title: 'Clear the queue for colposcopy',
      text: 'Run extra colposcopy clinics until women referred are seen within the national wait.',
      result: `Target: the national ${n1(fi.medianMonthsToColposcopyApprox!)} months, down from ${n1(r.medianMonthsToColposcopyApprox!)}.`,
      basis: { kind: 'direct', sourceId: 'cervicalScreening', how: `Median time from positive test to colposcopy, ${CERVICAL_YEAR}, read from the Registry's chart.` },
    }
  }
  return {
    label: 'Cervical cancer screening', scope: `${CERVICAL_YEAR} · women ${CERVICAL_AGES}`, sourceId: 'cervicalScreening',
    tiles, start, startStep: w,
    verdict: verdictOf(tiles, w, 'cervical'),
    evidence: CERVICAL_EVIDENCE.map(({ action, effect, citation, url }) => ({ action, effect, citation, url })),
    caveat: CERVICAL_CAVEATS[r.id],
  }
}

function verdictOf(tiles: StepTile[], w: number, kind: 'breast' | 'cervical') {
  const onTrack = !tiles.some((t) => t.behind)
  if (onTrack) return { onTrack, problem: null }
  const t = tiles[w]
  const what = w === 0 ? t.line : w === 1 ? t.line : `women wait ${t.big} ${t.unit} for the follow-up ${kind === 'breast' ? 'exam' : 'colposcopy'}, against ${t.finland} nationally`
  return { onTrack, problem: what.charAt(0).toLowerCase() + what.slice(1) }
}

export const programmeView = (p: ProgrammeId, id: string) => (p === 'breast' ? breastView(id) : p === 'cervical' ? cervicalView(id) : null)
