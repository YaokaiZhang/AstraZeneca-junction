import { useEffect, useMemo, useState } from 'react'
import { Card, EdgeText, Label, SourceBadge, cx } from '../../components/ui'
import { COUNTIES } from '../../data/counties'
import { earlierFinds, fmt, pct, projection, screeningGain, TURNOUT_TARGET } from '../county/model'
import { Reveal, WordsUp, useCount, useInView, useScrollProgress } from './reveal'

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
        {ch && (
          <div className="mb-6 flex items-center gap-3 font-type text-xs uppercase tracking-[0.3em] transition-opacity duration-500" style={{ opacity: 0.35 + 0.65 * line }}>
            <span className="text-terra">Chapter {ch.n}</span><span className="w-6 h-px bg-ink/40" /><span>{ch.title}</span>
          </div>
        )}
        <div className="w-px h-[16svh] bg-terra origin-top" style={{ transform: `scaleY(${line})` }} />
        <div className="mt-3 w-2 h-2 rounded-full bg-terra transition-opacity duration-300" style={{ opacity: line >= 1 ? 1 : 0 }} />
        <p className="mt-10 max-w-5xl text-center font-serif font-light text-[10vw] sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.04] tracking-tight">
          {words.map((w, i) => {
            const t = Math.min(1, Math.max(0, shown - i))
            return (
              <span key={i} className={i >= words.length - hot ? 'italic text-terra' : undefined}
                style={{ opacity: 0.1 + 0.9 * t, display: 'inline-block', transform: `translateY(${(1 - t) * 0.25}em)` }}>
                {w}&nbsp;
              </span>
            )
          })}
        </p>
      </div>
    </section>
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

const FINDS_HOW = `For breast, bowel and lung: each county's share of cancers found after spread (Cancer Registry, 2021–25, cases with a recorded stage) is compared with the best quarter of counties (25th percentile, counting only counties with a usable 95% range: ${FINDS.rows.map((r) => `${r.label.toLowerCase()} ${pct(r.bench)}`).join(', ')}). Counties above that level are brought down to it; counties already better are left as they are. Yearly cases with a recorded stage × the gap = cancers found before spreading instead of after. Cases with unknown stage are not counted, so this is a floor. Being found earlier improves the outlook but does not guarantee survival; we do not convert it into lives.`
const SCREEN_HOW = `Each county below the strategy target of 80% turnout is brought up to 80% (THL Sotkanet 2024 turnout: bowel 6103, cervical 3620, breast 3621). People invited ≈ residents in the programme's age band (Statistics Finland 2025: bowel 56–74, breast women 50–69, cervical women 30–65). Counties already above 80% are left as they are. Per screening round: bowel and breast every 2 years, cervical every 5.`
const PROJ_HOW = `Lung, bowel, pancreas and liver. Cases today = Cancer Registry mean 2020–24, ${fmt(Math.round(PROJ.now))} a year. 2035 = the same age-specific rates applied to Statistics Finland's 2035 population projection (table 14wx): ${fmt(Math.round(PROJ.then))} a year.`

function Waffle({ k }: { k: number }) {
  // one dot per cancer found earlier; grouped by type so the colours read as blocks
  const dots = useMemo(() => FINDS.rows.flatMap((r) => Array.from({ length: Math.round(r.perYear) }, () => r.k)), [])
  const lit = Math.round(dots.length * k)
  return (
    <div className="grid gap-[3px] sm:gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9px, 1fr))' }} aria-hidden>
      {dots.map((c, i) => (
        <span key={i} className="aspect-square rounded-full transition-all duration-500"
          style={{
            background: i < lit ? COLORS[c] : 'transparent',
            boxShadow: i < lit ? 'none' : 'inset 0 0 0 1px rgba(31,31,31,.18)',
            transitionDelay: `${(i % 40) * 6}ms`,
          }} />
      ))}
    </div>
  )
}

const STOPS = [
  { v: 0.25, t: 'A quarter of the way' },
  { v: 0.5, t: 'Halfway' },
  { v: 1, t: 'All the way' },
]

export function Impact() {
  const [ref, on] = useInView<HTMLDivElement>(0.3)
  const [k, setK] = useState(1)
  const grown = useCount(1, on, 1800)
  const shown = Math.round(FINDS.rows.reduce((t, r) => t + Math.round(r.perYear), 0) * k * grown)
  const top = FINDS.byCounty.slice(0, 6)
  const max = top[0].n
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40" aria-label="Estimated impact">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="No new target." /><br /><WordsUp text="Just the best quarter." className="italic text-terra" delay={180} />
        </h2>
        <Reveal fx="blur" delay={300} className="flex items-center gap-2"><Label>Our estimate · from open data</Label></Reveal>
      </div>
      <Reveal fx="up" delay={250} className="mt-8 max-w-2xl font-sans text-base lg:text-lg leading-relaxed opacity-75">
        <p>
          The benchmark is not a wish: a quarter of Finnish counties already find cancers this early. Here is what changes if the others catch up, using the actions from the previous chapter. Drag the slider to see a smaller step.
        </p>
      </Reveal>

      {/* 1 · cancers found before they spread */}
      <div ref={ref} className="mt-16 lg:mt-20 grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-start">
        <div>
          <div className="flex items-end gap-4 flex-wrap">
            <span className="font-serif text-8xl lg:text-[10rem] leading-[0.8] tabular-nums lining-nums text-terra">{fmt(shown)}</span>
            <span className="pb-2 font-serif text-2xl lg:text-3xl leading-tight max-w-xs">more cancers a year found <span className="italic">before they spread</span>
              <SourceBadge id="ourModel" kind="estimate" demo={false} className="ml-2 align-middle" how={FINDS_HOW} />
            </span>
          </div>

          {/* how far the gap closes */}
          <div className="mt-10">
            <div className="flex items-baseline justify-between gap-4">
              <Label>How far each county closes its gap to the best quarter</Label>
              <span className="font-type text-sm tabular-nums">{Math.round(k * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={Math.round(k * 100)} onChange={(e) => setK(+e.target.value / 100)}
              aria-label="How far each county closes its gap" className="mt-3 w-full accent-[#C65D3B]" />
            <div className="mt-2 flex flex-wrap gap-2">
              {STOPS.map((s) => (
                <button key={s.v} type="button" onClick={() => setK(s.v)} aria-pressed={k === s.v}
                  className={cx('font-type text-xs uppercase tracking-widest rounded-full px-3 py-1 border transition-colors', k === s.v ? 'bg-ink text-paper border-ink' : 'border-ink/30 hover:border-ink')}>{s.t}</button>
              ))}
            </div>
          </div>

          <div className="mt-8"><Waffle k={k * grown} /></div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-sans text-[15px]">
            <span className="flex items-center gap-2 opacity-60"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px rgba(31,31,31,.35)' }} />= one patient</span>
            {FINDS.rows.map((r) => (
              <span key={r.k} className="flex items-center gap-2">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[r.k] }} />
                {r.label} <span className="tabular-nums opacity-60">{fmt(Math.round(r.perYear * k))}</span>
              </span>
            ))}
          </div>
        </div>

        {/* where they come from */}
        <div className="lg:border-l lg:border-ink/15 lg:pl-12">
          <Label>Where they would come from</Label>
          <p className="mt-2 font-sans text-[15px] leading-snug opacity-70">The counties with the biggest gap, and so the most to gain. Bigger counties count more because they have more patients.</p>
          <ul className="mt-6 space-y-4">
            {top.map((r, i) => (
              <li key={r.c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-xl leading-tight">{r.c.name}</span>
                  <span className="font-type text-sm tabular-nums">{fmt(Math.round(r.n * k))} / yr</span>
                </div>
                <div className="mt-1.5 h-2 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-terra rounded-full transition-all duration-700" style={{ width: `${on ? (r.n * k / max) * 100 : 0}%`, transitionDelay: `${i * 80}ms` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-sans text-[15px] leading-snug opacity-70">
            Together these six account for {pct(top.reduce((s, r) => s + r.n, 0) / FINDS.total)} of the total. That is where to start.
          </p>
        </div>
      </div>

      {/* 2 · three more changes */}
      <div className="mt-24 lg:mt-32 grid md:grid-cols-3 gap-8 lg:gap-10 items-stretch">
        <Reveal delay={0} className="h-full">
          <Card tone="mustard" tilt={-1} className="relative h-full p-6 pl-10 flex flex-col">
            <EdgeText>Screening</EdgeText>
            <Label className="!opacity-80">If every county reaches 80% turnout</Label>
            <div className="mt-4 font-serif text-6xl leading-none tabular-nums">+{fmt(round1000(SCREEN.total))}</div>
            <p className="mt-2 font-serif text-2xl leading-tight">people screened each round
              <SourceBadge id="ourModel" kind="estimate" demo={false} className="ml-2 align-middle" how={SCREEN_HOW} />
            </p>
            <ul className="space-y-3 mt-auto pt-6">
              {SCREEN.rows.map((r) => (
                <li key={r.p}>
                  <div className="flex justify-between font-sans text-[15px]"><span>{r.label} <span className="opacity-60">· {r.below} of {COUNTIES.length} counties below</span></span><span className="tabular-nums">+{fmt(round1000(r.extra))}</span></div>
                  <div className="relative mt-1 h-2 rounded-full bg-ink/10">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${r.now * 100}%` }} />
                    <div className="absolute -inset-y-1 w-0.5 bg-terra" style={{ left: `${TURNOUT_TARGET * 100}%` }} />
                  </div>
                  <div className="mt-1 font-type text-[11px] uppercase tracking-wider opacity-60">Finland today {pct(r.now)} · target 80%</div>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={150} className="h-full">
          <Card tone="paper" tilt={1} className="relative h-full p-6 pl-10 border border-ink/10 flex flex-col">
            <EdgeText>Waiting</EdgeText>
            <Label>Counties that can see cancer waiting times</Label>
            <div className="mt-4 flex items-end gap-4 font-serif leading-none tabular-nums">
              <span className="text-6xl opacity-40">0</span>
              <span className="pb-2 text-3xl opacity-50">→</span>
              <span className="text-6xl text-terra">{COUNTIES.length}</span>
            </div>
            <p className="mt-2 font-serif text-2xl leading-tight">
              Today no one publishes them. <SourceBadge id="waitGap" kind="gap" demo={false} />
            </p>
            <p className="mt-auto pt-6 font-sans text-[15px] leading-snug opacity-75">
              Three dates per patient are enough for every county to see its real wait, and the 6-week rule finally becomes something that can be checked. Late patients get a call instead of a longer wait.
            </p>
          </Card>
        </Reveal>

        <Reveal delay={300} className="h-full">
          <Card tone="ink" tilt={-1} className="relative h-full p-6 pl-10 flex flex-col">
            <EdgeText>Planning</EdgeText>
            <Label className="!opacity-70">Cases by 2035, as Finland ages</Label>
            <div className="mt-4 font-serif text-6xl leading-none tabular-nums text-mustard">+{pct(PROJ.rise)}</div>
            <p className="mt-2 font-serif text-2xl leading-tight">lung, bowel, pancreas and liver cancers
              <SourceBadge id="statfinProjection" kind="estimate" demo={false} className="ml-2 align-middle [&>button]:ring-1 [&>button]:ring-paper/60" how={PROJ_HOW} />
            </p>
            <p className="mt-auto pt-6 font-sans text-[15px] leading-snug opacity-75">
              Each county sees the year its own cases outgrow today's capacity, so scans and specialist time can be booked years ahead, not after the queue has already grown.
            </p>
          </Card>
        </Reveal>
      </div>

      <Reveal fx="up" className="mt-14 max-w-3xl font-sans text-[15px] leading-relaxed opacity-70">
        <p>
          <span className="font-type text-xs uppercase tracking-widest mr-2">How to read this</span>
          These are estimates from published county figures, not a forecast of what Ajoissa alone will achieve. They count only cancers with a recorded stage, so the real number is likely higher. Hover any badge for the exact method.
        </p>
      </Reveal>
    </section>
  )
}
