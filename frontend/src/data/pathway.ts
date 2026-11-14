// Care-pathway steps and target times (days from the previous step).
// Published rule (Ministry of Social Affairs and Health report 2010:6): first treatment within 6 weeks of the
// referral arriving, tests included. Referral → treatment below adds up to 14 + 14 + 7 + 7 = 42 days; how the
// 6 weeks split across steps, and the 7 days from GP visit to referral, are our assumptions (see SOURCES.thlTargets).
export type StepId = 'gp' | 'referral' | 'scan' | 'diagnosis' | 'mdt' | 'treatment'

export interface PathwayStep {
  id: StepId
  label: string
  short: string
  /** target in days counted from the previous step's date */
  targetDays: number | null
  owner: 'patient' | 'health centre' | 'hospital'
  expect: string
}

export const PATHWAY: PathwayStep[] = [
  { id: 'gp', label: 'First doctor visit', short: 'Visit', targetDays: null, owner: 'patient', expect: 'Bring your symptom summary.' },
  { id: 'referral', label: 'Referral sent', short: 'Referral', targetDays: 7, owner: 'health centre', expect: 'The health centre sends a referral to the hospital.' },
  { id: 'scan', label: 'Scan / specialist visit', short: 'Scan', targetDays: 14, owner: 'hospital', expect: 'The hospital calls or sends a letter with a time.' },
  { id: 'diagnosis', label: 'Diagnosis', short: 'Diagnosis', targetDays: 14, owner: 'hospital', expect: 'A doctor goes through the results with you.' },
  { id: 'mdt', label: 'Treatment-planning meeting', short: 'Planning', targetDays: 7, owner: 'hospital', expect: 'Specialists agree a plan together.' },
  { id: 'treatment', label: 'Treatment start', short: 'Treatment', targetDays: 7, owner: 'hospital', expect: 'First surgery, radiotherapy or medicine.' },
]

export type BarrierId = 'no-contact' | 'transport' | 'cost' | 'unwell' | 'scared' | 'other'
export const BARRIERS: { id: BarrierId; label: string; side: 'system' | 'personal' }[] = [
  { id: 'no-contact', label: 'No word from the hospital', side: 'system' },
  { id: 'transport', label: "Can't get there", side: 'personal' },
  { id: 'cost', label: "Can't afford it", side: 'personal' },
  { id: 'unwell', label: 'Too unwell', side: 'personal' },
  { id: 'scared', label: 'Scared', side: 'personal' },
  { id: 'other', label: 'Something else', side: 'personal' },
]

export const DAY = 86_400_000
export const daysBetween = (a: string | number | Date, b: string | number | Date) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY)
export const today = () => new Date().toISOString().slice(0, 10)

export interface PathwayStatus {
  /** index of the last completed step, -1 if none */
  lastDone: number
  /** next step to happen, or null if finished */
  next: PathwayStep | null
  /** days since last completed step */
  waited: number
  /** positive = overdue by that many days */
  overdueBy: number
  dueDate: string | null
}

/** Shared by the patient clock and the hospital off-track list. */
export function pathwayStatus(dates: Partial<Record<StepId, string>>, now: string = today()): PathwayStatus {
  let lastDone = -1
  PATHWAY.forEach((s, i) => { if (dates[s.id]) lastDone = i })
  const next = PATHWAY[lastDone + 1] ?? null
  if (lastDone < 0 || !next) return { lastDone, next, waited: 0, overdueBy: 0, dueDate: null }
  const from = dates[PATHWAY[lastDone].id]!
  const waited = daysBetween(from, now)
  const target = next.targetDays ?? 0
  const due = new Date(new Date(from).getTime() + target * DAY).toISOString().slice(0, 10)
  return { lastDone, next, waited, overdueBy: waited - target, dueDate: due }
}
