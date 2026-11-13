// Synthetic hospital caseload. NOT real people: generated deterministically from a county's
// yearly case counts so the list looks like a realistic load for that county.
import { COUNTIES, type CancerId } from '../../data/counties'
import { PATHWAY, DAY, today, type BarrierId, type StepId } from '../../data/pathway'
import { mulberry32, pick } from '../../lib/random'
import type { DiaryEntry, RiskResult } from '../../lib/store'

export type CancerKey = CancerId | 'other'

export interface DemoPatient {
  id: string
  label: string
  age: number
  cancer: CancerKey
  dates: Partial<Record<StepId, string>>
  barrier?: { step: StepId; barrier: BarrierId; note?: string }
  shared: boolean
  diary: DiaryEntry[]
  risk: RiskResult | null
  isYou?: boolean
}

export const CANCER_LABEL: Record<CancerKey, string> = {
  lung: 'Lung', bowel: 'Bowel', pancreas: 'Pancreas', liver: 'Liver', other: 'Other',
}

/* ---------- coordinators ---------- */

export interface Coordinator { id: string; name: string; role: string; step: StepId }

const ROLE: Partial<Record<StepId, string>> = {
  referral: 'Referral desk',
  scan: 'Imaging coordinator',
  diagnosis: 'Diagnostics coordinator',
  mdt: 'MDT coordinator',
  treatment: 'Nurse navigator',
}
const FIRST = ['Aino', 'Mikko', 'Leena', 'Juha', 'Sanna', 'Timo', 'Riikka', 'Pekka', 'Hanna', 'Ville', 'Outi', 'Jari', 'Elina', 'Antti', 'Kaisa', 'Matti', 'Satu', 'Heikki', 'Noora', 'Ilkka']
const LAST = ['Virtanen', 'Korhonen', 'Mäkinen', 'Nieminen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen', 'Salo', 'Rantanen', 'Hämäläinen', 'Kallio', 'Lindqvist', 'Aaltonen', 'Ahonen']

export function coordinatorsFor(countyId: string): Coordinator[] {
  const idx = Math.max(0, COUNTIES.findIndex((c) => c.id === countyId))
  const r = mulberry32(7000 + idx * 131)
  const used = new Set<string>()
  const out: Coordinator[] = []
  for (const s of PATHWAY) {
    const role = ROLE[s.id]
    if (!role) continue
    for (let k = 0; k < 2; k++) {
      let name = ''
      do { name = `${pick(r, FIRST)} ${pick(r, LAST)}` } while (used.has(name))
      used.add(name)
      out.push({ id: `${s.id}-${k}`, name, role, step: s.id })
    }
  }
  return out
}

/* ---------- patients ---------- */

const iso = (d: number) => new Date(d).toISOString().slice(0, 10)
const shift = (date: string, days: number) => iso(new Date(date).getTime() + days * DAY)

const totals = COUNTIES.map((c) => Object.values(c.cancers).reduce((a, x) => a + x.cases, 0))
const T_MIN = Math.min(...totals)
const T_MAX = Math.max(...totals)

/** Active caseload size: 40 (smallest county) … 80 (largest), scaled from yearly cases. */
export function caseloadSize(countyId: string) {
  const i = COUNTIES.findIndex((c) => c.id === countyId)
  const t = totals[i] ?? T_MIN
  return Math.round(40 + 40 * ((t - T_MIN) / (T_MAX - T_MIN || 1)))
}

const SYMPTOMS: Record<CancerKey, [string, string][]> = {
  lung: [['Cough that will not go away', 'cough'], ['Out of breath on the stairs', 'breathless'], ['A little blood when coughing', 'blood-cough'], ['Lost weight without trying', 'weight-loss'], ['Tired all day', 'fatigue'], ['Chest hurts when breathing in', 'chest-pain']],
  bowel: [['Blood in stool', 'blood-stool'], ['Bowel habits changed', 'bowel-change'], ['Stomach cramps', 'abdominal-pain'], ['Lost weight without trying', 'weight-loss'], ['Tired all day', 'fatigue']],
  pancreas: [['Upper belly pain going to the back', 'abdominal-pain'], ['Skin looks yellow', 'jaundice'], ['No appetite', 'appetite'], ['Lost weight without trying', 'weight-loss'], ['Pale, greasy stools', 'stool-change']],
  liver: [['Ache under the right ribs', 'abdominal-pain'], ['Skin looks yellow', 'jaundice'], ['Belly feels swollen', 'swelling'], ['Tired all day', 'fatigue'], ['Itchy skin', 'itch']],
  other: [['Noticed a lump', 'lump'], ['Night sweats', 'night-sweats'], ['Lost weight without trying', 'weight-loss'], ['Tired all day', 'fatigue'], ['Pain that keeps coming back', 'pain']],
}

const BARRIER_WEIGHTS: [BarrierId, number][] = [
  ['no-contact', 0.42], ['transport', 0.16], ['unwell', 0.14], ['scared', 0.1], ['cost', 0.1], ['other', 0.08],
]
function weighted<T>(r: () => number, xs: [T, number][]): T {
  const total = xs.reduce((a, [, w]) => a + w, 0)
  let x = r() * total
  for (const [v, w] of xs) { x -= w; if (x <= 0) return v }
  return xs[xs.length - 1][0]
}

export function generatePatients(countyId: string, now: string = today()): DemoPatient[] {
  const ci = Math.max(0, COUNTIES.findIndex((c) => c.id === countyId))
  const county = COUNTIES[ci]
  const r = mulberry32(4242 + ci * 977)
  const n = caseloadSize(countyId)
  const mix: [CancerKey, number][] = [
    ...(Object.entries(county.cancers) as [CancerId, { cases: number }][]).map(([k, v]) => [k, v.cases] as [CancerKey, number]),
  ]
  mix.push(['other', mix.reduce((a, [, w]) => a + w, 0) * 0.45])

  const out: DemoPatient[] = []
  for (let i = 0; i < n; i++) {
    const cancer = weighted(r, mix)
    // which step is done last: 0 = first visit … 4 = planning meeting done (waiting for treatment)
    const lastDone = weighted(r, [[0, 0.14], [1, 0.3], [2, 0.22], [3, 0.2], [4, 0.14]])
    const next = PATHWAY[lastDone + 1]
    const target = next.targetDays ?? 7
    const late = r() < 0.27
    const waited = late
      ? target + 1 + Math.floor(Math.pow(r(), 1.8) * 24)
      : Math.floor(r() * (target + 1))

    const dates: Partial<Record<StepId, string>> = {}
    let cursor = shift(now, -waited)
    dates[PATHWAY[lastDone].id] = cursor
    for (let s = lastDone; s > 0; s--) {
      const t = PATHWAY[s].targetDays ?? 7
      const took = Math.max(1, Math.round(t * (0.45 + r() * 0.85)))
      cursor = shift(cursor, -took)
      dates[PATHWAY[s - 1].id] = cursor
    }

    let barrier: DemoPatient['barrier']
    if ((late && r() < 0.68) || (!late && r() < 0.07)) {
      barrier = { step: next.id, barrier: weighted(r, BARRIER_WEIGHTS) }
    }

    const age = Math.round(cancer === 'lung' || cancer === 'pancreas' ? 55 + r() * 30 : 42 + r() * 42)
    const shared = r() < 0.36
    const diary: DiaryEntry[] = []
    let risk: RiskResult | null = null
    if (shared) {
      const pool = SYMPTOMS[cancer]
      const k = 2 + Math.floor(r() * 4)
      const gp = dates.gp!
      for (let j = 0; j < k; j++) {
        const [text, tag] = pool[Math.floor(r() * pool.length)]
        const date = shift(gp, Math.round(-40 + r() * (55 + waited)))
        if (date > now) continue
        diary.push({ id: `${i}-${j}`, date, createdAt: `${date}T09:00:00.000Z`, text, tags: [tag], source: r() < 0.5 ? 'chat' : 'checkin' })
      }
      diary.sort((a, b) => a.date.localeCompare(b.date))
      if (cancer === 'lung') {
        const smoker = r() < 0.55 ? 'current' : 'former'
        risk = {
          inputs: {
            age, education: (2 + Math.floor(r() * 3)) as 2 | 3 | 4, bmi: Math.round(22 + r() * 9), copd: r() < 0.3,
            personalCancer: false, familyLung: r() < 0.2, smoker, cigsPerDay: 10 + Math.floor(r() * 20),
            yearsSmoked: 20 + Math.floor(r() * 30), yearsQuit: smoker === 'former' ? Math.floor(r() * 15) : 0, ethnicity: 'white',
          },
          prob6y: +(0.006 + Math.pow(r(), 1.4) * 0.12).toFixed(4),
          at: `${dates.gp}T10:00:00.000Z`,
        }
      }
    }

    out.push({ id: `${countyId}:${i + 1}`, label: `Patient ${i + 1}`, age, cancer, dates, barrier, shared, diary, risk })
  }
  return out
}
