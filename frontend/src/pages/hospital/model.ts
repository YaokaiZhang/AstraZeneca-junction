// Derived view-model for the hospital page: status, escalation and filtering.
import { BARRIERS, pathwayStatus, type BarrierId, type PathwayStatus, type StepId } from '../../data/pathway'
import type { HospitalAction } from '../../lib/store'
import type { Coordinator, DemoPatient } from './demoPatients'

export type RowStatus = 'on-track' | 'overdue' | 'escalated' | 'contacted' | 'booked' | 'resolved'

export interface Row {
  p: DemoPatient
  st: PathwayStatus
  step: StepId | null
  overdue: number
  offTrack: boolean
  escalated: boolean
  /** auto = crossed the threshold; manual = staff escalated early */
  escalatedBy: 'auto' | 'manual' | null
  coordinator: Coordinator | null
  action?: HospitalAction
  status: RowStatus
  side: 'system' | 'personal' | null
}

export const STATUS_META: Record<RowStatus, { label: string; cls: string }> = {
  'on-track': { label: 'On track', cls: 'border border-black/15 text-ink/60' },
  overdue: { label: 'Overdue', cls: 'border border-terra text-terra' },
  escalated: { label: 'Escalated', cls: 'bg-terra text-paper' },
  contacted: { label: 'Contacted', cls: 'bg-stone text-ink' },
  booked: { label: 'Booked', cls: 'bg-mustard text-ink' },
  resolved: { label: 'Resolved', cls: 'bg-moss text-paper' },
}

export const barrierMeta = (id?: BarrierId) => BARRIERS.find((b) => b.id === id)

export function buildRows(patients: DemoPatient[], actions: Record<string, HospitalAction>, threshold: number, coords: Coordinator[], now?: string): Row[] {
  return patients.map((p) => {
    const st = pathwayStatus(p.dates, now)
    const step = st.next?.id ?? null
    const overdue = st.next ? st.overdueBy : 0
    const action = actions[p.id]
    const resolved = action?.status === 'resolved'
    const auto = overdue >= threshold && overdue > 0
    const manual = action?.status === 'escalated' || (!!action && action.status !== 'resolved' && !auto && !!action.coordinator)
    const escalated = !resolved && !!st.next && (auto || manual)
    const stepCoords = coords.filter((c) => c.step === step)
    const fallback = stepCoords.length ? stepCoords[hash(p.id) % stepCoords.length] : null
    const coordinator = (action?.coordinator && coords.find((c) => c.id === action.coordinator)) || fallback
    let status: RowStatus
    if (resolved) status = 'resolved'
    else if (action?.status === 'booked') status = 'booked'
    else if (action?.status === 'contacted') status = 'contacted'
    else if (escalated) status = 'escalated'
    else if (overdue > 0) status = 'overdue'
    else status = 'on-track'
    const bar = p.barrier && p.barrier.step === step ? barrierMeta(p.barrier.barrier) : undefined
    return {
      p, st, step, overdue, offTrack: overdue > 0 && !resolved, escalated,
      escalatedBy: escalated ? (auto ? 'auto' : 'manual') : null,
      coordinator: escalated || action ? coordinator : null,
      action, status, side: bar?.side ?? null,
    }
  })
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export function ago(isoTs: string) {
  const m = Math.round((Date.now() - new Date(isoTs).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

export const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
