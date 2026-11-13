import { cx } from '../../components/ui'
import { PATHWAY } from '../../data/pathway'
import { CANCER_LABEL } from './demoPatients'
import { STATUS_META, barrierMeta, type Row } from './model'

const stepShort = (id: string | null) => (id ? PATHWAY.find((s) => s.id === id)?.short ?? id : 'Done')

export function StatusPill({ row, className }: { row: Row; className?: string }) {
  const m = STATUS_META[row.status]
  return <span className={cx('inline-block font-type uppercase tracking-widest text-[9px] px-2 py-1 rounded-full whitespace-nowrap', m.cls, className)}>{m.label}</span>
}

export function ReasonChip({ row }: { row: Row }) {
  const b = row.p.barrier && row.p.barrier.step === row.step ? barrierMeta(row.p.barrier.barrier) : undefined
  if (!b) return <span className="font-type text-[10px] opacity-30">—</span>
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-type text-[11px] leading-tight px-2 py-1 rounded-md',
      b.side === 'system' ? 'bg-terra/10 text-terra' : 'bg-mustard/30 text-ink')}>
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', b.side === 'system' ? 'bg-terra' : 'bg-mustard')} />
      {b.label}
    </span>
  )
}

export function OverdueBar({ row, max, threshold }: { row: Row; max: number; threshold: number }) {
  const d = row.overdue
  const w = Math.min(100, (Math.max(0, d) / max) * 100)
  const t = Math.min(100, (threshold / max) * 100)
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={cx('font-serif text-xl tabular-nums w-14 text-right shrink-0 leading-none', d > 0 ? (d >= threshold ? 'text-terra' : '') : 'opacity-40')}>
        {d > 0 ? `+${d}` : !row.step ? '·' : <span className="font-type text-[10px] whitespace-nowrap">{d === 0 ? 'today' : `${-d}d left`}</span>}
      </span>
      <div className="relative h-2 flex-1 rounded-full bg-black/[0.06]">
        {d > 0 && <div className={cx('absolute inset-y-0 left-0 rounded-full', d >= threshold ? 'bg-terra' : 'bg-mustard')} style={{ width: `${w}%` }} />}
        <div className="absolute -top-1 -bottom-1 border-l border-dashed border-ink/50" style={{ left: `${t}%` }} />
      </div>
    </div>
  )
}

const COLS = 'md:grid-cols-[minmax(7rem,1.1fr)_minmax(4.5rem,0.7fr)_minmax(0,1.7fr)_minmax(0,1.5fr)_5.5rem]'

export function OffTrackList({ rows, threshold, onOpen }: { rows: Row[]; threshold: number; onOpen: (id: string) => void }) {
  const max = Math.max(21, threshold + 4, ...rows.map((r) => r.overdue))
  if (!rows.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif italic text-3xl opacity-50">Nothing here</p>
      </div>
    )
  }
  return (
    <div role="table" className="text-sm">
      <div role="row" className={cx('hidden md:grid gap-3 px-3 pb-2 border-b border-black/15', COLS)}>
        {['Patient', 'Step', 'Days overdue', 'Reason', 'Status'].map((h) => <span key={h} className="label">{h}</span>)}
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.p.id} className="border-b border-black/[0.07] last:border-0">
            <button role="row" onClick={() => onOpen(r.p.id)}
              className={cx('w-full text-left px-3 py-3 transition-colors hover:bg-black/[0.035] focus-visible:bg-black/[0.035]',
                r.p.isYou && 'bg-mustard/25 hover:bg-mustard/40 border-l-4 border-mustard')}>
              {/* desktop row */}
              <div className={cx('hidden md:grid gap-3 items-center', COLS)}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-serif text-lg leading-none whitespace-nowrap">{r.p.isYou ? 'You' : r.p.label}</span>
                    {r.p.shared && !r.p.isYou && <span title="Shared diary" className="w-1.5 h-1.5 rounded-full bg-ink/60 shrink-0" />}
                  </span>
                  <span className="block font-type text-[10px] opacity-60 mt-0.5 truncate">
                    {r.p.isYou ? <span className="text-terra uppercase tracking-widest">shared</span> : r.p.age} · {CANCER_LABEL[r.p.cancer]}
                  </span>
                </span>
                <span className="font-type text-xs uppercase tracking-wider">{stepShort(r.step)}</span>
                <OverdueBar row={r} max={max} threshold={threshold} />
                <span className="min-w-0"><ReasonChip row={r} /></span>
                <span><StatusPill row={r} /></span>
              </div>
              {/* mobile card */}
              <div className="md:hidden space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-xl leading-none whitespace-nowrap">{r.p.isYou ? 'You' : r.p.label}</span>
                    <span className="font-type text-[10px] opacity-60 truncate">
                      {r.p.isYou ? <span className="text-terra uppercase tracking-widest">shared</span> : r.p.age} · {CANCER_LABEL[r.p.cancer]} · {stepShort(r.step)}
                    </span>
                  </span>
                  <StatusPill row={r} />
                </div>
                <OverdueBar row={r} max={max} threshold={threshold} />
                {r.side && <ReasonChip row={r} />}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
