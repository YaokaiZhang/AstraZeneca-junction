import { Btn, Label, SourceBadge, cx } from '../../components/ui'
import { PATHWAY, daysBetween, today } from '../../data/pathway'
import type { HospitalAction } from '../../lib/store'
import { CANCER_LABEL, EST_KEYS, type Coordinator, type EstKey } from './demoPatients'
import { PLCO_HOW, PLCO_THRESHOLD } from '../patient/logic'
import { tr } from '../patient/i18n'
import { IconLock, IconUndo } from './icons'
import { StatusPill, ReasonChip } from './OffTrackList'
import { ago, barrierMeta, fmtDate, type Row } from './model'

export function PatientDrawerBody({ row, coords, onAct, onReassign, onReopen }: {
  row: Row; coords: Coordinator[]
  onAct: (r: Row, s: HospitalAction['status']) => void
  onReassign: (r: Row, coordId: string) => void
  onReopen: (r: Row) => void
}) {
  const { p } = row
  const resolved = row.status === 'resolved'
  return (
    <div className="relative p-6 sm:p-8 pt-14 pb-12 min-h-full">
      <Label>{p.isYou ? 'Shared by patient' : `${p.age} y · ${CANCER_LABEL[p.cancer]}`}</Label>
      <h2 className="font-serif font-light leading-[0.9] text-5xl mt-1">
        {p.isYou ? 'You' : p.label}
        <span className="block italic pl-6 text-4xl">{row.step ? PATHWAY.find((s) => s.id === row.step)!.short.toLowerCase() : 'treated'}</span>
      </h2>

      {row.overdue > 0 && !resolved && (
        <p className="mt-5 font-serif leading-none text-terra">
          <span className="text-6xl lining-nums tabular-nums">{row.overdue}</span>
          <span className="font-type text-sm uppercase tracking-widest ml-2">days late</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <StatusPill row={row} />
        <ReasonChip row={row} quiet />
      </div>
      {p.barrier?.note && p.barrier.step === row.step && <p className="font-sans text-sm mt-2 opacity-80">“{p.barrier.note}”</p>}
      {row.escalated && row.coordinator && (
        <p className="font-type text-sm mt-3" data-testid="flagged">
          {row.escalatedBy === 'auto' ? 'Flagged automatically to ' : 'Escalated to '}
          <span className="text-terra">{row.coordinator.name}</span>, {row.coordinator.role.toLowerCase()}
          {row.escalatedBy === 'auto' && ' · no call from the patient needed'}
        </p>
      )}
      {row.action && <p className="font-type text-sm opacity-70 mt-2">{row.action.status} · {ago(row.action.at)}</p>}

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
          <span className="label shrink-0">Owner</span>
          <select value={row.coordinator?.id ?? ''} onChange={(e) => onReassign(row, e.target.value)}
            className="flex-1 min-w-0 border-b border-black/20 py-1.5 font-type text-sm outline-none focus:border-terra" aria-label="Reassign coordinator">
            {!row.coordinator && <option value="">Unassigned</option>}
            {coords.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
          </select>
        </label>
      )}

      {/* pathway */}
      <div className="tear mt-8 pt-5">
        <div className="flex items-center justify-between mb-3">
          <Label>Pathway</Label>
          <SourceBadge id="thlTargets" kind="estimate" how="Days between steps compared with the target for each step." />
        </div>
        <Timeline row={row} />
      </div>

      {p.barrier && p.barrier.step !== row.step && (
        <p className="mt-5 font-type text-sm opacity-70">
          Earlier: {barrierMeta(p.barrier.barrier)?.label} · {PATHWAY.find((s) => s.id === p.barrier!.step)?.short}
          {p.barrier.note && <span className="block font-sans text-sm mt-1">“{p.barrier.note}”</span>}
        </p>
      )}

      {/* shared symptom records */}
      <div className="tear mt-8 pt-5">
        <Label className="mb-3">Diary &amp; risk</Label>
        {p.shared ? <SharedRecords row={row} /> : (
          <p className="flex items-center gap-3 font-serif italic text-2xl opacity-50">
            <IconLock className="w-5 h-5" /> Not shared
          </p>
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
                <span className="font-type text-[15px] opacity-70 shrink-0">{date ? fmtDate(date) : isNext ? 'waiting' : '—'}</span>
              </div>
              {took != null && target != null && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative h-1.5 flex-1 rounded-full bg-black/[0.07]">
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', over ? 'bg-terra' : isNext ? 'bg-mustard' : 'bg-ink/60')}
                      style={{ width: `${Math.min(100, (Math.max(0, took) / scale) * 100)}%` }} />
                    <div className="absolute -top-1 -bottom-1 border-l-2 border-ink" style={{ left: `${(target / scale) * 100}%` }} title={`Target ${target} d`} />
                  </div>
                  <span className={cx('font-type text-sm tabular-nums shrink-0 w-20 whitespace-nowrap text-right', over && 'text-terra')}>{took} / {target} d</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Same wording the patient sees (logic.ts keeps the code; the text lives in i18n). */
const ESTIMATE_HOW = tr('en', 'how.estimate')

function SharedRecords({ row }: { row: Row }) {
  const { diary, risk, est, estHigh } = row.p
  const prob = risk ? (risk.prob6y > 1 ? risk.prob6y / 100 : risk.prob6y) : null
  const pct = prob != null ? prob * 100 : null
  const high = prob != null && prob >= PLCO_THRESHOLD
  const ests = EST_KEYS.filter((k) => est?.[k] != null)
  return (
    <div className="space-y-6">
      <p className="font-type text-sm opacity-70">
        Shared by the patient{row.p.sharedAt ? ` · ${fmtDate(row.p.sharedAt)}` : ''}. The patient sees only their next step, never these numbers.
      </p>
      <div className={cx('rounded-lg p-4', risk ? (high ? 'bg-terra text-paper' : 'bg-stone') : 'bg-black/[0.04]')}>
        <div className="flex items-center justify-between">
          <span className="font-type text-sm uppercase tracking-widest opacity-80">6-y lung risk · PLCOm2012</span>
          <SourceBadge id="plco" kind="estimate" demo={!row.p.isYou} how={PLCO_HOW} />
        </div>
        {pct != null ? (
          <>
            <p className="font-serif text-5xl leading-none mt-1 tabular-nums">{pct.toFixed(1)}<span className="text-2xl">%</span></p>
            <div className="relative h-2 mt-3 rounded-full bg-black/15">
              <div className={cx('absolute inset-y-0 left-0 rounded-full', high ? 'bg-paper' : 'bg-ink')} style={{ width: `${Math.min(100, (pct / 15) * 100)}%` }} />
              <div className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-current" style={{ left: `${(1.51 / 15) * 100}%` }} />
            </div>
            <div className="flex justify-between font-type text-sm uppercase tracking-widest mt-1 opacity-70"><span>1.51 %</span><span>15 %</span></div>
          </>
        ) : <p className="font-serif italic text-xl opacity-50 mt-1">Not calculated <span className="font-type not-italic text-sm">(never-smoker or not checked)</span></p>}
      </div>

      <div data-testid="estimates">
        <div className="flex items-center justify-between mb-2">
          <span className="font-type text-sm uppercase tracking-widest opacity-60">10-y risk · bowel, breast, cervical</span>
          <SourceBadge id="ourModel" kind="estimate" demo={!row.p.isYou} how={ESTIMATE_HOW} />
        </div>
        {ests.length ? (
          <ul className="divide-y divide-black/10">
            {ests.map((k) => (
              <li key={k} className="flex items-baseline gap-3 py-2">
                <span className="font-serif text-xl leading-none flex-1">{EST_LABEL[k]}</span>
                <span className="font-type text-sm uppercase tracking-widest px-2 py-0.5 rounded-full border border-ink/30">Estimate</span>
                <span className={cx('font-serif text-2xl leading-none tabular-nums w-20 text-right', estHigh?.[k] && 'text-terra')}>
                  {fmtPct(est![k]!)}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="font-serif italic text-xl opacity-50">Not checked</p>}
        {ests.some((k) => estHigh?.[k]) && (
          <p className="font-type text-sm text-terra mt-2">Red = at least the risk of people Finland already screens.</p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-type text-sm uppercase tracking-widest opacity-60">Symptom diary</span>
          <span className="font-type text-sm opacity-60">{diary.length}</span>
        </div>
        {diary.length ? (
          <ol className="border-l border-black/15 ml-1">
            {[...diary].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <li key={d.id} className="relative pl-4 pb-3 last:pb-0">
                <span className="absolute -left-[4px] top-1.5 w-2 h-2 rounded-full bg-mustard border border-ink/30" />
                <div className="flex items-baseline gap-2">
                  <span className="font-type text-sm opacity-60 w-12 shrink-0">{fmtDate(d.date)}</span>
                  <span className="font-serif text-lg leading-tight">{d.text}</span>
                </div>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 pl-14">
                    {d.tags.map((t) => <span key={t} className="font-type text-sm uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/[0.06]">{t}</span>)}
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

const EST_LABEL: Record<EstKey, string> = { bowel: 'Bowel', breast: 'Breast', cervical: 'Cervical' }
const fmtPct = (x: number) => { const v = x * 100; return `${v < 0.1 ? '<0.1' : v.toFixed(v < 10 ? 1 : 0)} %` }
