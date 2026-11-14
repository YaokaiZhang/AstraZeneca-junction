// Page 2: Hospital — off-track list, automatic escalation, shared records, delay hot-spots.
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Chip, Display, Drawer, EdgeText, Label, SourceBadge, Stamp, Stat, Tabs, Toggle, toast, cx } from '../../components/ui'
import { COUNTIES } from '../../data/counties'
import { BARRIERS, PATHWAY, type BarrierId, type StepId } from '../../data/pathway'
import { useStore, type HospitalAction } from '../../lib/store'
import { CANCER_LABEL, coordinatorsFor, generatePatients, type CancerKey, type DemoPatient } from './demoPatients'
import { OffTrackList } from './OffTrackList'
import { DelayChart, EscalationQueue, ThresholdCard } from './Panels'
import { PatientDrawerBody } from './PatientDrawer'
import { STATUS_META, buildRows, median, type Row, type RowStatus } from './model'

const DEFAULT_COUNTY = 'pirkanmaa'
const CANCER_KEYS: CancerKey[] = ['lung', 'bowel', 'pancreas', 'liver', 'other']
const STEPS = PATHWAY.filter((s) => s.targetDays)

export default function HospitalPage() {
  const [params, setParams] = useSearchParams()
  const countyId = COUNTIES.some((c) => c.id === params.get('county')) ? params.get('county')! : DEFAULT_COUNTY
  const county = COUNTIES.find((c) => c.id === countyId)!

  const threshold = useStore((s) => s.escalateAfterDays)
  const actions = useStore((s) => s.actions)
  const set = useStore((s) => s.set)
  const sharing = useStore((s) => s.sharing)
  const pathway = useStore((s) => s.pathway)
  const barriers = useStore((s) => s.barriers)
  const diary = useStore((s) => s.diary)
  const risk = useStore((s) => s.risk)
  const profile = useStore((s) => s.profile)

  const [cancer, setCancer] = useState<CancerKey | 'all'>('all')
  const [step, setStep] = useState<StepId | 'all'>('all')
  const [reason, setReason] = useState<string>('all')
  const [status, setStatus] = useState<RowStatus | 'all'>('all')
  const [showAll, setShowAll] = useState(false)
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const [openId, setOpenId] = useState<string | null>(null)

  const coords = useMemo(() => coordinatorsFor(countyId), [countyId])
  const demo = useMemo(() => generatePatients(countyId), [countyId])

  const you = useMemo<DemoPatient | null>(() => {
    const dates = pathway?.dates ?? {}
    if (!sharing?.hospital || !Object.values(dates).some(Boolean)) return null
    const last = [...PATHWAY].reverse().findIndex((s) => dates[s.id])
    const nextStep = last >= 0 ? PATHWAY[PATHWAY.length - last]?.id : undefined
    const sorted = [...(barriers ?? [])].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    const b = sorted.find((x) => x.step === nextStep) ?? sorted[0]
    return {
      id: 'you', label: 'You', isYou: true, age: profile?.age ?? 0, cancer: (pathway.cancer ?? 'other') as CancerKey,
      dates, barrier: b ? { step: b.step, barrier: b.barrier, note: b.note } : undefined,
      shared: true, diary: diary ?? [], risk: risk ?? null,
    }
  }, [sharing, pathway, barriers, diary, risk, profile])

  const patients = useMemo(() => (you ? [you, ...demo] : demo), [you, demo])
  const rows = useMemo(() => buildRows(patients, actions, threshold, coords), [patients, actions, threshold, coords])

  const open = rows.filter((r) => r.status !== 'resolved')
  const done = rows.filter((r) => r.status === 'resolved')
  const offTrack = open.filter((r) => r.offTrack)
  const escalated = open.filter((r) => r.escalated)
  const med = median(offTrack.map((r) => r.overdue))

  const matchReason = (r: Row) => {
    if (reason === 'all') return true
    const b = r.p.barrier && r.p.barrier.step === r.step ? r.p.barrier.barrier : null
    if (reason === 'none') return !b
    if (reason === 'system' || reason === 'personal') return r.side === reason
    return b === reason
  }
  const list = (tab === 'open' ? open : done)
    .filter((r) => tab === 'done' || showAll || r.offTrack || r.p.isYou)
    .filter((r) => cancer === 'all' || r.p.cancer === cancer)
    .filter((r) => step === 'all' || r.step === step)
    .filter(matchReason)
    .filter((r) => status === 'all' || r.status === status)
    .sort((a, b) => Number(!!b.p.isYou) - Number(!!a.p.isYou) || b.overdue - a.overdue)

  const filtersOn = cancer !== 'all' || step !== 'all' || reason !== 'all' || status !== 'all'
  const clear = () => { setCancer('all'); setStep('all'); setReason('all'); setStatus('all') }

  const writeAction = useCallback((id: string, a: Omit<HospitalAction, 'at'> | null) => {
    set((s) => {
      const next = { ...s.actions }
      if (a) next[id] = { ...a, at: new Date().toISOString() }
      else delete next[id]
      return { actions: next }
    })
  }, [set])

  const name = (r: Row) => (r.p.isYou ? 'You' : r.p.label)
  const act = (r: Row, st: HospitalAction['status']) => {
    writeAction(r.p.id, { status: st, coordinator: r.action?.coordinator ?? r.coordinator?.id, note: r.action?.note })
    const who = r.coordinator?.name
    toast({ contacted: `${name(r)} · contacted`, booked: `${name(r)} · booked`, resolved: `${name(r)} · resolved`, escalated: `${name(r)} → ${who ?? 'coordinator'}`, new: name(r) }[st])
  }
  const reassign = (r: Row, coordId: string) => {
    const c = coords.find((x) => x.id === coordId)
    const st = r.action?.status && r.action.status !== 'new' ? r.action.status : 'escalated'
    writeAction(r.p.id, { status: st, coordinator: coordId })
    toast(`${name(r)} → ${c?.name}`)
  }
  const reopen = (r: Row) => { writeAction(r.p.id, null); toast(`${name(r)} · reopened`) }

  const selected = rows.find((r) => r.p.id === openId) ?? null
  const closeDrawer = useCallback(() => setOpenId(null), [])

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1500px]">
      {/* header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-end gap-6">
          <div>
            <Label className="mb-3">02 · Hospital · staff view</Label>
            <Display a="Off" b="track" />
          </div>
          {escalated.length > 0 && (
            <Stamp tone="terra" rotate={-12} className="hidden sm:flex mb-1">{escalated.length}<br />escalated</Stamp>
          )}
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <label className="flex items-center gap-3">
            <span className="label">County</span>
            <select value={countyId} aria-label="County"
              onChange={(e) => { setParams((p) => { p.set('county', e.target.value); return p }, { replace: true }); setOpenId(null) }}
              className="font-serif text-2xl italic border-b border-black/30 pr-2 py-0.5 outline-none focus:border-terra cursor-pointer">
              {COUNTIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <span className="flex items-center gap-2 font-type text-xs uppercase tracking-widest opacity-70">
            Synthetic caseload <SourceBadge id="demoPatients" kind="estimate" demo={false}
              how={`${patients.length - (you ? 1 : 0)} made-up patients, volume scaled from ${county.name}'s yearly lung, bowel, pancreas and liver cases.`} />
          </span>
        </div>
      </header>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mt-8">
        <Stat label="Active" value={open.length}
          badge={<SourceBadge id="demoPatients" kind="estimate" how="Open pathways in the synthetic caseload." />} />
        <Stat label="Off track" value={<span className="text-terra">{offTrack.length}</span>}
          badge={<SourceBadge id="thlTargets" kind="estimate" how="Days since last step > target for the next step." />} />
        <Stat label="Escalated" value={escalated.length}
          badge={<SourceBadge id="ourModel" kind="estimate" demo={false} how={`Overdue ≥ ${threshold} d, or escalated by staff; not yet resolved.`} />} />
        <Stat label="Median overdue" value={med} unit="days"
          badge={<SourceBadge id="demoPatients" kind="estimate" how="Median days past target among off-track patients." />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-8 xl:gap-10 mt-10 items-start">
        {/* 2.1 list */}
        <Card className="p-4 sm:p-6 pl-8 sm:pl-12 relative min-w-0">
          <EdgeText>Worst first · {county.name}</EdgeText>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <Tabs value={tab} onChange={setTab}
              tabs={[{ id: 'open', label: `Open · ${open.length}` }, { id: 'done', label: `Done · ${done.length}` }]} />
            {tab === 'open' && <Toggle on={showAll} onChange={setShowAll} label={showAll ? 'All patients' : 'Off track only'} />}
          </div>

          <div className="space-y-3 pb-4 mb-2 tear pt-4">
            <div className="flex flex-wrap gap-1.5">
              <Chip active={cancer === 'all'} onClick={() => setCancer('all')}>All</Chip>
              {CANCER_KEYS.map((c) => <Chip key={c} active={cancer === c} onClick={() => setCancer(cancer === c ? 'all' : c)}>{CANCER_LABEL[c]}</Chip>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
              <Select label="Step" value={step} onChange={(v) => setStep(v as StepId | 'all')}
                options={[['all', 'Any'], ...STEPS.map((s) => [s.id, s.short] as [string, string])]} />
              <Select label="Reason" value={reason} onChange={setReason}
                options={[['all', 'Any'], ['system', '· System'], ['personal', '· Personal'], ['none', '· None given'], ...BARRIERS.map((b) => [b.id, b.label] as [BarrierId, string])]} />
              <Select label="Status" value={status} onChange={(v) => setStatus(v as RowStatus | 'all')}
                options={[['all', 'Any'], ...(Object.keys(STATUS_META) as RowStatus[]).filter((k) => k !== 'resolved').map((k) => [k, STATUS_META[k].label] as [string, string])]} />
            </div>
            <div className={cx('flex items-center justify-between font-type text-xs uppercase tracking-widest', !filtersOn && 'opacity-60')}>
              <span data-testid="count">{list.length} shown</span>
              {filtersOn && <button onClick={clear} className="underline underline-offset-2 hover:text-terra">Clear filters ✕</button>}
            </div>
          </div>

          <OffTrackList rows={list} threshold={threshold} onOpen={setOpenId} />
        </Card>

        {/* side column */}
        <div className="space-y-8 min-w-0 xl:pt-2">
          <ThresholdCard value={threshold} onChange={(n) => set({ escalateAfterDays: n })} escalated={escalated.length} />
          <EscalationQueue rows={escalated} coords={coords} onOpen={setOpenId} onAct={act} />
          <DelayChart rows={offTrack} step={step} reason={reason}
            onStep={(s) => { setStep(s); setTab('open') }} onReason={(r) => { setReason(r); setTab('open') }} />
        </div>
      </div>

      <Drawer open={!!selected} onClose={closeDrawer}>
        {selected && <PatientDrawerBody row={selected} coords={coords} county={county.name} onAct={act} onReassign={reassign} onReopen={reopen} />}
      </Drawer>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 min-w-0">
      <span className="label shrink-0 w-12">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className={cx('flex-1 min-w-0 border-b py-1 font-type text-xs outline-none focus:border-terra cursor-pointer', value !== 'all' ? 'border-ink' : 'border-black/20')}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
