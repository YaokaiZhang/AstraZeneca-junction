import React, { useEffect, useState } from 'react'
import { Label, SourceBadge, TextRing, cx } from '../../components/ui'
import { COUNTIES } from '../../data/counties'
import { BOWEL_SURV, bowelLives, earlierFinds, fmt, pct, projection, screeningGain } from '../county/model'
import { useCount, useInView, useScrollProgress } from './reveal'

/* ───────────── the story's chapters ───────────── */
export const CHAPTERS = [
  { id: 'ch-gap', n: '01', title: 'The gap' },
  { id: 'ch-built', n: '02', title: 'What we built' },
  { id: 'ch-do', n: '03', title: 'What to do' },
  { id: 'ch-impact', n: '04', title: 'The impact' },
  { id: 'ch-know', n: '05', title: 'How we know' },
] as const
type ChapterId = typeof CHAPTERS[number]['id']

/**
 * Scroll-scrubbed transition: a line draws down, then one sentence fills in word by word.
 * With `chapter`, it opens a numbered chapter; without, it is a bridge inside one.
 */
export function Transition({ text, hot = 3, chapter }: { text: string; hot?: number; chapter?: ChapterId }) {
  const [ref, p] = useScrollProgress<HTMLElement>()
  const words = text.split(' ')
  const ch = CHAPTERS.find((c) => c.id === chapter)
  const line = Math.min(1, p / 0.25)
  const shown = Math.max(0, (p - 0.2) / 0.6) * words.length
  return (
    <section ref={ref} id={chapter} data-chapter={chapter} className="relative h-[140svh] scroll-mt-0">
      <div className="sticky top-0 h-[100svh] flex flex-col items-center justify-center px-5 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 pointer-events-none text-terra" aria-hidden
          style={{ opacity: 0.05 * line, transform: `translate(-50%, -50%) scale(${0.8 + 0.3 * p}) rotate(${p * 90}deg)` }}>
          <TextRing size={760} text={ch ? `chapter ${ch.n} • ${ch.title} • ajoissa • ` : 'ajoissa • on time • i tid • '} />
        </div>
        {ch && (
          <div className="mb-6 flex items-center gap-3 font-type text-xs uppercase tracking-[0.3em] transition-opacity duration-500" style={{ opacity: 0.35 + 0.65 * line }}>
            <span className="text-terra">Chapter {ch.n}</span><span className="w-6 h-px bg-ink/40" /><span>{ch.title}</span>
          </div>
        )}
        <div className="w-px h-[16svh] bg-terra origin-top" style={{ transform: `scaleY(${line})` }} />
        <div className="relative mt-3 w-2 h-2 transition-opacity duration-300" style={{ opacity: line >= 1 ? 1 : 0 }}>
          <span className="absolute inset-0 rounded-full bg-terra" />
          <span className="absolute inset-0 rounded-full bg-terra ping-soft" />
        </div>
        <p className="relative mt-10 max-w-5xl text-center font-serif font-light text-[10vw] sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.04] tracking-tight">
          {words.map((w, i) => {
            const t = Math.min(1, Math.max(0, shown - i))
            return (
              <span key={i} className={i >= words.length - hot ? 'italic text-terra' : undefined}
                style={{ opacity: 0.1 + 0.9 * t, display: 'inline-block', transform: `translateY(${(1 - t) * 0.25}em)`, filter: `blur(${(1 - t) * 4}px)` }}>
                {w}&nbsp;
              </span>
            )
          })}
        </p>
      </div>
    </section>
  )
}

export function Ecg({ className }: { className?: string }) {
  // one heartbeat, repeated; the path scrolls left forever
  const beat = 'l40 0 l6 -6 l6 6 l10 0 l5 8 l7 -46 l7 58 l6 -20 l14 0 l10 -9 l12 9 l77 0'
  const d = 'M0 40 ' + Array.from({ length: 12 }, () => beat).join(' ')
  return (
    <div className={cx('absolute inset-x-0 bottom-0 h-16 overflow-hidden pointer-events-none opacity-70', className)} aria-hidden>
      <svg className="ecg-scroll h-full" viewBox="0 0 4800 60" preserveAspectRatio="none" style={{ width: '200%' }}>
        <path d={d} fill="none" stroke="#C65D3B" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-paper via-transparent to-paper" />
    </div>
  )
}

/* ───────────── which chapter is on screen (desktop side rail) ───────────── */
export function ChapterRail() {
  const [active, setActive] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => {
      let cur: string | null = null
      for (const c of CHAPTERS) {
        const el = document.getElementById(c.id)
        if (el && el.getBoundingClientRect().top < innerHeight * 0.5) cur = c.id
      }
      const end = document.getElementById('doors')
      setActive(cur)
      setShow(cur != null && !(end && end.getBoundingClientRect().top < innerHeight * 0.6))
    }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <nav aria-label="Chapters"
      className={cx('hidden xl:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-3 transition-opacity duration-500', show ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
      {CHAPTERS.map((c) => {
        const on = c.id === active
        return (
          <a key={c.id} href={`#${c.id}`} title={c.title} onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth' }) }}
            className="group flex items-center gap-3 font-type text-[11px] uppercase tracking-widest">
            <span className={cx('h-px transition-all duration-300', on ? 'w-6 bg-terra' : 'w-3 bg-ink/30 group-hover:w-5')} />
            <span className={cx('transition-opacity', on ? 'opacity-100 text-terra' : 'opacity-40 group-hover:opacity-80')}>{c.n}<span className="hidden 2xl:inline"> {c.title}</span></span>
          </a>
        )
      })}
    </nav>
  )
}

const FINDS = earlierFinds()
const SCREEN = screeningGain()
const round1000 = (n: number) => Math.round(n / 1000) * 1000

/* ───────────── estimated impact ───────────── */
const COLORS: Record<string, string> = { breast: '#FFC233', bowel: '#C65D3B', lung: '#1F1F1F' }
/** Finland, these four cancers: cases in 2035 vs 2025 if today's rates hold and only the age mix changes. */
const PROJ = (() => {
  const s = COUNTIES.map((c) => projection(c, 'all'))
  const a = s.reduce((t, r) => t + r[0], 0), b = s.reduce((t, r) => t + r[r.length - 1], 0)
  return { now: a, then: b, rise: b / a - 1 }
})()

const FINDS_HOW = `For breast, bowel and lung: each county's share of cancers found after spread (Cancer Registry, 2021–25, cases with a recorded stage) is compared with the best quarter of counties (25th percentile, counting only counties with a usable 95% range: ${FINDS.rows.map((r) => `${r.label.toLowerCase()} ${pct(r.bench)}`).join(', ')}). Counties above that level are brought down to it; counties already better are left as they are. Yearly cases with a recorded stage × the gap = cancers found before spreading instead of after. Cases with unknown stage are not counted, so this is a floor. Being found earlier improves the outlook but does not guarantee survival; only bowel cancer has Finnish survival figures by stage, so only bowel is turned into lives (in “The cost of late”).`
const SCREEN_HOW = `Each county below the strategy target of 80% turnout is brought up to 80% (THL Sotkanet 2024 turnout: bowel 6103, cervical 3620, breast 3621). People invited ≈ residents in the programme's age band (Statistics Finland 2025: bowel 56–74, breast women 50–69, cervical women 30–65). Counties already above 80% are left as they are. Per screening round: bowel and breast every 2 years, cervical every 5.`
const PROJ_HOW = `Lung, bowel, pancreas and liver. Cases today = Cancer Registry mean 2020–24, ${fmt(Math.round(PROJ.now))} a year. 2035 = the same age-specific rates applied to Statistics Finland's 2035 population projection (table 14wx): ${fmt(Math.round(PROJ.then))} a year.`

const DOTS = FINDS.rows.reduce((t, r) => t + Math.round(r.perYear), 0)
const LIVES = bowelLives()
const AUTO = 0.8 // where the auto-play stops; the viewer can drag it anywhere
const SHARE_HOW = `What Ajoissa could add, as an assumption you can change: the share of the gap to the best quarter of counties that the app closes (reminders and a second kit for screening, the symptom self-check, chasing late referrals). It starts at ${pct(AUTO)}; this is a scenario, not a measured effect of the app. 100% = ${fmt(DOTS)} cancers a year, the full gap (see below). People alive: bowel cancer only, the same share × the 5-year survival gap between localized (${pct(BOWEL_SURV.local, 1)}) and spread (${pct(BOWEL_SURV.spreadBest, 1)} to ${pct(BOWEL_SURV.spreadWorst, 1)}) bowel cancer, Finnish patients 2006–15 (BMC Cancer 2022).`

/** Share of the gap closed: runs 0 → AUTO once on screen, then follows the slider. */
function useAutoShare(on: boolean): [number, (v: number) => void] {
  const [v, setV] = useState(0)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!on || touched) return
    let raf = 0
    const t0 = performance.now() + 350, D = 2600
    const step = (now: number) => {
      const x = Math.min(1, Math.max(0, (now - t0) / D))
      setV(AUTO * (1 - Math.pow(1 - x, 3)))
      if (x < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [on, touched])
  return [v, (x) => { setTouched(true); setV(x) }]
}

/** One dot per cancer found earlier, one block per type. A dot pops in only once it is counted. */
function Waffle({ share, done }: { share: number; done: boolean }) {
  return (
    <div className="space-y-3" aria-hidden>
      {FINDS.rows.map((r) => {
        const n = Math.round(r.perYear), lit = Math.round(r.perYear * share)
        return (
          <div key={r.k} className="grid gap-[3px] sm:gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(8px, 1fr))' }}>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="aspect-square">
                <span className={cx('block w-full h-full rounded-full transition-[transform,opacity] duration-500 ease-[cubic-bezier(.34,1.7,.5,1)]', done && i < lit && 'dot-wave')}
                  style={{ background: COLORS[r.k], opacity: i < lit ? 1 : 0, transform: i < lit ? undefined : 'scale(0)', animationDelay: `${(i % 48) * 45}ms` }} />
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Stat({ on, delay, value, unit, line, badge, hot }: { on: boolean; delay: number; value: React.ReactNode; unit?: string; line: string; badge: React.ReactNode; hot?: boolean }) {
  return (
    <div className={cx('rv rv-up border-t border-ink/20 pt-4', on && 'in')} style={{ transitionDelay: `${delay}ms` }}>
      <div className={cx('font-serif text-5xl lg:text-6xl leading-none tabular-nums lining-nums', hot && 'text-terra')}>{value}{unit && <span className="text-2xl lg:text-3xl">{unit}</span>}</div>
      <p className="mt-2 font-sans text-base leading-snug flex items-center gap-2">{line}{badge}</p>
    </div>
  )
}

export function Impact() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const [share, setShare] = useAutoShare(on)
  const t2 = useCount(1, on, 2400)
  const done = share >= AUTO - 0.001
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-center px-5 lg:px-24 py-16 overflow-hidden" aria-label="Estimated impact">
      <div ref={ref} className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-center">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Label>If Ajoissa closes</Label>
            <span className="font-serif text-3xl tabular-nums lining-nums text-terra w-[3.2ch]">{Math.round(share * 100)}%</span>
            <Label>of the gap to Finland's best</Label>
          </div>
          <div className="mt-4 flex items-end gap-4 flex-wrap">
            <span className="font-serif text-8xl lg:text-[9rem] leading-[0.8] tabular-nums lining-nums text-terra w-[3.1ch]">{fmt(FINDS.rows.reduce((t, r) => t + Math.round(r.perYear * share), 0))}</span>
            <span className="pb-1 font-serif text-2xl lg:text-3xl leading-tight">more cancers a year<br /><span className="italic">found before they spread</span>
              <SourceBadge id="ourModel" kind="estimate" demo={false} className="ml-2 align-middle" how={SHARE_HOW} />
            </span>
          </div>
          <p className="mt-4 font-sans text-base">
            <span className="font-serif text-2xl tabular-nums">{fmt(Math.round(LIVES.lo * share))}–{fmt(Math.round(LIVES.hi * share))}</span> more people alive every year, bowel cancer alone
          </p>
          <div className="mt-6 min-h-[118px]"><Waffle share={share} done={done} /></div>
          <div className="mt-5 flex items-center gap-4">
            <input type="range" min={0} max={1} step={0.05} value={share} onChange={(e) => setShare(+e.target.value)}
              aria-label="Share of the gap Ajoissa closes" className="w-full max-w-md accent-[#C65D3B]" />
            <span className="font-type text-xs uppercase tracking-widest opacity-60 whitespace-nowrap flex items-center gap-2">100% = {fmt(DOTS)} a year
              <SourceBadge id="ourModel" kind="estimate" demo={false} how={FINDS_HOW} /></span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-sans text-[15px]">
            {FINDS.rows.map((r) => (
              <span key={r.k} className="flex items-center gap-2">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[r.k] }} />
                {r.label} <span className="tabular-nums opacity-60">{fmt(Math.round(r.perYear * share))}</span>
              </span>
            ))}
            <span className="opacity-60">· one dot = one patient</span>
          </div>
        </div>

        <div className="space-y-8">
          <Stat on={on} delay={600} value={`+${fmt(round1000(SCREEN.total * t2))}`} line="more people screened, at 80% turnout"
            badge={<SourceBadge id="ourModel" kind="estimate" demo={false} how={SCREEN_HOW} />} />
          <Stat on={on} delay={900} hot value={<>0 <span className="opacity-40 text-4xl">→</span> {Math.round(COUNTIES.length * t2)}</>} line="counties that can see their cancer waits"
            badge={<SourceBadge id="waitGap" kind="gap" demo={false} />} />
          <Stat on={on} delay={1200} value={`+${Math.round(PROJ.rise * 100 * t2)}`} unit="%" line="more cases by 2035: planned ahead"
            badge={<SourceBadge id="statfinProjection" kind="estimate" demo={false} how={PROJ_HOW} />} />
        </div>
      </div>
      <p className={cx('rv rv-up mt-12 font-type text-xs uppercase tracking-widest opacity-60', on && 'in')} style={{ transitionDelay: '1600ms' }}>
        A scenario, not a measured result · drag to change it · hover a badge for the method
      </p>
      <Ecg className="opacity-40" />
    </section>
  )
}
