// Single persisted store shared by all three pages.
// The patient page writes; the hospital page reads what the patient has opted to share.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BarrierId, StepId } from '../data/pathway'
import type { CancerId } from '../data/counties'

export type Lang = 'fi' | 'sv' | 'en' | 'ru' | 'so'

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

export interface BarrierReport { step: StepId; barrier: BarrierId; note?: string; at: string }

export interface HospitalAction {
  status: 'new' | 'contacted' | 'booked' | 'escalated' | 'resolved'
  coordinator?: string
  note?: string
  at: string
}

interface State {
  // patient
  lang: Lang
  profile: { age?: number; county?: string; sex?: 'f' | 'm' | 'x' }
  diary: DiaryEntry[]
  risk: RiskResult | null
  pathway: { cancer: CancerId | 'other'; dates: Partial<Record<StepId, string>> }
  barriers: BarrierReport[]
  checkins: { enabled: boolean; everyDays: number; lastAt?: string }
  screening: Partial<Record<'bowel' | 'breast' | 'cervical', 'yes' | 'no' | 'kit' | 'unsure'>>
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
  pathway: { cancer: 'lung' as const, dates: {} },
  barriers: [] as BarrierReport[],
  checkins: { enabled: false, everyDays: 7 },
  screening: {},
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
    { name: 'ajoissa-v1' },
  ),
)

export const uid = () => Math.random().toString(36).slice(2, 10)
