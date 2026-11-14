// Shared visual primitives drawn from the reference design:
// paper cards in mustard / terracotta / stone / ink, serif display type, typewriter labels.
import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { SOURCES, type SourceKind } from '../data/sources'

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export { cx }

type Tone = 'paper' | 'mustard' | 'terra' | 'stone' | 'ink'
const TONE: Record<Tone, string> = {
  paper: 'bg-paper text-ink border border-black/10',
  mustard: 'bg-mustard text-ink',
  terra: 'bg-terra text-paper',
  stone: 'bg-stone text-ink border border-black/5',
  ink: 'bg-ink text-paper',
}

export function Card({ tone = 'paper', tilt = 0, className, children, onClick }: {
  tone?: Tone; tilt?: number; className?: string; children: ReactNode; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      className={cx('paper-texture rounded-lg shadow-xl transition-transform duration-500', TONE[tone], onClick && 'cursor-pointer hover:-translate-y-1', className)}
    >
      {children}
    </div>
  )
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('label', className)}>{children}</p>
}

/** Big serif heading with optional italic second line, like "For cosy / days". */
export function Display({ a, b, className }: { a: ReactNode; b?: ReactNode; className?: string }) {
  return (
    <h2 className={cx('font-serif font-light leading-[0.9] tracking-tight text-5xl lg:text-6xl', className)}>
      {a}
      {b && <span className="block italic pl-6">{b}</span>}
    </h2>
  )
}

export function Btn({ variant = 'ink', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ink' | 'terra' | 'ghost' | 'mustard' }) {
  const v = {
    ink: 'bg-ink text-paper hover:bg-terra',
    terra: 'bg-terra text-paper hover:bg-ink',
    mustard: 'bg-mustard text-ink hover:bg-ink hover:text-mustard',
    ghost: 'border border-current hover:bg-ink hover:text-paper',
  }[variant]
  return (
    <button
      {...p}
      className={cx('font-type uppercase tracking-widest text-sm px-5 py-3 rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none', v, className)}
    />
  )
}

/** Round icon button, like the "Unlock" button in the reference. */
export function RoundBtn({ children, className, title, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button title={title} aria-label={title} {...p}
      className={cx('w-14 h-14 rounded-full bg-ink text-mustard flex items-center justify-center shadow-lg hover:scale-110 transition-transform', className)}>
      {children}
    </button>
  )
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={cx('font-type text-sm px-3 py-1.5 rounded-full border transition-colors',
        active ? 'bg-ink text-paper border-ink' : 'border-black/20 hover:border-ink', className)}>
      {children}
    </button>
  )
}

/** Rotated circular stamp, like "OFFICIAL RECEIPT NO. 992". */
export function Stamp({ children, className, tone = 'ink', rotate = -12 }: { children: ReactNode; className?: string; tone?: 'ink' | 'terra' | 'paper'; rotate?: number }) {
  const c = { ink: 'border-black/30 text-ink', terra: 'border-terra text-terra', paper: 'border-paper/60 text-paper' }[tone]
  return (
    <div style={{ transform: `rotate(${rotate}deg)` }} className={cx('w-24 h-24 border rounded-full flex items-center justify-center shrink-0', c, className)}>
      <div className="w-20 h-20 border border-dashed border-current rounded-full flex items-center justify-center opacity-90">
        <span className="font-type text-sm text-center leading-tight uppercase">{children}</span>
      </div>
    </div>
  )
}

/** Vertical typewriter strip along a card edge. */
export function EdgeText({ children, side = 'left', className }: { children: ReactNode; side?: 'left' | 'right'; className?: string }) {
  return (
    <div className={cx('absolute top-0 bottom-0 flex items-center pointer-events-none', side === 'left' ? 'left-3' : 'right-3', className)}>
      <span className="text-vertical font-type text-[13px] tracking-[0.2em] uppercase opacity-60">{children}</span>
    </div>
  )
}

/** Slowly rotating text ring (decorative). */
export function TextRing({ text, className, size = 180 }: { text: string; className?: string; size?: number }) {
  const id = useRef('ring-' + Math.random().toString(36).slice(2)).current
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cx('spin-slow pointer-events-none', className)} aria-hidden>
      <path id={id} d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none" />
      <text className="font-type uppercase" style={{ fontSize: 6, letterSpacing: '0.3em' }} fill="currentColor">
        <textPath href={`#${id}`}>{text}</textPath>
      </text>
    </svg>
  )
}

const KIND: Record<SourceKind, { label: string; cls: string }> = {
  direct: { label: 'Direct data', cls: 'bg-ink text-paper' },
  estimate: { label: 'Estimate', cls: 'bg-mustard text-ink ring-1 ring-ink/50' },
  gap: { label: 'Data gap', cls: 'bg-terra text-paper' },
  mentor: { label: 'Mentor interview', cls: 'bg-moss text-paper' },
}

/**
 * Clickable source badge. Put one next to every number.
 * kind: direct | estimate | gap | mentor. `how` explains the calculation for estimates.
 */
export function SourceBadge({ id, kind, how, demo = true, className }: { id: keyof typeof SOURCES | string; kind: SourceKind; how?: ReactNode; demo?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)
  const pop = useRef<HTMLSpanElement>(null)
  const src = SOURCES[id]
  const k = KIND[kind]
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setOpen(false) }
    const hide = () => setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide) }
  }, [open])
  return (
    <span ref={ref} className={cx('relative inline-flex align-middle', className)}>
      <button onClick={(e) => {
          e.stopPropagation()
          const r = e.currentTarget.getBoundingClientRect()
          const x = Math.min(Math.max(r.left + r.width / 2 - 128, 8), window.innerWidth - 264)
          const y = r.bottom + 256 > window.innerHeight ? Math.max(8, r.top - 8 - 240) : r.bottom + 8
          setPos({ x, y }); setOpen((o) => !o)
        }}
        title={k.label}
        className={cx('w-4 h-4 rounded-full text-[13px] font-type leading-none flex items-center justify-center hover:scale-125 transition-transform', k.cls)}>
        {kind === 'direct' ? 'D' : kind === 'estimate' ? 'E' : kind === 'gap' ? '!' : 'M'}
      </button>
      {open && createPortal(
        <span ref={pop} onClick={(e) => e.stopPropagation()} style={{ left: pos.x, top: pos.y }} className="rise fixed z-[70] w-64 max-h-[240px] overflow-y-auto bg-paper text-ink border border-black/15 rounded-lg shadow-2xl p-4 text-left font-sans text-sm normal-case tracking-normal">
          <span className={cx('inline-block font-type uppercase tracking-widest text-[13px] px-2 py-0.5 rounded-full mb-2', k.cls)}>{k.label}</span>
          <span className="block font-serif text-base leading-tight mb-1">{src?.name ?? id}</span>
          {src?.note && <span className="block opacity-70 mb-1">{src.note}</span>}
          {how && <span className="block font-type text-[15px] bg-black/5 rounded p-2 my-2">{how}</span>}
          {demo && kind !== 'gap' && <span className="block font-type text-sm text-terra uppercase tracking-wider">Demo value</span>}
          {src?.url && <a href={src.url} target="_blank" rel="noreferrer" className="block mt-2 underline underline-offset-2 hover:text-terra">Open source ↗</a>}
        </span>, document.body,
      )}
    </span>
  )
}

/** Number + label + badge, the unit of every dashboard. */
export function Stat({ label, value, unit, badge, className, big }: { label: ReactNode; value: ReactNode; unit?: ReactNode; badge?: ReactNode; className?: string; big?: boolean }) {
  return (
    <div className={cx('border-b border-black/10 pb-3', className)}>
      <Label className="mb-1">{label}</Label>
      <p className={cx('font-serif leading-none flex items-baseline gap-2', big ? 'text-5xl' : 'text-3xl')}>
        <span>{value}</span>
        {unit && <span className="font-type text-sm opacity-60">{unit}</span>}
        {badge}
      </p>
    </div>
  )
}

/** Slide-in panel from the right; used for details (county brief, patient detail). */
export function Drawer({ open, onClose, children, tone = 'paper' }: { open: boolean; onClose: () => void; children: ReactNode; tone?: Tone }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className={cx('fixed inset-0 z-40 transition', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div onClick={onClose} className={cx('absolute inset-0 bg-ink/30 transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
      <aside className={cx('paper-texture absolute right-0 top-0 h-full w-full sm:w-[480px] shadow-2xl overflow-y-auto transition-transform duration-500', TONE[tone], open ? 'translate-x-0' : 'translate-x-full')}>
        <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full border border-current flex items-center justify-center hover:bg-ink hover:text-paper">✕</button>
        {children}
      </aside>
    </div>
  )
}

/** Simple tab row in typewriter caps with a terracotta dot on the active tab (matches the sidebar nav). */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void; className?: string }) {
  return (
    <div className={cx('flex flex-wrap gap-x-6 gap-y-2', className)}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cx('font-type uppercase text-sm tracking-widest flex items-center gap-2 transition-colors hover:text-terra', value === t.id ? '' : 'opacity-70')}>
          {value === t.id && <span className="w-1.5 h-1.5 bg-terra rounded-full" />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-3 group" role="switch" aria-checked={on}>
      <span className={cx('w-11 h-6 rounded-full relative transition-colors', on ? 'bg-terra' : 'bg-black/20')}>
        <span className={cx('absolute top-0.5 w-5 h-5 rounded-full bg-paper shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label && <span className="font-type text-sm uppercase tracking-widest">{label}</span>}
    </button>
  )
}

/** Toast: call toast('Saved') from anywhere. */
let pushToast: ((m: string) => void) | null = null
export const toast = (m: string) => pushToast?.(m)
export function Toaster() {
  const [msgs, setMsgs] = useState<{ id: number; m: string }[]>([])
  useEffect(() => {
    pushToast = (m) => {
      const id = Date.now() + Math.random()
      setMsgs((x) => [...x, { id, m }])
      setTimeout(() => setMsgs((x) => x.filter((y) => y.id !== id)), 2600)
    }
    return () => { pushToast = null }
  }, [])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center">
      {msgs.map((t) => (
        <div key={t.id} className="rise bg-ink text-paper font-type text-sm uppercase tracking-widest px-5 py-3 rounded-full shadow-xl">{t.m}</div>
      ))}
    </div>
  )
}

/** Styled dropdown (native <select> popups on macOS inherit the big display font size). */
export function Picker<T extends string>({ value, options, onChange, label, className, align = 'left' }: {
  value: T; options: { id: T; name: string }[]; onChange: (v: T) => void; label: string; className?: string; align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  const cur = options.find((o) => o.id === value)
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx('flex items-center gap-2 max-w-full border-b border-black/30 hover:border-terra focus:border-terra outline-none cursor-pointer text-left', className)}>
        <span className="truncate">{cur?.name}</span>
        <span className={cx('font-type not-italic text-sm transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={label}
          className={cx('absolute top-full mt-2 z-50 w-64', align === 'right' ? 'left-0 md:left-auto md:right-0' : 'left-0', ' max-h-80 overflow-y-auto rounded-lg border border-stone bg-paper shadow-[0_18px_40px_-18px_rgba(0,0,0,.35)] py-2')}>
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button type="button" onClick={() => { onChange(o.id); setOpen(false) }}
                className={cx('w-full text-left px-4 py-1.5 font-type text-[15px] flex items-center gap-2 hover:bg-stone/40 hover:text-terra',
                  o.id === value && 'text-terra')}>
                <span className={cx('w-1.5 h-1.5 rounded-full', o.id === value ? 'bg-terra' : 'bg-transparent')} />{o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
