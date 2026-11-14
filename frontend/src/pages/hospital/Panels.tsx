import { Card, EdgeText, Label, SourceBadge, cx } from '../../components/ui'
import { BARRIERS, PATHWAY, type BarrierId, type StepId } from '../../data/pathway'
import type { HospitalAction } from '../../lib/store'
import type { Coordinator } from './demoPatients'
import { IconCal, IconCheck, IconPhone } from './icons'
import type { Row } from './model'

/* ---------- 2.2 threshold ---------- */

export function ThresholdCard({ value, onChange, escalated }: { value: number; onChange: (n: number) => void; escalated: number }) {
  const set = (n: number) => onChange(Math.max(1, Math.min(30, n)))
  return (
    <Card tone="mustard" tilt={-1} className="p-6 pl-10">
      <EdgeText>Auto · escalate</EdgeText>
      <div className="flex items-start justify-between">
        <Label className="!opacity-80">Escalate after</Label>
        <SourceBadge id="ourModel" kind="estimate" demo={false} how="Overdue days ≥ threshold → flagged to the step's coordinator." />
      </div>
      <div className="flex items-center gap-4 mt-2">
        <button aria-label="Fewer days" onClick={() => set(value - 1)} className="w-10 h-10 rounded-full border border-ink/40 font-type text-lg hover:bg-ink hover:text-mustard transition-colors">−</button>
        <p className="font-serif leading-none flex items-baseline gap-2">
          <span className="text-6xl tabular-nums" data-testid="threshold">{value}</span>
          <span className="font-type text-xs uppercase tracking-widest">days late</span>
        </p>
        <button aria-label="More days" onClick={() => set(value + 1)} className="w-10 h-10 rounded-full border border-ink/40 font-type text-lg hover:bg-ink hover:text-mustard transition-colors">+</button>
      </div>
      <input type="range" min={1} max={30} value={value} onChange={(e) => set(+e.target.value)} aria-label="Escalation threshold in days"
        className="w-full mt-4 accent-[#1F1F1F]" />
      <div className="tear mt-3 pt-2 flex justify-between font-type text-xs uppercase tracking-widest">
        <span>→ {escalated} flagged</span>
        <span className="opacity-60">no call needed</span>
      </div>
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
    <Card tone="terra" tilt={1} className="p-6 pl-10 relative">
      <EdgeText>Coordinator queue</EdgeText>
      <div className="flex items-end justify-between gap-4">
        <div>
          <Label className="!opacity-80">Escalated</Label>
          <p className="font-serif text-6xl leading-none tabular-nums">{rows.length}</p>
        </div>
        <span className="font-type text-xs uppercase tracking-widest opacity-80 text-right">{groups.length} coordinators</span>
      </div>
      <div className="mt-5 space-y-5 max-h-[520px] overflow-y-auto pr-1 -mr-1">
        {!groups.length && <p className="font-serif italic text-2xl opacity-70 py-6">Queue clear</p>}
        {groups.map(({ c, items }) => (
          <section key={c.id} className="border-t border-dashed border-paper/40 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-xl leading-none">{c.name}</span>
              <span className="font-type text-xs tabular-nums">{items.length}</span>
            </div>
            <p className="font-type text-[11px] uppercase tracking-widest opacity-70 mb-2">{c.role}</p>
            <ul className="space-y-1">
              {items.map((r) => (
                <li key={r.p.id} className={cx('flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper/10', r.p.isYou && 'bg-mustard/25')}>
                  <button onClick={() => onOpen(r.p.id)} className="flex-1 min-w-0 text-left flex items-baseline gap-2">
                    <span className="font-type text-xs whitespace-nowrap">{r.p.isYou ? 'You' : r.p.label}</span>
                    <span className="font-serif text-lg leading-none ml-auto tabular-nums">+{r.overdue}</span>
                  </button>
                  <span className={cx('w-2 h-2 rounded-full shrink-0',
                    r.status === 'booked' ? 'bg-mustard' : r.status === 'contacted' ? 'bg-stone' : 'border border-paper')}
                    title={r.status} />
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
  const top = [...data].sort((a, b) => b.total - a.total)[0]
  const sys = rows.filter((r) => r.side === 'system').length
  const per = rows.filter((r) => r.side === 'personal').length
  const none = rows.length - sys - per
  const byReason = BARRIERS.map((b) => ({ b, n: rows.filter((r) => r.p.barrier?.step === r.step && r.p.barrier?.barrier === b.id).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)

  return (
    <Card tone="stone" tilt={-1.5} className="p-6 pl-10">
      <EdgeText>Where delays pile up</EdgeText>
      <div className="flex items-start justify-between">
        <Label>Overdue by step</Label>
        <SourceBadge id="demoPatients" kind="estimate" how="Count of open overdue cases, grouped by the step they wait for." />
      </div>
      {top?.total > 0 && <p className="font-serif italic text-3xl leading-none mt-1 mb-4">{top.s.short}</p>}
      <div className="space-y-2" role="list">
        {data.map((d) => {
          const active = step === d.s.id
          return (
            <button key={d.s.id} role="listitem" onClick={() => onStep(active ? 'all' : d.s.id)} data-step={d.s.id}
              className={cx('group w-full grid grid-cols-[72px_1fr_24px] items-center gap-2 text-left rounded-md px-1 py-1 transition-colors',
                active ? 'bg-ink/10' : 'hover:bg-ink/5', step !== 'all' && !active && 'opacity-50')}>
              <span className="font-type text-xs uppercase tracking-wider truncate">{d.s.short}</span>
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

      <div className="tear mt-5 pt-4">
        <div className="flex h-3 rounded-full overflow-hidden bg-black/[0.06]">
          <span className="bg-terra" style={{ flexGrow: sys }} />
          <span className="bg-mustard" style={{ flexGrow: per }} />
          <span className="bg-ink/40" style={{ flexGrow: none }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 font-type text-xs uppercase tracking-wider">
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
                <span className="font-type text-[13px] flex-1">{b.label}</span>
                <span className="font-type text-[13px] tabular-nums">{n}</span>
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
