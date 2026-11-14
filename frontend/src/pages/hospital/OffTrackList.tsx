import { cx } from '../../components/ui'
import { PATHWAY } from '../../data/pathway'
import { CANCER_LABEL } from './demoPatients'
import { STATUS_META, barrierMeta, type Row } from './model'

const stepShort = (id: string | null) => (id ? PATHWAY.find((s) => s.id === id)?.short ?? id : 'Done')

export function StatusPill({ row, className }: { row: Row; className?: string }) {
  const m = STATUS_META[row.status]
  return <span className={cx('inline-block font-type uppercase tracking-widest text-sm px-2 py-1 rounded-full whitespace-nowrap', m.cls, className)}>{m.label}</span>
}

/** Quiet status for table rows: only what differs from "overdue" gets ink. */
function RowStatus({ row }: { row: Row }) {
  if (row.status === 'overdue') return null
  if (row.status === 'escalated') {
    return <span className="font-type text-sm text-terra truncate block">→ {row.coordinator?.name.split(' ')[0] ?? 'Escalated'}</span>
  }
  return <StatusPill row={row} />
}

export function ReasonChip({ row, quiet }: { row: Row; quiet?: boolean }) {
  const b = row.p.barrier && row.p.barrier.step === row.step ? barrierMeta(row.p.barrier.barrier) : undefined
  if (!b) return quiet ? null : <span className="font-type text-sm opacity-30">—</span>
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-type text-[15px] leading-tight',
      !quiet && 'px-2 py-1 rounded-md', !quiet && (b.side === 'system' ? 'bg-terra/10' : 'bg-mustard/30'),
      b.side === 'system' ? 'text-terra' : 'text-ink')}>
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', b.side === 'system' ? 'bg-terra' : 'bg-mustard')} />
      {b.label}
    </span>
  )
}

function Days({ row, threshold }: { row: Row; threshold: number }) {
  const d = row.overdue
  if (d > 0) {
    const hot = d >= threshold
    return <span className={cx('font-serif lining-nums tabular-nums leading-none', hot ? 'text-terra text-3xl' : 'text-2xl')}>{d}<span className="font-type text-sm ml-0.5 opacity-60">d</span></span>
  }
  if (row.st.lastDone < 0) return <span className="font-type text-sm opacity-60 whitespace-nowrap">no dates</span>
  return <span className="font-type text-sm opacity-60 whitespace-nowrap">{!row.step ? '·' : d === 0 ? 'due today' : `${-d} d left`}</span>
}

function Bar({ row, max, threshold }: { row: Row; max: number; threshold: number }) {
  const d = row.overdue
  const w = Math.min(100, (Math.max(0, d) / max) * 100)
  const t = Math.min(100, (threshold / max) * 100)
  return (
    <div className="relative h-1.5 w-full rounded-full bg-black/[0.06]">
      {d > 0 && <div className={cx('absolute inset-y-0 left-0 rounded-full', d >= threshold ? 'bg-terra' : 'bg-mustard')} style={{ width: `${w}%` }} />}
      <div className="absolute -top-1 -bottom-1 border-l border-dashed border-ink/40" style={{ left: `${t}%` }} />
    </div>
  )
}

const COLS = 'md:grid-cols-[minmax(9rem,1.2fr)_4rem_minmax(4rem,0.7fr)_minmax(0,1.6fr)_5.5rem]'

export function OffTrackList({ rows, threshold, onOpen }: { rows: Row[]; threshold: number; onOpen: (id: string) => void }) {
  const max = Math.max(21, threshold + 4, ...rows.map((r) => r.overdue))
  if (!rows.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif italic text-3xl opacity-50">Nothing here</p>
      </div>
    )
  }
  // index of the first row below the escalation line (list is sorted worst first)
  const cut = rows.findIndex((r, i) => i > 0 && !r.p.isYou && r.overdue < threshold && rows[i - 1].overdue >= threshold)
  return (
    <div role="table" className="text-sm">
      <div role="row" className={cx('hidden md:grid gap-4 px-3 pb-2 border-b border-black/15', COLS)}>
        {['Patient', 'Late', '', 'Reason', ''].map((h, i) => <span key={i} className="label">{h}</span>)}
      </div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.p.id} className={cx('border-b border-black/[0.07] last:border-0', i === cut && 'border-t-2 border-t-ink/20 mt-4 pt-1')}>
            <button role="row" onClick={() => onOpen(r.p.id)}
              className={cx('w-full text-left px-3 py-3 transition-colors hover:bg-black/[0.035] focus-visible:bg-black/[0.035]',
                r.p.isYou && 'bg-mustard/25 hover:bg-mustard/40 border-l-4 border-mustard')}>
              {/* desktop row */}
              <div className={cx('hidden md:grid gap-4 items-center', COLS)}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-serif text-lg leading-none whitespace-nowrap">{r.p.isYou ? 'You' : r.p.label}</span>
                    {r.p.shared && !r.p.isYou && <span title="Diary shared" className="w-1.5 h-1.5 rounded-full bg-ink/60 shrink-0" />}
                  </span>
                  <span className="block font-type text-sm opacity-55 mt-1 truncate">{stepShort(r.step)} · {CANCER_LABEL[r.p.cancer]}</span>
                </span>
                <span><Days row={r} threshold={threshold} /></span>
                <Bar row={r} max={max} threshold={threshold} />
                <span className="min-w-0"><ReasonChip row={r} quiet /></span>
                <span className="min-w-0 text-right"><RowStatus row={r} /></span>
              </div>
              {/* mobile card */}
              <div className="md:hidden flex items-center gap-4">
                <span className="w-12 shrink-0"><Days row={r} threshold={threshold} /></span>
                <span className="flex-1 min-w-0 space-y-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-xl leading-none whitespace-nowrap">{r.p.isYou ? 'You' : r.p.label}</span>
                    <RowStatus row={r} />
                  </span>
                  <span className="block font-type text-sm opacity-55 truncate">{stepShort(r.step)} · {CANCER_LABEL[r.p.cancer]}</span>
                  {r.side && <span className="block"><ReasonChip row={r} quiet /></span>}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
