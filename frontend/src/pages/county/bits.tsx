// Small building blocks local to the county page.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../components/ui'
import { SCALE_CSS } from './model'

export function Slider({ label, value, min, max, step, onChange, display, badge }: {
  label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: ReactNode; badge?: ReactNode
}) {
  const t = ((value - min) / (max - min)) * 100
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 mb-2">
        <span className="label !opacity-70">{label}</span>
        <span className="font-serif text-2xl leading-none flex items-baseline gap-2">{display}{badge}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="county-range w-full"
        style={{ background: `linear-gradient(90deg, #1F1F1F ${t}%, rgba(0,0,0,.15) ${t}%)` }} />
    </label>
  )
}

/** Paper → mustard → terra legend with optional hatched "wide range" swatch. */
export function Legend({ lo, hi, mid, wide }: { lo: string; hi: string; mid?: string; wide?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-type text-sm uppercase tracking-wider">
      <div className="flex items-center gap-2">
        <span>{lo}</span>
        <span className="relative w-28 h-2.5 rounded-full border border-black/10" style={{ background: SCALE_CSS }}>
          {mid && <span className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-60 normal-case">{mid}</span>}
        </span>
        <span>{hi}</span>
      </div>
      {wide && (
        <div className="flex items-center gap-2 opacity-80">
          <span className="w-4 h-4 rounded-sm border border-black/20 hatch" />
          <span>wide range</span>
        </div>
      )}
    </div>
  )
}

/** Tiny line + area chart; values are scaled to their own min/max unless a domain is given. */
export function Spark({ values, w = 96, h = 28, domain, stroke = '#1F1F1F', fill = 'rgba(198,93,59,.18)', mark }: {
  values: number[]; w?: number; h?: number; domain?: [number, number]; stroke?: string; fill?: string; mark?: number
}) {
  const [a, b] = domain ?? [Math.min(...values), Math.max(...values)]
  const span = b - a || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - a) / span) * (h - 4)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0" aria-hidden>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      {mark != null && pts[mark] && <circle cx={pts[mark][0]} cy={pts[mark][1]} r={2.6} fill="#C65D3B" />}
    </svg>
  )
}

export function Seg<T extends string>({ items, value, onChange, className }: { items: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cx('inline-flex flex-wrap rounded-full border border-black/20 p-0.5', className)}>
      {items.map((it) => (
        <button key={it.id} role="radio" aria-checked={value === it.id} onClick={() => onChange(it.id)}
          className={cx('font-type text-[15px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors',
            value === it.id ? 'bg-ink text-paper' : 'hover:bg-black/5')}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Tear({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('tear pt-2 flex items-center justify-between font-type text-[13px] uppercase tracking-wider opacity-70', className)}>
      <span>{left}</span><span>{right}</span>
    </div>
  )
}

/** Global styles the county page needs (range thumb, hatch, print). Scoped by class names. */
export function CountyStyles() {
  return (
    <style>{`
      .county-range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 9999px; outline-offset: 6px; }
      .county-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 9999px; background: #FFC233; border: 2px solid #1F1F1F; cursor: grab; }
      .county-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 9999px; background: #FFC233; border: 2px solid #1F1F1F; cursor: grab; }
      .county-root button.w-4.h-4.bg-mustard { box-shadow: inset 0 0 0 1px rgba(31,31,31,.75); }
      .county-root .rounded-lg.paper-texture:not(.clip) { overflow: visible; }
      .county-root .rounded-lg.paper-texture::before { border-radius: inherit; }
      .county-root .rounded-lg.paper-texture:focus-within, .county-root .rounded-lg.paper-texture:has(span.rise.absolute) { z-index: 30; }
      .hatch { background-image: repeating-linear-gradient(45deg, rgba(31,31,31,.35) 0 1.5px, transparent 1.5px 5px); }
      #county-print { display: none; }
      @media print {
        #root { display: none !important; }
        #county-print { display: block !important; }
        @page { margin: 14mm; }
        body { background: #fff !important; }
      }
    `}</style>
  )
}

/** Measures an element's width so SVG charts can use real pixels (constant text size). */
export function useWidth<T extends HTMLElement>(fallback = 480) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}
