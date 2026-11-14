// Small visual pieces local to the patient page.
import { useState, type ReactNode } from 'react'
import { Btn, cx, toast } from '../../components/ui'
import { PATHWAY, daysBetween, today, type StepId } from '../../data/pathway'
import { useStore } from '../../lib/store'
import { useT } from './i18n'

/** Typewriter label + control, stacked. */
export function Field({ label, children, className, htmlFor }: { label: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={htmlFor} className="label block mb-1">{label}</label>
      {children}
    </div>
  )
}

/** Pathway clock: ring split by target days per step; done = ink, current = progress, overdue = terra. */
export function Clock({ dates, size = 220, children, dark }: { dates: Partial<Record<StepId, string>>; size?: number; children?: ReactNode; dark?: boolean }) {
  const steps = PATHWAY.slice(1)
  const total = steps.reduce((a, s) => a + (s.targetDays ?? 0), 0)
  let lastDone = -1
  PATHWAY.forEach((s, i) => { if (dates[s.id]) lastDone = i })
  const now = today()
  const ink = dark ? '#F4F1EA' : '#1F1F1F'
  let cum = 0
  return (
    <div className="relative mx-auto" style={{ width: size, maxWidth: '100%', aspectRatio: '1' }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx={50} cy={50} r={42} fill="none" stroke={ink} strokeOpacity={0.1} strokeWidth={9} />
        {steps.map((s, k) => {
          const i = k + 1
          const len = s.targetDays ?? 0
          const start = cum; cum += len
          const prev = dates[PATHWAY[i - 1].id]
          let color = 'transparent'; let frac = 0
          if (dates[s.id] && prev) { frac = 1; color = daysBetween(prev, dates[s.id]!) > len && !dark ? '#C65D3B' : ink }
          else if (i === lastDone + 1 && prev) { const w = daysBetween(prev, now); frac = Math.min(1, w / len); color = w > len ? (dark ? '#1F1F1F' : '#C65D3B') : '#FFC233' }
          const L = Math.max(0, len * frac - 0.6)
          return (
            <g key={s.id}>
              <circle cx={50} cy={50} r={42} fill="none" pathLength={total} stroke={color} strokeWidth={9}
                strokeDasharray={`${L} ${total - L}`} strokeDashoffset={-start - 0.3} />
              <circle cx={50} cy={50} r={48.5} fill="none" pathLength={total} stroke={ink} strokeOpacity={0.5} strokeWidth={1.5}
                strokeDasharray={`0.25 ${total - 0.25}`} strokeDashoffset={-start} />
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/** Opt-in sharing switch with explicit confirm, timestamp and revoke. */
export function ShareSwitch({ which, label, children }: { which: 'hospital' | 'stats'; label: ReactNode; children?: ReactNode }) {
  const { t, d } = useT()
  const sharing = useStore((s) => s.sharing)
  const set = useStore((s) => s.set)
  const [ask, setAsk] = useState(false)
  const on = sharing[which]
  const apply = (v: boolean) => {
    set((s) => ({ sharing: { ...s.sharing, [which]: v, at: new Date().toISOString() } }))
    setAsk(false)
    toast(v ? t('m.saved') : t('pr.off'))
  }
  return (
    <div className="py-4 border-b border-black/10 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-serif text-xl leading-tight">{label}</p>
          {on && sharing.at && (
            <p className="font-type text-xs uppercase tracking-widest opacity-60 mt-1">
              {t('pr.since', { t: d(sharing.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
            </p>
          )}
        </div>
        <button role="switch" aria-checked={on} aria-label={typeof label === 'string' ? label : which}
          onClick={() => (on ? apply(false) : setAsk(true))}
          className={cx('w-12 h-7 rounded-full relative transition-colors shrink-0', on ? 'bg-terra' : 'bg-black/20')}>
          <span className={cx('absolute top-0.5 w-6 h-6 rounded-full bg-paper shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </div>
      {children && <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>}
      {ask && (
        <div className="rise mt-3 rounded-lg border-2 border-dashed border-terra/60 p-3 flex flex-wrap items-center gap-3">
          <span className="font-serif italic text-lg mr-auto">{t('pr.confirm')}</span>
          <Btn variant="ghost" onClick={() => setAsk(false)}>{t('pr.cancel')}</Btn>
          <Btn variant="terra" onClick={() => apply(true)}>{t('pr.yes')}</Btn>
        </div>
      )}
    </div>
  )
}

export async function copyText(s: string) {
  try { await navigator.clipboard.writeText(s); return true } catch {
    const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  }
}

export const Tag = ({ children, tone = 'line' }: { children: ReactNode; tone?: 'line' | 'terra' | 'ink' | 'mustard' }) => (
  <span className={cx('inline-flex items-center font-type text-xs uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap',
    { line: 'border border-current/30 border-black/20', terra: 'bg-terra text-paper', ink: 'bg-ink text-paper', mustard: 'bg-mustard text-ink' }[tone])}>{children}</span>
)

export const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
