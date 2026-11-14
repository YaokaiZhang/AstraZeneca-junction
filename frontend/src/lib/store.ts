// Single persisted store shared by all three pages.
// The patient page writes; the hospital page reads what the patient has opted to share.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BarrierId, StepId } from '../data/pathway'
import type { CancerId } from '../data/counties'

export type Lang = 'fi' | 'sv' | 'en'
export const LANG_IDS: readonly Lang[] = ['fi', 'sv', 'en']
/** Older builds also offered 'ru' and 'so'; anything not in LANG_IDS falls back to English. */
export const asLang = (v: unknown): Lang => (LANG_IDS.includes(v as Lang) ? (v as Lang) : 'en')

export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD the symptom/event refers to
  createdAt: string // ISO timestamp
  text: string
  /** normalised symptom keys, e.g. 'cough', 'weight-loss' */
  tags: string[]
  source: 'chat' | 'checkin'
}

export interface RiskInputs {
  age: number
  education: 1 | 2 | 3 | 4 | 5 | 6
  bmi: number
  copd: boolean
  personalCancer: boolean
  familyLung: boolean
  smoker: 'current' | 'former'
  cigsPerDay: number
  yearsSmoked: number
  yearsQuit: number
  ethnicity: 'white' | 'black' | 'hispanic' | 'asian' | 'other'
}
export interface RiskResult { inputs: RiskInputs; prob6y: number; at: string }

/** Everything the patient "Screening check" asks. Age and sex live in `profile`. */
export interface CheckInputs {
  smoker: 'never' | 'current' | 'former'
  cigsPerDay: number
  yearsSmoked: number
  yearsQuit: number
  heightCm: number
  weightKg: number
  drinksPerWeek: number
  familyLung: boolean
  familyBowel: boolean
  familyBreast: boolean
  // only used by the lung model (PLCOm2012)
  education: RiskInputs['education']
  copd: boolean
  personalCancer: boolean
  ethnicity: RiskInputs['ethnicity']
}
/** Internal 10-year estimates (null = does not apply). Never shown to the person; a clinician may see them if shared. */
export interface Estimates { bowel: number | null; breast: number | null; cervical: number | null }
export interface CheckResult { inputs: CheckInputs; est: Estimates; at: string }

export interface BarrierReport { step: StepId; barrier: BarrierId; note?: string; at: string }

export interface HospitalAction {
  status: 'new' | 'contacted' | 'booked' | 'escalated' | 'resolved'
  coordinator?: string
  note?: string
  at: string
}

export interface State {
  // patient
  lang: Lang
  profile: { age?: number; county?: string; sex?: 'f' | 'm' | 'x' }
  diary: DiaryEntry[]
  /** lung: PLCOm2012 result (null for never-smokers / not checked) */
  risk: RiskResult | null
  check: CheckResult | null
  pathway: { cancer: CancerId | 'other'; dates: Partial<Record<StepId, string>> }
  barriers: BarrierReport[]
  checkins: { enabled: boolean; everyDays: number; lastAt?: string }
  sharing: { hospital: boolean; stats: boolean; at?: string }

  // hospital
  escalateAfterDays: number
  actions: Record<string, HospitalAction>

  // setters (kept generic on purpose)
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => void
  reset: () => void
}

const initial = {
  lang: 'en' as Lang,
  profile: {},
  diary: [] as DiaryEntry[],
  risk: null,
  check: null as CheckResult | null,
  pathway: { cancer: 'lung' as const, dates: {} },
  barriers: [] as BarrierReport[],
  checkins: { enabled: false, everyDays: 7 },
  sharing: { hospital: false, stats: false },
  escalateAfterDays: 5,
  actions: {} as Record<string, HospitalAction>,
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial,
      set: (patch) => set(patch as never),
      reset: () => set(initial),
    }),
    {
      name: 'ajoissa-v1',
      // a stored language from an older build ('ru', 'so') falls back to English
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return { ...current, ...p, lang: asLang(p.lang ?? current.lang) }
      },
    },
  ),
)

export const uid = () => Math.random().toString(36).slice(2, 10)
