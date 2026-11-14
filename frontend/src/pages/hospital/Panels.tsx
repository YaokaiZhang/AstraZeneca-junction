import { Card, Label, SourceBadge, cx } from '../../components/ui'
import { BARRIERS, PATHWAY, type BarrierId, type StepId } from '../../data/pathway'
import type { HospitalAction } from '../../lib/store'
import type { Coordinator } from './demoPatients'
import { IconCal, IconCheck, IconPhone } from './icons'
import type { Row } from './model'

/* ---------- 2.2 threshold ---------- */

export function ThresholdCard({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.max(1, Math.min(30, n)))
  return (
    <Card tone="mustard" tilt={-1} className="p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <Label className="!opacity-80">Auto-escalate after</Label>
        <SourceBadge id="ourModel" kind="estimate" demo={false} how="Overdue days ≥ threshold → flagged to the step's coordinator, no call from the patient needed." />
      </div>
      <div className="flex items-center justify-between gap-4 mt-3">
        <button aria-label="Fewer days" onClick={() => set(value - 1)} className="w-10 h-10 rounded-full border border-ink/40 font-type text-lg hover:bg-ink hover:text-mustard transition-colors">−</button>
        <p className="font-serif leading-none flex items-baseline gap-2">
          <span className="text-6xl lining-nums tabular-nums" data-testid="threshold">{value}</span>
          <span className="font-type text-sm uppercase tracking-widest">days</span>
        </p>
        <button aria-label="More days" onClick={() => set(value + 1)} className="w-10 h-10 rounded-full border border-ink/40 font-type text-lg hover:bg-ink hover:text-mustard transition-colors">+</button>
      </div>
      <input type="range" min={1} max={30} value={value} onChange={(e) => set(+e.target.value)} aria-label="Escalation threshold in days"
        className="w-full mt-4 accent-[#1F1F1F]" />
    </Card>
  )
}

/* ---------- 2.2 escalation queue ---------- */

export function EscalationQueue({ rows, coords, onOpen, onAct }: {
  rows: Row[]; coords: Coordinator[]; onOpen: (id: string) => void; onAct: (r: Row, s: HospitalAction['status']) => void
}) {
  const groups = coords
    .map((c) => ({ c, items: rows.filter((r) => r.coordinator?.id === c.id).sort((a, b) => b.overdue - a.overdue) }))
    .filter((g) => g.items.length)
  return (
    <Card tone="terra" className="p-5 sm:p-6 relative">
      <Label className="!opacity-80">Coordinators</Label>
      <div className="mt-2 space-y-4 max-h-[560px] overflow-y-auto pr-1 -mr-1">
        {!groups.length && <p className="font-serif italic text-2xl opacity-70 py-6">Queue clear</p>}
        {groups.map(({ c, items }) => (
          <section key={c.id} className="border-t border-paper/25 pt-3 first:border-0 first:pt-1">
            <p className="font-serif text-xl leading-none">{c.name}</p>
            <p className="font-type text-sm opacity-80 mt-1 mb-1">{c.role}</p>
            <ul className="space-y-1">
              {items.map((r) => (
                <li key={r.p.id} className={cx('flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper/10', r.p.isYou && 'bg-mustard/25')}>
                  <button onClick={() => onOpen(r.p.id)} className="flex-1 min-w-0 text-left flex items-baseline gap-2">
                    <span className="font-serif text-2xl leading-none lining-nums tabular-nums w-11 shrink-0">{r.overdue}<span className="font-type text-sm opacity-80">d</span></span>
                    <span className="font-type text-sm whitespace-nowrap truncate">{r.p.isYou ? 'You' : r.p.label}</span>
                  </button>
                  <QuickBtn title="Contacted" active={r.status === 'contacted'} onClick={() => onAct(r, 'contacted')}><IconPhone className="w-3.5 h-3.5" /></QuickBtn>
                  <QuickBtn title="Booked" active={r.status === 'booked'} onClick={() => onAct(r, 'booked')}><IconCal className="w-3.5 h-3.5" /></QuickBtn>
                  <QuickBtn title="Resolved" onClick={() => onAct(r, 'resolved')}><IconCheck className="w-3.5 h-3.5" /></QuickBtn>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  )
}

function QuickBtn({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick}
      className={cx('w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors',
        active ? 'bg-ink text-mustard' : 'border border-paper/40 hover:bg-ink hover:text-mustard hover:border-ink')}>
      {children}
    </button>
  )
}

/* ---------- 2.4 where delays pile up ---------- */

export function DelayChart({ rows, step, reason, onStep, onReason }: {
  rows: Row[]; step: StepId | 'all'; reason: string; onStep: (s: StepId | 'all') => void; onReason: (r: string) => void
}) {
  const steps = PATHWAY.filter((s) => s.targetDays)
  const data = steps.map((s) => {
    const rs = rows.filter((r) => r.step === s.id)
    return { s, total: rs.length, system: rs.filter((r) => r.side === 'system').length, personal: rs.filter((r) => r.side === 'personal').length }
  })
  const max = Math.max(1, ...data.map((d) => d.total))
  const sys = rows.filter((r) => r.side === 'system').length
  const per = rows.filter((r) => r.side === 'personal').length
  const none = rows.length - sys - per
  const byReason = BARRIERS.map((b) => ({ b, n: rows.filter((r) => r.p.barrier?.step === r.step && r.p.barrier?.barrier === b.id).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)

  return (
    <Card tone="stone" className="p-5 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <Label>Where delays pile up</Label>
        <SourceBadge id="demoPatients" kind="example" how="Count of open overdue cases, grouped by the step they wait for." />
      </div>
      <div className="space-y-2" role="list">
        {data.map((d) => {
          const active = step === d.s.id
          return (
            <button key={d.s.id} role="listitem" onClick={() => onStep(active ? 'all' : d.s.id)} data-step={d.s.id}
              className={cx('group w-full grid grid-cols-[72px_1fr_24px] items-center gap-2 text-left rounded-md px-1 py-1 transition-colors',
                active ? 'bg-ink/10' : 'hover:bg-ink/5', step !== 'all' && !active && 'opacity-50')}>
              <span className="font-type text-sm uppercase tracking-wider truncate">{d.s.short}</span>
              <span className="relative h-5 rounded-sm bg-black/[0.06] overflow-hidden">
                <span className="absolute inset-y-0 left-0 flex" style={{ width: `${(d.total / max) * 100}%` }}>
                  <span className="bg-terra h-full" style={{ flexGrow: d.system }} />
                  <span className="bg-mustard h-full" style={{ flexGrow: d.personal }} />
                  <span className="bg-ink/40 h-full" style={{ flexGrow: d.total - d.system - d.personal }} />
                </span>
                {active && <span className="absolute inset-0 ring-2 ring-ink rounded-sm" />}
              </span>
              <span className="font-serif text-lg leading-none tabular-nums text-right">{d.total}</span>
            </button>
          )
        })}
      </div>

      <div className="tear mt-4 pt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-type text-sm uppercase tracking-wider">
          <Legend dot="bg-terra" label="System" n={sys} active={reason === 'system'} onClick={() => onReason(reason === 'system' ? 'all' : 'system')} />
          <Legend dot="bg-mustard" label="Personal" n={per} active={reason === 'personal'} onClick={() => onReason(reason === 'personal' ? 'all' : 'personal')} />
          <Legend dot="bg-ink/40" label="No reason" n={none} active={reason === 'none'} onClick={() => onReason(reason === 'none' ? 'all' : 'none')} />
        </div>
        <ul className="mt-4 space-y-1">
          {byReason.map(({ b, n }) => (
            <li key={b.id}>
              <button onClick={() => onReason(reason === b.id ? 'all' : (b.id as BarrierId))}
                className={cx('w-full flex items-center gap-2 text-left rounded px-1 py-0.5 hover:bg-ink/5', reason === b.id && 'bg-ink/10')}>
                <span className={cx('w-1.5 h-1.5 rounded-full', b.side === 'system' ? 'bg-terra' : 'bg-mustard')} />
                <span className="font-type text-[15px] flex-1">{b.label}</span>
                <span className="font-type text-[15px] tabular-nums">{n}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function Legend({ dot, label, n, active, onClick }: { dot: string; label: string; n: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx('flex items-center gap-1.5 text-left rounded px-1 py-0.5 hover:bg-ink/5', active && 'bg-ink/10')}>
      <span className={cx('w-2 h-2 rounded-full shrink-0', dot)} />
      <span>{label}</span>
      <span className="tabular-nums opacity-70">{n}</span>
    </button>
  )
}
