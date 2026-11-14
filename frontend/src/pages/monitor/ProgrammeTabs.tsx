// Bowel | Breast | Cervical switch for the monitor. A WAI-ARIA tab list: arrow keys move between tabs, Home/End jump.
// The choice lives in the URL (?p=), next to the county (?c=), so a link opens the same view.
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cx } from '../../components/ui'
import { PROGRAMMES, type ProgrammeId } from './programmes'

/** Set by a keyboard switch: the page re-renders a new tab list, which then takes focus on its selected tab. */
let focusAfterSwitch = false

export function ProgrammeTabs({ value, onChange, className }: { value: ProgrammeId; onChange: (p: ProgrammeId) => void; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    if (!focusAfterSwitch) return
    focusAfterSwitch = false
    refs.current[PROGRAMMES.findIndex((p) => p.id === value)]?.focus()
  }, [value])
  const move = (e: KeyboardEvent, i: number) => {
    const n = PROGRAMMES.length
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to < 0) return
    e.preventDefault()
    focusAfterSwitch = true
    onChange(PROGRAMMES[to].id)
    refs.current[to]?.focus()
  }
  return (
    <div role="tablist" aria-label="Screening programme" className={cx('inline-flex rounded-full border border-black/15 bg-black/[.04] p-1', className)}>
      {PROGRAMMES.map((p, i) => {
        const on = p.id === value
        return (
          <button key={p.id} ref={(el) => { refs.current[i] = el }} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1}
            onClick={() => onChange(p.id)} onKeyDown={(e) => move(e, i)}
            className={cx('rounded-full px-3.5 sm:px-4 py-1.5 font-type text-[13px] sm:text-sm uppercase tracking-wider transition-colors outline-none focus-visible:ring-2 focus-visible:ring-terra',
              on ? 'bg-ink text-paper' : 'opacity-70 hover:opacity-100 hover:bg-black/[.06]')}>
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
