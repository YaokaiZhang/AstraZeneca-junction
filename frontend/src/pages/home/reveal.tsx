import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { cx } from '../../components/ui'

export function useInView<T extends Element>(threshold = 0.25, once = true): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); if (once) io.disconnect() } else if (!once) setOn(false)
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, once])
  return [ref as RefObject<T>, on]
}

/** 0 → 1 as the element scrolls through the viewport (for tall sticky sections). */
export function useScrollProgress<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const span = r.height - innerHeight
        setP(Math.min(1, Math.max(0, -r.top / (span || 1))))
      })
    }
    on()
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  return [ref as RefObject<T>, p]
}

type Fx = 'up' | 'left' | 'right' | 'scale' | 'stamp' | 'mask' | 'blur'

export function Reveal({ children, fx = 'up', delay = 0, className, style, as: Tag = 'div' }: {
  children: ReactNode; fx?: Fx; delay?: number; className?: string; style?: CSSProperties; as?: 'div' | 'span' | 'li'
}) {
  const [ref, on] = useInView<HTMLDivElement>(0.2)
  return (
    <Tag ref={ref as never} className={cx('rv', `rv-${fx}`, on && 'in', className)} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

/** Splits a line into words that rise one after another. */
export function WordsUp({ text, className, delay = 0, step = 70 }: { text: string; className?: string; delay?: number; step?: number }) {
  const [ref, on] = useInView<HTMLSpanElement>(0.4)
  return (
    <span ref={ref} className={cx('inline', className)}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <span className={cx('inline-block rv-word', on && 'in')} style={{ transitionDelay: `${delay + i * step}ms` }}>{w}&nbsp;</span>
        </span>
      ))}
    </span>
  )
}

export function useCount(target: number, on: boolean, ms = 1600) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!on) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms)
      setV(target * (1 - Math.pow(1 - u, 3)))
      if (u < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [on, target, ms])
  return v
}
