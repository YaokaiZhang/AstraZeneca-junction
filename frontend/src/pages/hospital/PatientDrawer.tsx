import { Btn, EdgeText, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { PATHWAY, daysBetween, today } from '../../data/pathway'
import type { HospitalAction } from '../../lib/store'
import { CANCER_LABEL, type Coordinator } from './demoPatients'
import { IconLock, IconUndo } from './icons'
import { StatusPill, ReasonChip } from './OffTrackList'
import { ago, barrierMeta, fmtDate, type Row } from './model'

export function PatientDrawerBody({ row, coords, county, onAct, onReassign, onReopen }: {
  row: Row; coords: Coordinator[]; county: string
  onAct: (r: Row, s: HospitalAction['status']) => void
  onReassign: (r: Row, coordId: string) => void
  onReopen: (r: Row) => void
}) {
  const { p } = row
  const resolved = row.status === 'resolved'
  return (
    <div className="relative p-6 pl-12 pt-16 pb-12 min-h-full">
      <EdgeText>{county} · {p.isYou ? 'shared by patient' : 'synthetic record'}</EdgeText>

      {row.escalated && (
        <Stamp tone="terra" rotate={-14} className="absolute top-14 right-6">Escalated<br />+{row.overdue} d</Stamp>
      )}
      {resolved && <Stamp tone="ink" rotate={10} className="absolute top-14 right-6 !border-moss !text-moss">Resolved</Stamp>}

      <Label>{p.isYou ? 'You · shared' : `${p.age} y · ${CANCER_LABEL[p.cancer]}`}</Label>
      <h2 className="font-serif font-light leading-[0.9] text-5xl mt-1">
        {p.isYou ? 'You' : p.label}
        <span className="block italic pl-6 text-4xl">{row.step ? PATHWAY.find((s) => s.id === row.step)!.short.toLowerCase() : 'treated'}</span>
      </h2>

      <div className="flex flex-wrap items-center gap-2 mt-5 pr-24">
        <StatusPill row={row} />
        <ReasonChip row={row} />
      </div>
      {row.coordinator && (
        <p className="mt-3 font-type text-xs">
          <span className="opacity-60 uppercase tracking-widest text-xs">→ </span>
          {row.coordinator.name} <span className="opacity-60">· {row.coordinator.role}</span>
        </p>
      )}
      {row.action && <p className="font-type text-xs uppercase tracking-widest opacity-50 mt-1">{row.action.status} · {ago(row.action.at)}</p>}

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {resolved ? (
          <Btn variant="ghost" onClick={() => onReopen(row)} className="flex items-center gap-2"><IconUndo /> Reopen</Btn>
        ) : (
          <>
            {!row.escalated && row.step && <Btn variant="terra" onClick={() => onAct(row, 'escalated')}>Escalate now</Btn>}
            <Btn variant="ghost" onClick={() => onAct(row, 'contacted')} disabled={row.status === 'contacted'}>Contacted</Btn>
            <Btn variant="mustard" onClick={() => onAct(row, 'booked')} disabled={row.status === 'booked'}>Booked</Btn>
            <Btn variant="ink" onClick={() => onAct(row, 'resolved')}>Resolved</Btn>
          </>
        )}
      </div>
      {!resolved && (
        <label className="mt-4 flex items-center gap-3">
          <span className="label shrink-0">Reassign</span>
          <select value={row.coordinator?.id ?? ''} onChange={(e) => onReassign(row, e.target.value)}
            className="flex-1 min-w-0 border-b border-black/20 py-1.5 font-type text-xs outline-none focus:border-terra" aria-label="Reassign coordinator">
            {!row.coordinator && <option value="">—</option>}
            {coords.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
          </select>
        </label>
      )}

      {/* pathway */}
      <div className="tear mt-8 pt-5">
        <div className="flex items-center justify-between mb-3">
          <Label>Pathway vs target</Label>
          <SourceBadge id="thlTargets" kind="estimate" how="Days between steps compared with the target for each step." />
        </div>
        <Timeline row={row} />
      </div>

      {p.barrier && (
        <div className="mt-6">
          <Label className="mb-2">Patient-reported barrier</Label>
          <p className="font-serif text-xl leading-tight">{barrierMeta(p.barrier.barrier)?.label}</p>
          <p className="font-type text-xs uppercase tracking-widest opacity-60">
            {PATHWAY.find((s) => s.id === p.barrier!.step)?.short} · {barrierMeta(p.barrier.barrier)?.side}
          </p>
          {p.barrier.note && <p className="font-sans text-sm mt-1 opacity-80">“{p.barrier.note}”</p>}
        </div>
      )}

      {/* shared symptom records */}
      <div className="tear mt-8 pt-5">
        <Label className="mb-3">Shared before visit</Label>
        {p.shared ? <SharedRecords row={row} /> : (
          <div className="rounded-lg border border-dashed border-black/20 bg-black/[0.03] p-6 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-ink text-mustard flex items-center justify-center shrink-0"><IconLock /></span>
            <div>
              <p className="font-serif italic text-2xl leading-none">Not shared</p>
              <p className="font-type text-xs uppercase tracking-widest opacity-60 mt-1">Diary · risk score</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Timeline({ row }: { row: Row }) {
  const { dates } = row.p
  const now = today()
  return (
    <ol className="relative">
      {PATHWAY.map((s, i) => {
        const date = dates[s.id]
        const prev = i > 0 ? dates[PATHWAY[i - 1].id] : undefined
        const isNext = row.step === s.id
        const took = date && prev ? daysBetween(prev, date) : isNext && prev ? daysBetween(prev, now) : null
        const target = s.targetDays
        const over = took != null && target != null && took > target
        const scale = Math.max(28, (target ?? 0) * 2)
        return (
          <li key={s.id} className={cx('grid grid-cols-[16px_1fr] gap-3 pb-4 last:pb-0 relative', !date && !isNext && 'opacity-35')}>
            {i < PATHWAY.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 border-l border-dashed border-black/25" />}
            <span className={cx('mt-1 w-4 h-4 rounded-full border-2 z-[1]',
              date ? (over ? 'bg-terra border-terra' : 'bg-ink border-ink') : isNext ? 'bg-paper border-terra animate-pulse' : 'bg-paper border-black/30')} />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-lg leading-tight">{s.label}</span>
                <span className="font-type text-[13px] opacity-70 shrink-0">{date ? fmtDate(date) : isNext ? 'waiting' : '—'}</span>
              </div>
              {took != null && target != null && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative h-1.5 flex-1 rounded-full bg-black/[0.07]">
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', over ? 'bg-terra' : isNext ? 'bg-mustard' : 'bg-ink/60')}
                      style={{ width: `${Math.min(100, (Math.max(0, took) / scale) * 100)}%` }} />
                    <div className="absolute -top-1 -bottom-1 border-l-2 border-ink" style={{ left: `${(target / scale) * 100}%` }} title={`Target ${target} d`} />
                  </div>
                  <span className={cx('font-type text-xs tabular-nums shrink-0 w-16 text-right', over && 'text-terra')}>{took} / {target} d</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function SharedRecords({ row }: { row: Row }) {
  const { diary, risk } = row.p
  const prob = risk ? (risk.prob6y > 1 ? risk.prob6y / 100 : risk.prob6y) : null
  const pct = prob != null ? prob * 100 : null
  const high = prob != null && prob >= 0.0151
  return (
    <div className="space-y-6">
      <div className={cx('rounded-lg p-4', risk ? (high ? 'bg-terra text-paper' : 'bg-stone') : 'bg-black/[0.04]')}>
        <div className="flex items-center justify-between">
          <span className="font-type text-xs uppercase tracking-widest opacity-80">6-y lung risk</span>
          <SourceBadge id="plco" kind="estimate" how="PLCOm2012, patient-entered inputs. ≥1.51 % = screening-level risk." />
        </div>
        {pct != null ? (
          <>
            <p className="font-serif text-5xl leading-none mt-1 tabular-nums">{pct.toFixed(1)}<span className="text-2xl">%</span></p>
            <div className="relative h-2 mt-3 rounded-full bg-black/15">
              <div className={cx('absolute inset-y-0 left-0 rounded-full', high ? 'bg-paper' : 'bg-ink')} style={{ width: `${Math.min(100, (pct / 15) * 100)}%` }} />
              <div className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-current" style={{ left: `${(1.51 / 15) * 100}%` }} />
            </div>
            <div className="flex justify-between font-type text-[11px] uppercase tracking-widest mt-1 opacity-70"><span>1.51 %</span><span>15 %</span></div>
          </>
        ) : <p className="font-serif italic text-2xl opacity-50 mt-1">—</p>}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-type text-xs uppercase tracking-widest opacity-60">Symptom diary</span>
          <span className="font-type text-xs opacity-60">{diary.length}</span>
        </div>
        {diary.length ? (
          <ol className="border-l border-black/15 ml-1">
            {[...diary].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <li key={d.id} className="relative pl-4 pb-3 last:pb-0">
                <span className="absolute -left-[4px] top-1.5 w-2 h-2 rounded-full bg-mustard border border-ink/30" />
                <div className="flex items-baseline gap-2">
                  <span className="font-type text-xs opacity-60 w-12 shrink-0">{fmtDate(d.date)}</span>
                  <span className="font-serif text-lg leading-tight">{d.text}</span>
                </div>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 pl-14">
                    {d.tags.map((t) => <span key={t} className="font-type text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/[0.06]">{t}</span>)}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : <p className="font-serif italic text-xl opacity-50">No entries</p>}
      </div>
    </div>
  )
}
